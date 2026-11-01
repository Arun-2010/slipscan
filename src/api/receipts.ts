import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subDays } from 'date-fns';

import { monthKey, monthRange, toIsoDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';

import { useBudgetAlerts } from './alerts';
import { settingsKey } from './settings';
import type { ItemInput, Receipt, ReceiptInput, ReceiptWithItems } from './types';

export const receiptsKey = ['receipts'] as const;

export async function fetchMonthReceipts(month: string): Promise<Receipt[]> {
  const { from, to } = monthRange(month);
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .gte('purchased_on', from)
    .lte('purchased_on', to)
    .order('purchased_on', { ascending: false })
    .order('created_at', { ascending: false })
    .returns<Receipt[]>();
  if (error) throw error;
  return data;
}

export function useMonthReceipts(month: string = monthKey()) {
  return useQuery({ queryKey: [...receiptsKey, 'month', month], queryFn: () => fetchMonthReceipts(month) });
}

export function useRecentReceipts(limit = 5) {
  return useQuery({
    queryKey: [...receiptsKey, 'recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .order('purchased_on', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)
        .returns<Receipt[]>();
      if (error) throw error;
      return data;
    },
  });
}

export function useReceipt(id: string | undefined) {
  return useQuery({
    queryKey: [...receiptsKey, 'one', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('*, receipt_items(*)')
        .eq('id', id!)
        .single<ReceiptWithItems>();
      if (error) throw error;
      return data;
    },
  });
}

export async function fetchAllReceipts(): Promise<ReceiptWithItems[]> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*, receipt_items(*)')
    .order('purchased_on', { ascending: false })
    .returns<ReceiptWithItems[]>();
  if (error) throw error;
  return data;
}

async function insertItems(receiptId: string, items: ItemInput[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabase
    .from('receipt_items')
    .insert(items.map((i) => ({ ...i, receipt_id: receiptId })));
  if (error) throw error;
}

export type SaveReceiptInput = { id?: string; receipt: ReceiptInput; items: ItemInput[] };

/** Insert the receipt, then its items; if items fail, remove the receipt so nothing is half-saved. */
async function saveReceipt({ id, receipt, items }: SaveReceiptInput): Promise<string> {
  if (id) {
    const { error } = await supabase.from('receipts').update(receipt).eq('id', id);
    if (error) throw error;
    const { error: delError } = await supabase.from('receipt_items').delete().eq('receipt_id', id);
    if (delError) throw delError;
    await insertItems(id, items);
    return id;
  }
  const { data, error } = await supabase.from('receipts').insert(receipt).select('id').single<{ id: string }>();
  if (error) throw error;
  try {
    await insertItems(data.id, items);
  } catch (e) {
    await supabase.from('receipts').delete().eq('id', data.id);
    throw e;
  }
  return data.id;
}

export function useSaveReceipt() {
  const qc = useQueryClient();
  const checkAlerts = useBudgetAlerts();
  return useMutation({
    mutationFn: saveReceipt,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: receiptsKey });
      await checkAlerts();
    },
  });
}

export function useDeleteReceipt() {
  const qc = useQueryClient();
  const checkAlerts = useBudgetAlerts();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('receipts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: receiptsKey });
      await checkAlerts();
    },
  });
}

/** Deletes every bill and the settings row. RLS limits this to the current device's user. */
export function useDeleteAllData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getSession();
      const userId = auth.session?.user.id;
      if (!userId) throw new Error('Not signed in');
      const r = await supabase.from('receipts').delete().eq('user_id', userId);
      if (r.error) throw r.error;
      const s = await supabase.from('settings').delete().eq('user_id', userId);
      if (s.error) throw s.error;
    },
    onSuccess: () => {
      qc.removeQueries({ queryKey: receiptsKey });
      qc.removeQueries({ queryKey: settingsKey });
    },
  });
}

export type PriceChange = {
  name: string;
  unit: string | null;
  before: number; // paise per unit
  now: number;
  changePct: number;
};

type PricedItem = {
  name: string;
  qty: number | null;
  unit: string | null;
  price: number;
  receipts: { purchased_on: string };
};

function unitPrice(i: PricedItem): number {
  return i.qty && i.qty > 0 ? i.price / i.qty : i.price;
}

function average(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Items bought this week vs. the same item name over the previous 30 days. */
export function usePriceWatch() {
  return useQuery({
    queryKey: [...receiptsKey, 'price-watch'],
    queryFn: async (): Promise<PriceChange[]> => {
      const today = new Date();
      const weekStart = toIsoDate(subDays(today, 6));
      const from = toIsoDate(subDays(today, 36));
      const { data, error } = await supabase
        .from('receipt_items')
        .select('name, qty, unit, price, receipts!inner(purchased_on)')
        .gte('receipts.purchased_on', from)
        .returns<PricedItem[]>();
      if (error) throw error;

      const groups = new Map<string, { label: string; unit: string | null; recent: number[]; past: number[] }>();
      for (const item of data) {
        const key = item.name.trim().toLowerCase();
        if (!key) continue;
        const g = groups.get(key) ?? { label: item.name.trim(), unit: item.unit, recent: [], past: [] };
        (item.receipts.purchased_on >= weekStart ? g.recent : g.past).push(unitPrice(item));
        groups.set(key, g);
      }

      const changes: PriceChange[] = [];
      for (const g of groups.values()) {
        if (g.recent.length === 0 || g.past.length === 0) continue;
        const before = Math.round(average(g.past));
        const now = Math.round(average(g.recent));
        if (before === 0 || before === now) continue;
        changes.push({ name: g.label, unit: g.unit, before, now, changePct: ((now - before) / before) * 100 });
      }
      return changes.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 5);
    },
  });
}
