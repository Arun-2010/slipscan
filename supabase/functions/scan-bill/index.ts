// scan-bill: reads a photographed bill with a vision LLM and returns structured JSON.
// The image is never stored or logged.
import Anthropic from 'npm:@anthropic-ai/sdk@^1.3.0';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@^1.3.0/helpers/zod';
import { GoogleGenAI } from 'npm:@google/genai@^2.32.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@^4.1.0';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const CATEGORIES = [
  'groceries', 'veg_fruits', 'clothing', 'dining', 'health',
  'shopping', 'travel', 'household', 'other',
] as const;
// Items may not match the total to the paisa (round-off lines); allow ₹1.
const TOTAL_TOLERANCE_PAISE = 100;
// Request body = base64 image (~4/3 of 4 MB) plus a little JSON.
const MAX_BODY_BYTES = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 1024;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const MAX_ITEMS = 200;
const MAX_PAISE = 1_000_000_000; // ₹1 crore, matches the database limit

const Category = z.enum(CATEGORIES);
const Item = z.strictObject({
  name: z.string(),
  qty: z.number().nullable(),
  unit: z.string().nullable(),
  price: z.int(),
  category: Category.nullable(),
});
const Bill = z.strictObject({
  shop: z.string(),
  date: z.string().nullable(),
  category: Category,
  items: z.array(Item),
  total: z.int(),
  confidence: z.enum(['high', 'low']),
  unclear: z.array(z.string()),
});
type Bill = z.infer<typeof Bill>;

const Request = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.enum(MIME_TYPES),
});

const PROMPT = `You are reading a photo of a printed Indian shop bill (supermarket, vegetable market, mall, clothing store, restaurant, medical shop, petrol pump, etc.).

Extract:
- shop: the shop or business name as printed.
- date: purchase date as YYYY-MM-DD, or null if not visible.
- category: the best overall category for the bill.
- items: every purchased line item. name in plain English title case, qty and unit (kg, g, l, ml, pc) when printed else null, price = the line amount actually charged for that line, category per item.
- total: the final amount paid (grand total / net payable, after discounts and taxes).
- confidence: "high" if the photo is clear and you read everything, otherwise "low".
- unclear: names of items whose name or price you are not sure about.

All money values are integers in paise (Rs 12.50 = 1250). Do not include subtotal, tax, discount, or round-off lines as items.
Categories: groceries (packaged food, staples), veg_fruits, clothing, dining (restaurants, cafes, food delivery), health (pharmacy, clinic), shopping (electronics, gifts, general retail), travel (fuel, fares, tickets), household (cleaning, utilities, repairs), other.
If the image is not a bill, return shop "", total 0, empty items, confidence "low".`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type MimeType = (typeof MIME_TYPES)[number];
type Provider = { name: string; read: (imageBase64: string, mimeType: MimeType) => Promise<string> };

function claudeProvider(apiKey: string): Provider {
  const anthropic = new Anthropic({ apiKey });
  const model = Deno.env.get('ANTHROPIC_MODEL') || 'claude-opus-5-5';
  return {
    name: 'anthropic',
    read: async (imageBase64, mimeType) => {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 16000,
        output_config: { effort: 'medium', format: zodOutputFormat(Bill) },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
      });
      if (response.stop_reason === 'refusal') return '';
      return response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    },
  };
}

// Gemini models often return "high demand" 503s or hang, so try a backup
// model and cap each call so one stuck model can't eat the whole request.
const GEMINI_TIMEOUT_MS = 35_000;

function geminiProvider(apiKey: string): Provider {
  const gemini = new GoogleGenAI({ apiKey });
  const models = [Deno.env.get('GEMINI_MODEL') || 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];
  const { $schema: _ignored, ...schema } = z.toJSONSchema(Bill);
  return {
    name: 'gemini',
    read: async (imageBase64, mimeType) => {
      let lastError: unknown = null;
      for (const model of models) {
        try {
          const response = await gemini.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: imageBase64 } }, { text: PROMPT }] }],
            config: {
              responseMimeType: 'application/json',
              responseJsonSchema: schema,
              abortSignal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
            },
          });
          return response.text ?? '';
        } catch (e) {
          console.error(`scan-bill gemini ${model} error`, e instanceof Error ? e.message : 'unknown');
          lastError = e;
        }
      }
      throw lastError;
    },
  };
}

