# CLAUDE.md — SlipScan

> **SlipScan** — scan any bill, track every rupee, stay within your monthly limit.
> React Native (Expo) app that runs in **Expo Go**, with **Supabase** as the backend.
> **Keep it simple.** Email + password login only, no custom native code, no extra services.

Read this file fully before writing code. If a request conflicts with it, say so instead of silently choosing.

---

## 1. What We're Building

You get a printed bill almost everywhere you spend — supermarkets, vegetable markets, malls, clothing stores, restaurants, medical shops, petrol pumps. In SlipScan you photograph the bill and the app reads the **shop, date, every item with its price, the total and the category**, then saves it.

You set a **monthly limit** (e.g. ₹8,000). The app shows spent vs. remaining, warns you at **80%**, and alerts you when you **cross the limit**. Spends with no bill (auto fare, chai, a UPI payment to a person) are added manually.

### Features (v1)
1. **Welcome screen** — logo, name, tagline, **Get started** (first launch only).
2. **Set monthly limit** — one simple step after Get started.
3. **Home** — spent / limit progress bar, 80% warning, "Scan a bill" and "No bill? Add" buttons, recent bills.
4. **Scan any bill** — camera or gallery → AI reads it → **Check & save** screen where the user fixes anything → save.
5. **Add manually** — amount, what it was, Cash / UPI / Card, category, date.
6. **Alerts** — in-app banner + local notification at 80% and at 100% (once each per month).
7. **History** — month switcher, category pie chart, price watch, top shops, all bills.
8. **Settings** — monthly limit, alert toggles, export CSV, delete all data.

### Not in v1 (do not build unless asked)
Google / social login, multiple users or shared budgets, storing bill photos in the cloud, item pictures, dark mode, offline sync.

---

## 2. Tech Stack

| Need | Use |
|---|---|
| App | Expo (latest SDK) + TypeScript (`strict`) + **Expo Router** |
| Backend | **Supabase** — Postgres, anonymous auth, one Edge Function |
| Supabase client | `@supabase/supabase-js` + `@react-native-async-storage/async-storage` (session storage) + `react-native-url-polyfill` |
| Server state | `@tanstack/react-query` |
| Camera / gallery | `expo-image-picker` |
| Shrink photo before upload | `expo-image-manipulator` (max 1600px wide, JPEG ~0.7) |
| Alerts | In-app banner + **local** notifications via `expo-notifications` |
| Charts | `react-native-gifted-charts` + `react-native-svg` |
| Fonts | `@expo-google-fonts/dm-sans`, `@expo-google-fonts/dm-mono` + `expo-font` |
| Icons | `lucide-react-native` (stroke icons, no emoji in UI) |
| Reading bills | Supabase Edge Function `scan-bill` → Gemini or Claude (whichever key is set) → JSON |

**Rules**
- Only use libraries that work in **Expo Go**. Install with `npx expo install` so versions match the SDK.
- **No on-device OCR** (ML Kit etc.) — needs a development build.
- The **LLM API key lives only in Supabase secrets**, never in the app.

---

## 3. Accounts — Email + Password (required)

Users must **create an account or log in** (Supabase email + password) before using the app. No Google / social login.

- After the first login the user enters their **name** (`profiles` table), then sets the monthly limit.
- The session is saved in AsyncStorage and reused on every launch. **Row Level Security** keeps every user's data private.
- Devices that still have an **anonymous** session from the earlier no-login version are upgraded in place with `auth.updateUser({ email, password })`, so their bills are kept.
- Auth state lives in `src/api/auth.tsx` (`AuthProvider`, `useAuth`); the root layout uses `Stack.Protected` to show Welcome/Auth, then Name, then the app.
- Email confirmation is **on** in the Supabase project: `signUp` returns no session until the user opens the link, so the Auth screen says so and switches to Log in.

```ts
// src/lib/supabase.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } }
);
```

---

## 4. Screens & Flow

