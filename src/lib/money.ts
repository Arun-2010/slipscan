// All money is integer paise. Convert to ₹ only for display or input.

/** ₹1 crore — the largest amount the database accepts for a bill, item or limit. */
export const MAX_PAISE = 1_000_000_000;

const rupeeFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const rupeePaiseFormat = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹8,000 or ₹12.50 — paise shown only when non-zero. */
export function formatRupees(paise: number): string {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  const body = abs % 100 === 0 ? rupeeFormat.format(abs / 100) : rupeePaiseFormat.format(abs / 100);
  return `${sign}₹${body}`;
}

/** Compact label for chips: ₹5,000 / ₹10k / ₹1.5L. */
export function formatRupeesShort(paise: number): string {
  const rupees = Math.round(paise / 100);
  if (rupees >= 100000) return `₹${trim(rupees / 100000)}L`;
  if (rupees >= 10000) return `₹${trim(rupees / 1000)}k`;
  return `₹${rupeeFormat.format(rupees)}`;
}

function trim(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '');
}

/**
 * Parses user input like "1,250.5" into paise without float math.
 * Returns null when the text isn't a valid amount.
 */
export function parseRupees(text: string): number | null {
  const clean = text.replace(/[₹,\s]/g, '');
  const match = /^(\d{0,9})(?:\.(\d{0,2}))?$/.exec(clean);
  if (!match || (match[1] === '' && !match[2])) return null;
  const whole = parseInt(match[1] || '0', 10);
  const frac = parseInt((match[2] ?? '').padEnd(2, '0') || '0', 10);
  return whole * 100 + frac;
}

/** Paise to an editable string: 125050 -> "1250.50", 800000 -> "8000". */
export function paiseToInput(paise: number): string {
  const whole = Math.floor(paise / 100);
  const frac = paise % 100;
  return frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, '0')}`;
}

export function sumPaise(values: readonly number[]): number {
  return values.reduce((s, v) => s + v, 0);
}

/** Plain decimal string for CSV: 125050 -> "1250.50". */
export function paiseToDecimal(paise: number): string {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}
