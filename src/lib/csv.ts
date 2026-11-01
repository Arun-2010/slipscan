import type { ReceiptWithItems } from '@/api/types';

import { CATEGORY_LABEL, PAYMENT_LABEL } from './categories';
import { paiseToDecimal } from './money';

function cell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** One row per bill; items are listed in a single column. */
export function receiptsToCsv(receipts: ReceiptWithItems[]): string {
  const header = ['Date', 'Shop', 'Category', 'Paid by', 'Source', 'Total (INR)', 'Items'];
  const rows = receipts.map((r) => [
    r.purchased_on,
    r.shop,
    CATEGORY_LABEL[r.category],
    r.payment_method ? PAYMENT_LABEL[r.payment_method] : '',
    r.source,
    paiseToDecimal(r.total),
    r.receipt_items.map((i) => `${i.name} ${paiseToDecimal(i.price)}`).join('; '),
  ]);
  return [header, ...rows].map((row) => row.map(cell).join(',')).join('\n');
}
