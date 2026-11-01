// Security tests against the live SlipScan project. Creates two throwaway users and deletes them at the end.
// Run: SB_SECRET=<secret key from `npx supabase projects api-keys --reveal`> node --env-file=.env scripts/security-check.mjs
// The secret key is only needed here to create/delete the test users; never put it in the app or .env.
import { createClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const PUB = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SECRET = process.env.SB_SECRET;
if (!URL || !PUB || !SECRET) throw new Error('Set EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY (via --env-file=.env) and SB_SECRET');
const FN = `${URL}/functions/v1/scan-bill`;
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  -> ${detail}`}`);
};
const blocked = (r) => !!r.error || (Array.isArray(r.data) && r.data.length === 0) || r.data === null;

const admin = createClient(URL, SECRET, { auth: { persistSession: false } });
const stamp = Date.now();
const users = [];

async function makeUser(tag) {
  const email = `sectest-${tag}-${stamp}@example.com`;
  const password = `Sec${stamp}test9`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  users.push(data.user.id);
  const c = createClient(URL, PUB, { auth: { persistSession: false } });
  const s = await c.auth.signInWithPassword({ email, password });
  if (s.error) throw s.error;
  return { c, id: data.user.id, token: s.data.session.access_token };
}

const callFn = (headers, body) =>
  fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: PUB, ...headers }, body })
    .then(async (r) => ({ status: r.status, body: await r.text() }));