```
First launch:  Welcome ──Get started──► Create account / Log in ──► Your name ──► Set limit ──► Home
Next launches: Home (until Log out in Settings)

Home ──► Scan ──► Check & save ──► Home
  │        └──"No bill?"──► Add manually ──► Home
  ├──► Add manually
  ├──► History
  └──► Settings
Saving a bill that crosses 80% / 100% ──► alert banner (+ local notification)
```

```
app/
├── _layout.tsx          # fonts, React Query, AuthProvider, Stack.Protected gating
├── auth.tsx             # create account / log in (email + password)
├── name.tsx             # "What should we call you?" (also rename from Settings)
├── welcome.tsx          # splash/welcome — logo, name, Get started
├── set-limit.tsx        # first monthly limit
├── (tabs)/
│   ├── _layout.tsx      # bottom tabs: Home · History · [Scan] · Add · Settings
│   ├── index.tsx        # Home
│   ├── history.tsx
│   ├── add.tsx          # manual entry
│   └── settings.tsx
├── scan.tsx             # camera / gallery (full screen, dark)
└── review.tsx           # check & save scanned bill
src/
├── lib/supabase.ts
├── lib/money.ts         # paise <-> ₹ formatting
├── lib/budget.ts        # month totals, 80/100 checks
├── lib/notify.ts        # local notifications
├── api/                 # receipts.ts, settings.ts, scan.ts (React Query hooks)
├── components/          # BudgetCard, BillRow, CategoryChip, ProgressBar, Logo ...
└── theme.ts             # colors, fonts, spacing
supabase/
├── migrations/          # SQL (tables + RLS)
└── functions/scan-bill/index.ts
```

---

## 5. Splash & Welcome Screen

**Native splash** (`app.json` → `splash`): the SlipScan logo centered on background `#123D2B`. Expo Go may show its own loading screen instead; the Welcome screen below is the first real screen in the app.

**Welcome screen** (`app/welcome.tsx`) — shown only on first launch:
- Full-screen background `#123D2B` (deep green).
- **Logo**: 104px white rounded tile (radius 28) containing a green receipt outline with light-green scan corners and a scan line — build it as an SVG component in `components/Logo.tsx`.
- **Name**: "SlipScan", DM Sans Bold 40px, white.
- **Tagline**: "Scan any bill. Know where your money goes." — 16px, `#CFE3D7`.
- Three short feature rows with icons (white, 15px): *Scan bills from any shop* · *See spending by category* · *Get alerts before you overspend*.
- **Get started** button at the bottom: full width, 56px tall, radius 16, background white, text `#123D2B` DM Sans SemiBold 17px.
- Small link under the button: "Already have an account? Log in" (14px, `#A9C7B6`).
- Logo fades/scales in (300ms) using React Native's `Animated` API — nothing heavier.

On **Get started**: go to **Create account**. Logged-out users always land on Welcome.

**Set limit screen**: title "Set your monthly limit", subtitle "We'll warn you at 80% and when you cross it.", big ₹ amount input (default 8,000), preset chips ₹5,000 · ₹8,000 · ₹10k · ₹15k, note "You can change this anytime in Settings.", **Continue** button → upsert `settings` → Home.

---

## 6. Design Tokens (`src/theme.ts`)

| Token | Value | Use |
|---|---|---|
| `bg` | `#F4F6F3` | app background |
| `card` | `#FFFFFF` | cards, tab bar |
| `border` | `#E1E6E2` | card borders |
| `ink` | `#15201B` | main text |
| `muted` | `#5B665F` | secondary text |
| `primary` | `#1F7A4D` | buttons, active tab, Scan button |
| `primaryDeep` | `#123D2B` | welcome / splash background |
| `warn` / `warnBg` | `#D9620F` / `#FDF1E7` | 80% warning |
| `danger` / `dangerBg` | `#B42318` / `#FDECEA` | over limit, delete |
| `scanAccent` | `#4ADE80` | scanner frame |

Fonts: **DM Sans** for UI, **DM Mono** for all amounts. Radius: cards 20, buttons 14, chips 20. Touch targets ≥ 44px.

Category colors: Groceries `#1F7A4D` · Veg & Fruits `#6FBF73` · Clothing `#8E5BBF` · Dining `#E08A2E` · Health `#2F6FB3` · Shopping `#C04A7A` · Travel `#7A5C45` · Household `#3E8E8A` · Other `#A3ADA7`.

