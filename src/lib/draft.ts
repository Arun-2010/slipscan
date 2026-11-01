import type { Category } from './categories';

// Hands a scanned bill from the Scan screen to Check & save without
// squeezing a large object through route params.

export type DraftItem = {
  name: string;
  qty: number | null;
  unit: string | null;
  price: number; // paise
  category: Category | null;
};

export type ScanDraft = {
  shop: string;
  date: string | null;
  category: Category;
  items: DraftItem[];
  total: number; // paise
  confidence: 'high' | 'low';
  unclear: string[];
};

let current: ScanDraft | null = null;

export function setScanDraft(draft: ScanDraft | null): void {
  current = draft;
}

export function getScanDraft(): ScanDraft | null {
  return current;
}