try {
  // ---------- logged-out attacker (only the public key from the app) ----------
  const anon = createClient(URL, PUB, { auth: { persistSession: false } });
  for (const t of ['receipts', 'receipt_items', 'settings', 'profiles', 'scan_usage']) {
    const r = await anon.from(t).select('*').limit(5);
    check(`logged-out cannot read ${t}`, blocked(r), JSON.stringify(r.data ?? r.error));
  }
  const ins = await anon.from('receipts').insert({ shop: 'x', purchased_on: '2026-10-01', total: 1, category: 'other', source: 'manual' });
  check('logged-out cannot insert receipts', !!ins.error, 'insert succeeded');
  const rpc = await anon.rpc('claim_scan');
  check('logged-out cannot call claim_scan', !!rpc.error || rpc.data === false, JSON.stringify(rpc));
  const anonSignup = await anon.auth.signInAnonymously();
  check('anonymous sign-ups are disabled', !!anonSignup.error, 'anonymous sign-in worked');
  const fnNoAuth = await callFn({ Authorization: `Bearer ${PUB}` }, JSON.stringify({ imageBase64: PNG, mimeType: 'image/png' }));
  check('scan-bill rejects requests without a user', fnNoAuth.status === 401, `${fnNoAuth.status} ${fnNoAuth.body}`);
  const fnBadJwt = await callFn({ Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.forged' }, '{}');
  check('scan-bill rejects a forged token', fnBadJwt.status === 401, `${fnBadJwt.status}`);

  // ---------- two real users ----------
  const A = await makeUser('a');
  const B = await makeUser('b');

  const a1 = await A.c.from('receipts').insert({ shop: 'Victim Mart', purchased_on: '2026-10-01', total: 50000, category: 'groceries', source: 'manual' }).select('id').single();
  check('user A can save own bill', !a1.error, JSON.stringify(a1.error));
  const aId = a1.data?.id;
  const aItem = await A.c.from('receipt_items').insert({ receipt_id: aId, name: 'Rice', price: 50000 });
  check('user A can save own items', !aItem.error, JSON.stringify(aItem.error));
  await A.c.from('settings').upsert({ user_id: A.id, monthly_limit: 800000 });
  await A.c.from('profiles').upsert({ user_id: A.id, name: 'Alice' });

  // B tries everything against A
  const bReadAll = await B.c.from('receipts').select('*');
  check("user B sees none of A's bills", !bReadAll.error && bReadAll.data.length === 0, JSON.stringify(bReadAll.data));
  const bReadId = await B.c.from('receipts').select('*').eq('id', aId);
  check("user B cannot read A's bill by id", blocked(bReadId), JSON.stringify(bReadId.data));
  const bItems = await B.c.from('receipt_items').select('*').eq('receipt_id', aId);
  check("user B cannot read A's items", blocked(bItems), JSON.stringify(bItems.data));
  const bSettings = await B.c.from('settings').select('*').eq('user_id', A.id);
  check("user B cannot read A's settings", blocked(bSettings), JSON.stringify(bSettings.data));
  const bProfile = await B.c.from('profiles').select('*').eq('user_id', A.id);
  check("user B cannot read A's name", blocked(bProfile), JSON.stringify(bProfile.data));
  const bUpd = await B.c.from('receipts').update({ total: 1 }).eq('id', aId).select();
  check("user B cannot edit A's bill", blocked(bUpd), JSON.stringify(bUpd.data));
  const bDel = await B.c.from('receipts').delete().eq('id', aId).select();
  check("user B cannot delete A's bill", blocked(bDel), JSON.stringify(bDel.data));
  const bSetLimit = await B.c.from('settings').update({ monthly_limit: 1 }).eq('user_id', A.id).select();
  check("user B cannot change A's limit", blocked(bSetLimit), JSON.stringify(bSetLimit.data));
  const bSpoof = await B.c.from('receipts').insert({ user_id: A.id, shop: 'spoof', purchased_on: '2026-10-01', total: 1, category: 'other', source: 'manual' });
  check('user B cannot create a bill as A', !!bSpoof.error, 'insert as A succeeded');
  const bInject = await B.c.from('receipt_items').insert({ receipt_id: aId, name: 'evil', price: 1 });
  check("user B cannot add items to A's bill", !!bInject.error, 'item inserted into A bill');
  const bMove = await B.c.from('receipts').insert({ shop: 'mine', purchased_on: '2026-10-01', total: 1, category: 'other', source: 'manual' }).select('id').single();
  const bMoveUpd = await B.c.from('receipts').update({ user_id: A.id }).eq('id', bMove.data?.id).select();
  check('user B cannot hand a bill to A', !!bMoveUpd.error || bMoveUpd.data.length === 0, JSON.stringify(bMoveUpd.data));

  // scan counter can't be reset
  const bUsageIns = await B.c.from('scan_usage').insert({ day: '2026-10-30', count: -100 });
  check('user cannot write scan_usage', !!bUsageIns.error, 'insert succeeded');
  const bUsageUpd = await B.c.from('scan_usage').update({ count: 0 }).eq('user_id', B.id).select();
  check('user cannot reset scan counter', !!bUsageUpd.error || bUsageUpd.data.length === 0, JSON.stringify(bUsageUpd.data));

  // input limits
  const longShop = await B.c.from('receipts').insert({ shop: 'x'.repeat(5000), purchased_on: '2026-10-01', total: 1, category: 'other', source: 'manual' });
  check('database rejects huge text', !!longShop.error, 'inserted 5000-char shop');
  const future = await B.c.from('receipts').insert({ shop: 'f', purchased_on: '2099-01-01', total: 1, category: 'other', source: 'manual' });
  check('database rejects future dates', !!future.error, 'inserted 2099 bill');
  const neg = await B.c.from('receipts').insert({ shop: 'n', purchased_on: '2026-10-01', total: -5, category: 'other', source: 'manual' });
  check('database rejects negative totals', !!neg.error, 'inserted negative total');
  const badCat = await B.c.from('receipts').insert({ shop: 'c', purchased_on: '2026-10-01', total: 1, category: 'hacked', source: 'manual' });
  check('database rejects unknown categories', !!badCat.error, 'inserted bad category');

  // edge function input checks (as a real user)
  const auth = { Authorization: `Bearer ${B.token}` };
  const fake = await callFn(auth, JSON.stringify({ imageBase64: Buffer.from('<script>alert(1)</script>').toString('base64'), mimeType: 'image/png' }));
  check('scan-bill rejects non-images disguised as PNG', fake.status === 400, `${fake.status} ${fake.body}`);
  const badMime = await callFn(auth, JSON.stringify({ imageBase64: PNG, mimeType: 'application/pdf' }));
  check('scan-bill rejects other file types', badMime.status === 400, `${badMime.status}`);
  const junk = await callFn(auth, 'not json at all');
  check('scan-bill rejects malformed JSON', junk.status === 400, `${junk.status}`);
  const huge = await callFn(auth, JSON.stringify({ imageBase64: 'A'.repeat(7 * 1024 * 1024), mimeType: 'image/png' }));
  check('scan-bill rejects oversized uploads', huge.status === 413, `${huge.status}`);
  const ok = await callFn(auth, JSON.stringify({ imageBase64: PNG, mimeType: 'image/png' }));
  check('scan-bill works for a real user', ok.status === 200, `${ok.status} ${ok.body}`);
  check('scan-bill response has no secrets', !/AQ\.Ab8|sb_secret|eyJ/.test(ok.body), ok.body);
} catch (e) {
  fail++;
  console.log('ERROR', e.message);
} finally {
  for (const id of users) await admin.auth.admin.deleteUser(id);
  console.log(`\n${pass} passed, ${fail} failed; cleaned up ${users.length} test users`);
}
