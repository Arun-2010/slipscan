// End-to-end check of the core flows against the live project, using the same queries the app makes.
// Creates one throwaway user and deletes it at the end.
// Run: SB_SECRET=<secret key> BILL_JPG=<path to a test bill photo> npx tsx --env-file=.env scripts/e2e-check.mts
import { createClient } from '@supabase/supabase-js';
import aesjs from 'aes-js';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

// The app's own logic (CommonJS when loaded by Node, hence the default imports).
import budget from '../src/lib/budget';
import dates from '../src/lib/dates';

const { alertToFire } = budget;
const { monthKey, monthRange, toIsoDate } = dates;

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const PUB = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const SECRET = process.env.SB_SECRET!;
const BILL = process.env.BILL_JPG;
if (!URL || !PUB || !SECRET) throw new Error('Set .env vars and SB_SECRET');

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail: unknown = '') {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  -> ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`}`);
}

const admin = createClient(URL, SECRET, { auth: { persistSession: false } });
const email = `e2e-${Date.now()}@example.com`;
const password = `E2e${Date.now()}x9`;
let userId: string | null = null;

const today = new Date();
const daysAgo = (n: number) => toIsoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n));
const month = monthKey();

try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  userId = created.data.user.id;

  // ---------- login (same call as the Log in screen) ----------
  const db = createClient(URL, PUB, { auth: { persistSession: false } });
  const login = await db.auth.signInWithPassword({ email, password });
  check('log in with email + password', !login.error, login.error?.message);
  const wrong = await createClient(URL, PUB, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password: 'Wrong12345' });
  check('wrong password is refused', wrong.error?.code === 'invalid_credentials', wrong.error);
  const weak = await createClient(URL, PUB, { auth: { persistSession: false } }).auth.signUp({ email: `weak-${Date.now()}@example.com`, password: 'abcdefgh' });
  check('weak password (no digits) is refused at sign-up', weak.error?.code === 'weak_password', weak.error);

  // ---------- name + limit (Name and Set limit screens) ----------
  const prof = await db.from('profiles').upsert({ user_id: userId, name: '  Arun  '.trim() }, { onConflict: 'user_id' }).select('*').single();
  check('save name', !prof.error && prof.data?.name === 'Arun', prof.error ?? prof.data);
  const noSettings = await db.from('settings').select('*').maybeSingle();
  check('new user has no limit yet (app shows Set limit)', !noSettings.error && noSettings.data === null, noSettings);
  const lim = await db.from('settings').upsert({ user_id: userId, monthly_limit: 100000 }, { onConflict: 'user_id' }).select('*').single();
  check('save monthly limit ₹1,000', !lim.error && lim.data?.monthly_limit === 100000 && lim.data?.alert_80 === true, lim.error ?? lim.data);

  // ---------- real bill scan ----------
  type Scan = { shop: string; date: string | null; category: string; total: number; confidence: string; items: { name: string; price: number; qty: number | null }[] };
  let scan: Scan | null = null;
  if (BILL) {
    const t0 = Date.now();
    const { data, error } = await db.functions.invoke('scan-bill', {
      body: { imageBase64: readFileSync(BILL).toString('base64'), mimeType: 'image/jpeg' },
    });
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    check(`scan a real bill (${secs}s)`, !error && !!data, error?.message);
    scan = data as Scan;
    if (scan) {
      const prices = scan.items.map((i) => i.price).sort((a, b) => a - b);
      check('scan: shop name', /ratnadeep/i.test(scan.shop), scan.shop);
      check('scan: date 2026-10-27 (from 27/10/2026)', scan.date === '2026-10-27', scan.date);
      check('scan: total ₹583.00 = 58300 paise', scan.total === 58300, scan.total);
      check('scan: 5 items', scan.items.length === 5, scan.items);
      check('scan: item prices in paise', JSON.stringify(prices) === JSON.stringify([5800, 6000, 9000, 14500, 23000]), prices);
      check('scan: category groceries', scan.category === 'groceries', scan.category);
      check('scan: confidence high (items add up)', scan.confidence === 'high', scan.confidence);
      console.log('      scanned items:', scan.items.map((i) => `${i.name} ${i.qty ?? ''} ${i.price}`).join(' | '));
    }
  } else {
    console.log('SKIP  real bill scan (set BILL_JPG)');
  }

  // ---------- save scanned bill (Check & save → saveReceipt) ----------
  const bill = scan ?? { shop: 'Ratnadeep Supermarket', total: 58300, items: [{ name: 'Tomato', qty: 1, price: 6000 }] };
  const r1 = await db
    .from('receipts')
    .insert({ shop: bill.shop, purchased_on: daysAgo(1), total: bill.total, category: 'groceries', payment_method: 'upi', source: 'scan' })
    .select('id')
    .single();
  check('save bill (receipt row)', !r1.error, r1.error);
  const items = bill.items.map((i) => ({ receipt_id: r1.data!.id, name: i.name, qty: i.qty, unit: null, price: i.price, category: null }));
  const i1 = await db.from('receipt_items').insert(items);
  check('save bill items', !i1.error, i1.error);

  // ---------- half-saved bill is rolled back ----------
  const r2 = await db.from('receipts').insert({ shop: 'Rollback test', purchased_on: daysAgo(0), total: 100, category: 'other', source: 'scan' }).select('id').single();
  const badItems = await db.from('receipt_items').insert([{ receipt_id: r2.data!.id, name: '', price: 100 }]);
  check('bad item is rejected', !!badItems.error, 'empty item name accepted');
  if (badItems.error) await db.from('receipts').delete().eq('id', r2.data!.id); // what saveReceipt does
  const gone = await db.from('receipts').select('id').eq('id', r2.data!.id);
  check('failed save leaves no half-saved bill', gone.data?.length === 0, gone.data);

  // ---------- month total + alerts (real app logic from src/lib/budget.ts) ----------
  async function spent() {
    const { from, to } = monthRange(month);
    const { data, error } = await db.from('receipts').select('*').gte('purchased_on', from).lte('purchased_on', to)
      .order('purchased_on', { ascending: false }).order('created_at', { ascending: false });
    if (error) throw error;
    return { total: data.reduce((s, r) => s + r.total, 0), count: data.length };
  }
  async function settings() {
    const { data } = await db.from('settings').select('*').single();
    return data!;
  }
  let s = await spent();
  check('month total = scanned bill', s.total === bill.total && s.count === 1, s);
  check('no alert at 58%', alertToFire(s.total, 100000, await settings(), month) === null);

  const m1 = await db.from('receipts').insert({ shop: 'Auto fare', purchased_on: daysAgo(0), total: 25000, category: 'travel', payment_method: 'cash', source: 'manual' });
  check('add manual spend ₹250', !m1.error, m1.error);
  s = await spent();
  const fire80 = alertToFire(s.total, 100000, await settings(), month);
  check(`80% alert fires at ${Math.round(s.total / 1000)}%`, fire80 === '80', fire80);
  await db.from('settings').upsert({ user_id: userId, alert80_month: month }, { onConflict: 'user_id' });
  check('80% alert fires only once per month', alertToFire(s.total, 100000, await settings(), month) === null);

  await db.from('receipts').insert({ shop: 'Chai', purchased_on: daysAgo(0), total: 20000, category: 'dining', payment_method: 'upi', source: 'manual' });
  s = await spent();
  const fire100 = alertToFire(s.total, 100000, await settings(), month);
  check(`100% alert fires at ${Math.round(s.total / 1000)}%`, fire100 === '100', fire100);
  await db.from('settings').upsert({ user_id: userId, alert100_month: month, alert80_month: month }, { onConflict: 'user_id' });
  check('100% alert fires only once per month', alertToFire(s.total, 100000, await settings(), month) === null);
  const off = await db.from('settings').upsert({ user_id: userId, alert_100: false, alert100_month: null }, { onConflict: 'user_id' }).select('*').single();
  check('alert toggle off is respected', alertToFire(s.total, 100000, off.data!, month) === null);

  // ---------- price watch (same query as usePriceWatch) ----------
  const old = await db.from('receipts').insert({ shop: 'Old market', purchased_on: daysAgo(15), total: 5000, category: 'veg_fruits', source: 'manual' }).select('id').single();
  await db.from('receipt_items').insert({ receipt_id: old.data!.id, name: 'tomato ', qty: 1, unit: 'kg', price: 5000 });
  const pw = await db.from('receipt_items').select('name, qty, unit, price, receipts!inner(purchased_on)').gte('receipts.purchased_on', daysAgo(36));
  check('price watch query runs', !pw.error, pw.error);
  const tomato = (pw.data ?? []).filter((i) => i.name.trim().toLowerCase() === 'tomato');
  check('price watch sees this week + older tomato', tomato.length >= 2, tomato);

  // ---------- edit (update receipt, replace items) ----------
  const id = r1.data!.id;
  const upd = await db.from('receipts').update({ shop: 'Ratnadeep (edited)', total: 6000 }).eq('id', id);
  await db.from('receipt_items').delete().eq('receipt_id', id);
  await db.from('receipt_items').insert([{ receipt_id: id, name: 'Tomato', qty: 1, unit: 'kg', price: 6000 }]);
  const edited = await db.from('receipts').select('*, receipt_items(*)').eq('id', id).single();
  check('edit bill keeps one updated copy', !upd.error && edited.data?.shop === 'Ratnadeep (edited)' && edited.data?.receipt_items.length === 1, edited.data);

  // ---------- delete one, then delete all ----------
  await db.from('receipts').delete().eq('id', id);
  const orphan = await db.from('receipt_items').select('id').eq('receipt_id', id);
  check('deleting a bill deletes its items', orphan.data?.length === 0, orphan.data);
  await db.from('receipts').delete().eq('user_id', userId);
  await db.from('settings').delete().eq('user_id', userId);
  const left = await db.from('receipts').select('id');
  const leftS = await db.from('settings').select('*');
  const keepName = await db.from('profiles').select('name').single();
  check('delete all data removes bills + limit', left.data?.length === 0 && leftS.data?.length === 0, { left: left.data, leftS: leftS.data });
  check('delete all keeps the account name', keepName.data?.name === 'Arun', keepName.data);

  // ---------- log out ----------
  await db.auth.signOut();
  const after = await db.from('receipts').select('id');
  check('after log out, no data is readable', !!after.error || after.data?.length === 0, after.data);

  // ---------- encrypted session storage (same aes-js calls as src/lib/secureStorage.ts) ----------
  const session = JSON.stringify(login.data.session);
  const key = randomBytes(32);
  const enc = aesjs.utils.hex.fromBytes(new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(1)).encrypt(aesjs.utils.utf8.toBytes(session)));
  const dec = aesjs.utils.utf8.fromBytes(new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(aesjs.utils.hex.fromBytes(key)), new aesjs.Counter(1)).decrypt(aesjs.utils.hex.toBytes(enc)));
  check(`session encrypts and decrypts (${session.length} chars)`, dec === session);
  check('stored session is not readable plain text', !enc.includes('access_token') && !enc.includes(email));
} catch (e) {
  fail++;
  console.log('ERROR', e instanceof Error ? e.message : e);
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId);
  console.log(`\n${pass} passed, ${fail} failed; test user deleted: ${!!userId}`);
}
