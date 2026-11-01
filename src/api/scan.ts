import { FunctionsHttpError } from '@supabase/supabase-js';
import { useMutation } from '@tanstack/react-query';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { isCategory } from '@/lib/categories';
import type { DraftItem, ScanDraft } from '@/lib/draft';
import { supabase } from '@/lib/supabase';

const MAX_WIDTH = 1600;

export type ScanInput = { uri: string; width: number };

function toDraft(raw: unknown): ScanDraft {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const items: DraftItem[] = Array.isArray(r.items)
    ? r.items.flatMap((x: unknown): DraftItem[] => {
        if (!x || typeof x !== 'object') return [];
        const i = x as Record<string, unknown>;
        if (typeof i.name !== 'string' || typeof i.price !== 'number') return [];
        return [
          {
            name: i.name,
            qty: typeof i.qty === 'number' ? i.qty : null,
            unit: typeof i.unit === 'string' ? i.unit : null,
            price: Math.max(0, Math.round(i.price)),
            category: isCategory(i.category) ? i.category : null,
          },
        ];
      })
    : [];
  return {
    shop: typeof r.shop === 'string' ? r.shop : '',
    date: typeof r.date === 'string' ? r.date : null,
    category: isCategory(r.category) ? r.category : 'other',
    items,
    total: typeof r.total === 'number' ? Math.max(0, Math.round(r.total)) : 0,
    confidence: r.confidence === 'high' ? 'high' : 'low',
    unclear: Array.isArray(r.unclear) ? r.unclear.filter((u: unknown): u is string => typeof u === 'string') : [],
  };
}

async function scanBill({ uri, width }: ScanInput): Promise<ScanDraft> {
  const resized = await manipulateAsync(uri, width > MAX_WIDTH ? [{ resize: { width: MAX_WIDTH } }] : [], {
    compress: 0.7,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!resized.base64) throw new Error('Could not read the photo.');

  const { data, error } = await supabase.functions.invoke('scan-bill', {
    body: { imageBase64: resized.base64, mimeType: 'image/jpeg' },
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body: unknown = await error.context.json().catch(() => null);
      const message =
        body && typeof body === 'object' && 'error' in body && typeof body.error === 'string' ? body.error : null;
      throw new Error(message ?? 'Could not read the bill. Try again or add it manually.');
    }
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  return toDraft(data);
}

export function useScanBill() {
  return useMutation({ mutationFn: scanBill });
}
