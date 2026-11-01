import { AlertTriangle, CircleAlert } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { budgetLevel, budgetRatio } from '@/lib/budget';
import { formatRupees } from '@/lib/money';
import { colors } from '@/theme';

import { AppText } from './AppText';
import { Card } from './Card';
import { ProgressBar } from './ProgressBar';

type Props = { spent: number; limit: number; monthLabel: string };

export function BudgetCard({ spent, limit, monthLabel }: Props) {
  const level = budgetLevel(spent, limit);
  const ratio = budgetRatio(spent, limit);
  const remaining = limit - spent;
  const pct = Math.round(ratio * 100);

  return (
    <Card>
      <AppText variant="label">Spent in {monthLabel}</AppText>
      <View style={styles.amountRow}>
        <AppText variant="amountLarge">{formatRupees(spent)}</AppText>
        <AppText variant="caption"> of {formatRupees(limit)}</AppText>
      </View>
      <ProgressBar ratio={ratio} level={level} label={`${pct}% of monthly limit used`} />
      <View style={styles.footer}>
        <AppText variant="caption">{pct}% used</AppText>
        <AppText variant="caption" color={level === 'over' ? colors.danger : colors.muted}>
          {remaining >= 0 ? `${formatRupees(remaining)} left` : `${formatRupees(-remaining)} over`}
        </AppText>
      </View>

      {level === 'warn' && (
        <View style={[styles.notice, { backgroundColor: colors.warnBg }]}>
          <AlertTriangle size={18} color={colors.warn} />
          <AppText variant="bodyStrong" color={colors.warn} style={styles.noticeText}>
            Heads up — you&apos;ve used {pct}% of your limit.
          </AppText>
        </View>
      )}
      {level === 'over' && (
        <View style={[styles.notice, { backgroundColor: colors.dangerBg }]}>
          <CircleAlert size={18} color={colors.danger} />
          <AppText variant="bodyStrong" color={colors.danger} style={styles.noticeText}>
            Limit crossed — {formatRupees(-remaining)} over.
          </AppText>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  amountRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4, marginBottom: 12, flexWrap: 'wrap' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, padding: 12, borderRadius: 12 },
  noticeText: { flex: 1 },
});
