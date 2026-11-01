import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useBudgetAlertUi } from '@/components/AlertProvider';
import { alertToFire } from '@/lib/budget';
import { monthKey } from '@/lib/dates';
import { sendLocalNotification } from '@/lib/notify';

import { fetchMonthReceipts } from './receipts';
import { fetchSettings, settingsKey, upsertSettings } from './settings';

/** Returns a function that recomputes this month's spend and fires the 80% / 100% alerts once each per month. */
export function useBudgetAlerts() {
  const qc = useQueryClient();
  const { show } = useBudgetAlertUi();

  return useCallback(async () => {
    try {
      const month = monthKey();
      const [settings, receipts] = await Promise.all([fetchSettings(), fetchMonthReceipts(month)]);
      if (!settings) return;
      const spent = receipts.reduce((s, r) => s + r.total, 0);
      const fire = alertToFire(spent, settings.monthly_limit, settings, month);
      if (!fire) return;

      const patch = fire === '100' ? { alert100_month: month, alert80_month: month } : { alert80_month: month };
      qc.setQueryData(settingsKey, await upsertSettings(patch));

      if (fire === '100') {
        const over = spent - settings.monthly_limit;
        show({ kind: 'over', amount: over });
        // Notifications can show on the lock screen, so they never include amounts.
        await sendLocalNotification('Monthly limit crossed', "You've passed your monthly limit. Open SlipScan for details.");
      } else {
        const left = settings.monthly_limit - spent;
        show({ kind: 'warn', amount: left });
        await sendLocalNotification('80% of your limit used', 'Open SlipScan to see what is left this month.');
      }
    } catch {
      // Alerts must never block a save.
    }
  }, [qc, show]);
}