// Use whichever keys are set. With both, Claude goes first and Gemini is the backup.
const providers: Provider[] = [];
const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
const geminiKey = Deno.env.get('GEMINI_API_KEY');
if (anthropicKey) providers.push(claudeProvider(anthropicKey));
if (geminiKey) providers.push(geminiProvider(geminiKey));

/** Tries each configured provider in order; throws only if all of them fail. */
async function readBill(imageBase64: string, mimeType: MimeType): Promise<string> {
  let lastError: unknown = null;
  for (const provider of providers) {
    try {
      return await provider.read(imageBase64, mimeType);
    } catch (e) {
      console.error(`scan-bill ${provider.name} error`, e instanceof Error ? e.message : 'unknown');
      lastError = e;
    }
  }
  throw lastError ?? new Error('No AI provider configured');
}

function parseJson(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// Structured outputs don't strictly enforce enums, so map unknown categories
// to a safe value instead of failing the whole bill.
function normalizeCategories(raw: Record<string, unknown>): Record<string, unknown> {
  const valid = (c: unknown) => Category.safeParse(c).success;
  const fixItem = (i: unknown) => {
    if (!i || typeof i !== 'object') return i;
    const item = i as Record<string, unknown>;
    return { ...item, category: valid(item.category) ? item.category : null };
  };
  return {
    ...raw,
    category: valid(raw.category) ? raw.category : 'other',
    items: Array.isArray(raw.items) ? raw.items.map(fixItem) : raw.items,
  };
}

// Salvage whatever valid fields a malformed answer has, so the user fills in the rest.
function partialBill(text: string): Bill {
  const raw = normalizeCategories(parseJson(text) ?? {});
  const pick = <T>(schema: z.ZodType<T>, value: unknown, fallback: T): T => {
    const r = schema.safeParse(value);
    return r.success ? r.data : fallback;
  };
  const items = Array.isArray(raw.items)
    ? raw.items.flatMap((i) => {
        const r = Item.safeParse(i);
        return r.success ? [r.data] : [];
      })
    : [];
  return {
    shop: pick(z.string(), raw.shop, ''),
    date: pick(z.string().nullable(), raw.date, null),
    category: pick(Category, raw.category, 'other'),
    items,
    total: pick(z.int(), raw.total, 0),
    confidence: 'low',
    unclear: pick(z.array(z.string()), raw.unclear, []),
  };
}

// Keep only what the app can store: trimmed strings, sane numbers, bounded lists.
// Model output is untrusted (a photo can contain text that tries to steer it).
function sanitize(bill: Bill): Bill {
  const clampInt = (n: number, max: number) => Math.min(Math.max(Math.round(n), 0), max);
  const text = (s: string, max: number) => s.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
  const items = bill.items
    .slice(0, MAX_ITEMS)
    .map((i) => ({
      name: text(i.name, 120),
      qty: i.qty !== null && Number.isFinite(i.qty) && i.qty >= 0 && i.qty <= 100000 ? i.qty : null,
      unit: i.unit ? text(i.unit, 20) || null : null,
      price: clampInt(i.price, MAX_PAISE),
      category: i.category,
    }))
    .filter((i) => i.name.length > 0);
  // Tomorrow in UTC, so a bill dated today in India (UTC+5:30) is never rejected.
  const maxDate = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const dateOk = bill.date !== null && /^\d{4}-\d{2}-\d{2}$/.test(bill.date) && bill.date >= '2000-01-01' && bill.date <= maxDate
    && !Number.isNaN(Date.parse(`${bill.date}T00:00:00Z`));
  return {
    shop: text(bill.shop, 120),
    date: dateOk ? bill.date : null,
    category: bill.category,
    items,
    total: clampInt(bill.total, MAX_PAISE),
    confidence: bill.confidence,
    unclear: bill.unclear.slice(0, 50).map((u) => text(u, 120)).filter(Boolean),
  };
}

/** Reads the body as JSON without ever buffering more than maxBytes. */
async function readJsonLimited(req: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > maxBytes) throw new RangeError('too large');
  if (!req.body) return null;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new RangeError('too large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

/** True when the decoded bytes start with the signature of the claimed image type. */
function matchesImageType(imageBase64: string, mimeType: MimeType): boolean {
  let head: string;
  try {
    head = atob(imageBase64.slice(0, 16));
  } catch {
    return false;
  }
  const b = Array.from(head, (c) => c.charCodeAt(0));
  if (mimeType === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (mimeType === 'image/png') return b[0] === 0x89 && head.slice(1, 4) === 'PNG';
  return head.slice(0, 4) === 'RIFF' && head.slice(8, 12) === 'WEBP';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (Number(req.headers.get('content-length') ?? '0') > MAX_BODY_BYTES) {
    return json({ error: 'Image is larger than 4 MB.' }, 413);
  }
  if (providers.length === 0) {
    console.error('scan-bill: set GEMINI_API_KEY or ANTHROPIC_API_KEY');
    return json({ error: 'Bill scanning is not set up yet. Add the bill manually for now.' }, 503);
  }

  // Only real, signed-in accounts (not anonymous sessions, not the bare public key).
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = token ? await supabase.auth.getUser(token) : { data: null, error: true };
  if (authError || !auth?.user || auth.user.is_anonymous) {
    return json({ error: 'Please log in again.' }, 401);
  }

  let payload: unknown;
  try {
    payload = await readJsonLimited(req, MAX_BODY_BYTES);
  } catch {
    return json({ error: 'Image is larger than 4 MB.' }, 413);
  }
  const body = Request.safeParse(payload);
  if (!body.success) return json({ error: 'Send imageBase64 and a JPEG, PNG or WebP mimeType.' }, 400);
  const { imageBase64, mimeType } = body.data;
  if (Math.floor((imageBase64.length * 3) / 4) > MAX_IMAGE_BYTES) {
    return json({ error: 'Image is larger than 4 MB.' }, 413);
  }
  if (!BASE64.test(imageBase64) || !matchesImageType(imageBase64, mimeType)) {
    return json({ error: "That file isn't a supported photo. Use a JPEG, PNG or WebP image." }, 400);
  }

  // Count the scan as the calling user (security-definer function enforces per-user and global caps).
  const { data: allowed, error: usageError } = await supabase.rpc('claim_scan');
  if (usageError) return json({ error: 'Could not check scan limit.' }, 500);
  if (!allowed) return json({ error: 'Daily scan limit reached. Add bills manually or try tomorrow.' }, 429);

  let bill: Bill | null = null;
  let lastText = '';
  try {
    for (let attempt = 0; attempt < 2 && !bill; attempt++) {
      lastText = await readBill(imageBase64, mimeType);
      const raw = parseJson(lastText);
      if (!raw) continue;
      const r = Bill.safeParse(normalizeCategories(raw));
      if (r.success) bill = r.data;
    }
  } catch (e) {
    console.error('scan-bill LLM error', e instanceof Error ? e.message : 'unknown');
    return json({ error: 'Could not read the bill right now. Try again or add it manually.' }, 502);
  }

  const result = sanitize(bill ?? partialBill(lastText));
  const itemsSum = result.items.reduce((s, i) => s + i.price, 0);
  if (result.items.length > 0 && Math.abs(itemsSum - result.total) > TOTAL_TOLERANCE_PAISE) {
    result.confidence = 'low';
  }
  return json(result);
});
