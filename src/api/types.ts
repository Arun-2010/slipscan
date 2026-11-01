import type { Category, PaymentMethod } from '@/lib/categories';

export type Profile = {
  user_id: string;
  name: string;
};

export type Settings = {
  user_id: string;
  monthly_limit: number;
  alert_80: boolean;
  alert_100: boolean;
  alert80_month: string | null;
  alert100_month: string | null;
};

export type Receipt = {
  id: string;
  shop: string;
  purchased_on: string;
  total: number;
  category: Category;
  payment_method: PaymentMethod | null;
  source: 'scan' | 'manual';
  created_at: string;
};

export type ReceiptItem = {
  id: string;
  receipt_id: string;
  name: string;
  qty: number | null;
  unit: string | null;
  price: number;
  category: Category | null;
};

export type ReceiptWithItems = Receipt & { receipt_items: ReceiptItem[] };

export type ReceiptInput = Pick<Receipt, 'shop' | 'purchased_on' | 'total' | 'category' | 'payment_method' | 'source'>;
export type ItemInput = Pick<ReceiptItem, 'name' | 'qty' | 'unit' | 'price' | 'category'>;