---

## 7. Database (Supabase Postgres)

Money is always **integer paise** (₹12.50 = 1250). Format as ₹ only on screen.

```sql
-- supabase/migrations/0001_init.sql
create table public.settings (
  user_id        uuid primary key default auth.uid() references auth.users on delete cascade,
  monthly_limit  integer not null default 800000 check (monthly_limit > 0),
  alert_80       boolean not null default true,
  alert_100      boolean not null default true,
  alert80_month  text,          -- 'YYYY-MM' when the 80% alert was last sent
  alert100_month text,
  created_at     timestamptz not null default now()
);

create table public.receipts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  shop           text not null,
  purchased_on   date not null,
  total          integer not null check (total >= 0),
  category       text not null check (category in
                   ('groceries','veg_fruits','clothing','dining','health','shopping','travel','household','other')),
  payment_method text check (payment_method in ('cash','upi','card')),
  source         text not null check (source in ('scan','manual')),
  created_at     timestamptz not null default now()
);
create index receipts_user_date on public.receipts (user_id, purchased_on desc);

create table public.receipt_items (
  id          uuid primary key default gen_random_uuid(),
  receipt_id  uuid not null references public.receipts on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  name        text not null,
  qty         numeric,
  unit        text,
  price       integer not null check (price >= 0),
  category    text
);
create index items_receipt on public.receipt_items (receipt_id);
create index items_user_name on public.receipt_items (user_id, lower(name));

-- Row Level Security: each (anonymous) user sees only their own rows
alter table public.settings      enable row level security;
alter table public.receipts      enable row level security;
alter table public.receipt_items enable row level security;

create policy "own settings" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own receipts" on public.receipts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own items" on public.receipt_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**Rules**
- Every schema change is a **new migration file**. Never edit an applied one.
- RLS stays on for every table. Never use the service-role key in the app.
- Save a bill = insert the receipt, then its items. If the items insert fails, delete the receipt so nothing is half-saved.

---

## 8. Edge Function: `scan-bill`

`supabase/functions/scan-bill/index.ts` (Deno). The app calls it with `supabase.functions.invoke('scan-bill', { body })`, which sends the user's session token automatically (keep JWT verification on).

**Request**: `{ "imageBase64": "...", "mimeType": "image/jpeg" }` — reject if larger than 4 MB.

**Response**:
```json
{
  "shop": "Ratnadeep Supermarket",
  "date": "2026-10-29",
  "category": "groceries",
  "items": [
    { "name": "Tomato", "qty": 1, "unit": "kg", "price": 6000, "category": "veg_fruits" }
  ],
  "total": 124500,
  "confidence": "high",
  "unclear": ["Dish soap"]
}
```

**Steps**
1. Validate input size and type.
2. Send the image to a vision-capable LLM with a fixed prompt: return **only JSON** in the shape above, prices in paise, categories from the allowed list, `unclear` = items it isn't sure about.
3. Validate the result with Zod. On failure retry once; then return `confidence: "low"` with whatever fields parsed, so the user fills the rest.
4. Check that items add up to the total; if not, set `confidence: "low"`.
5. **Do not store the image** anywhere. Do not log it.
6. Simple abuse guard: max **30 scans per user per day** (count in a small `scan_usage` table or in-memory per instance — keep it simple).

Secrets (never in the repo): set **at least one** of `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` (optional `GEMINI_MODEL`, `ANTHROPIC_MODEL`). If both are set, Claude is tried first and Gemini is the fallback if that call fails.

---

## 8a. Security Rules (keep these when changing anything)

- **RLS on every table**, policies `to authenticated` using `(select auth.uid()) = user_id`, plus a **restrictive** "no anonymous" policy. New tables follow the same pattern (see `0004_security.sql`).
- `receipt_items` inserts must reference a receipt owned by the same user (policy enforces it).
- `anon` role has no table grants; `scan_usage` is written only by `claim_scan()` (security definer, `search_path = ''`, per-user 30/day + 500/day project-wide).
- DB check constraints cap text length (120), amounts (₹1 crore = `MAX_PAISE`), dates (2000-01-01 … tomorrow), categories. Client validation mirrors them.
- `scan-bill`: rejects bodies > ~5.3 MB before reading, verifies the user with `auth.getUser` (no anonymous), checks base64 + image magic bytes, sanitises model output (untrusted — prompt injection via the photo is possible), never logs the image or secrets, returns generic errors.
- Auth: email confirmation on, anonymous sign-ins off, passwords ≥ 8 with letters + digits, re-auth for password change.
- App: session encrypted at rest (`src/lib/secureStorage.ts`: AES key in SecureStore), cache + scan draft cleared when the user changes, notifications never show amounts.
- Never use the secret/service-role key in the app. Re-run `scripts/security-check.mjs` (see its header) after any schema or function change.

---

## 9. Budget & Alerts Logic (`src/lib/budget.ts`)

- **Spent this month** = sum of `receipts.total` where `purchased_on` is in the current calendar month (user's local time).
- After every save, edit or delete: recompute spent, then:
  - spent ≥ 80% of limit, `alert_80` on, and `alert80_month` ≠ this month → show warning banner + local notification, set `alert80_month`.
  - spent ≥ 100% and same rules for `alert100_month` → show the **Limit crossed** sheet ("You've passed your monthly limit — ₹X over") + notification.
- Progress bar color: green < 80%, orange 80–99%, red ≥ 100%.
- Limit resets naturally on the 1st because totals are per calendar month.
- Ask notification permission **after** onboarding, the first time an alert would fire — not on launch.

**Price watch**: for items bought this week, compare unit price to the same item name (lower-cased, trimmed) from the previous 30 days; show the biggest changes.

---

## 10. Setup & Commands

```bash
# App
npx create-expo-app@latest slipscan
cd slipscan
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill \
  expo-image-picker expo-image-manipulator expo-notifications react-native-svg \
  react-native-gifted-charts @tanstack/react-query lucide-react-native \
  expo-font @expo-google-fonts/dm-sans @expo-google-fonts/dm-mono
