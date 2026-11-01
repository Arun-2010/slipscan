export type BudgetLevel = 'ok' | 'warn' | 'over';

export const WARN_RATIO = 0.8;

/** Integer comparisons on paise: warn at >= 80%, over at >= 100%. */
export function budgetLevel(spent: number, limit: number): BudgetLevel {
  if (limit <= 0) return 'ok';
  if (spent >= limit) return 'over';
  if (spent * 5 >= limit * 4) return 'warn';
  return 'ok';
}

export function budgetRatio(spent: number, limit: number): number {
  return limit > 0 ? spent / limit : 0;
}

export type AlertSettings = {
  alert_80: boolean;
  alert_100: boolean;
  alert80_month: string | null;
  alert100_month: string | null;
};

export type AlertToFire = '80' | '100' | null;

/**
 * Which alert (if any) should fire now. The 100% alert wins; once it fires
 * the 80% one is also marked sent so we don't send a stale warning later.
 */
export function alertToFire(spent: number, limit: number, s: AlertSettings, month: string): AlertToFire {
  const level = budgetLevel(spent, limit);
  if (level === 'over' && s.alert_100 && s.alert100_month !== month) return '100';
  if (level !== 'ok' && s.alert_80 && s.alert80_month !== month && s.alert100_month !== month) return '80';
  return null;
}
