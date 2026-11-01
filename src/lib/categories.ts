export const CATEGORIES = [
  'groceries',
  'veg_fruits',
  'clothing',
  'dining',
  'health',
  'shopping',
  'travel',
  'household',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  groceries: 'Groceries',
  veg_fruits: 'Veg & Fruits',
  clothing: 'Clothing',
  dining: 'Dining',
  health: 'Health',
  shopping: 'Shopping',
  travel: 'Travel',
  household: 'Household',
  other: 'Other',
};

export const CATEGORY_COLOR: Record<Category, string> = {
  groceries: '#1F7A4D',
  veg_fruits: '#6FBF73',
  clothing: '#8E5BBF',
  dining: '#E08A2E',
  health: '#2F6FB3',
  shopping: '#C04A7A',
  travel: '#7A5C45',
  household: '#3E8E8A',
  other: '#A3ADA7',
};

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}

export const PAYMENT_METHODS = ['cash', 'upi', 'card'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_LABEL: Record<PaymentMethod, string> = { cash: 'Cash', upi: 'UPI', card: 'Card' };