npx expo start          # scan the QR code with Expo Go

# Supabase (project created at supabase.com, free tier)
npx supabase init
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push                          # apply migrations
npx supabase functions deploy scan-bill
npx supabase secrets set GEMINI_API_KEY=...        # and/or ANTHROPIC_API_KEY=...
```

`.env` (app — these two are safe to ship; RLS protects the data):
```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```
Keep `.env.example` updated. Never commit real keys.

**Free-tier note:** Supabase free projects pause after about a week with no activity. Data is kept; restore the project from the dashboard if the app suddenly can't connect.

---

## 11. Coding Rules

- TypeScript strict, no `any`. Named exports. Components `PascalCase.tsx`, others `camelCase.ts`.
- All Supabase calls go through `src/api/*` hooks (React Query). Screens never call `supabase` directly.
- Money helpers only from `src/lib/money.ts`. No float math on rupees.
- Dates with `date-fns`; month keys as `YYYY-MM`.
- Always show the **Check & save** screen before saving a scanned bill — the AI can misread.
- Every screen handles loading, empty ("No bills yet — scan your first one") and error states.
- Accessible: real buttons, `accessibilityLabel` on icon-only buttons, text contrast ≥ 4.5:1, color is never the only signal.
- Don't add a library without saying why. Prefer what's already in §2.
- Before finishing a task: `npx tsc --noEmit` and `npx expo lint` pass, and the screen is checked in Expo Go.

---

## 12. Build Order

1. Expo project, theme, fonts, Supabase client, anonymous session.
2. **Welcome** + **Set limit** screens, onboarding redirect.
3. Migration (tables + RLS); Home with budget card and recent bills.
4. **Add manually** → save → Home updates.
5. `scan-bill` Edge Function → Scan screen → Check & save → save.
6. 80% / 100% alerts (banner, sheet, local notifications).
7. History: month switcher, pie chart, price watch, top shops.
8. Settings: limit, alert toggles, export CSV, delete all data.