import { StyleSheet, View } from 'react-native';

import type { BudgetLevel } from '@/lib/budget';
import { colors } from '@/theme';

const LEVEL_COLOR: Record<BudgetLevel, string> = { ok: colors.primary, warn: colors.warn, over: colors.danger };

type Props = { ratio: number; level: BudgetLevel; label: string };

export function ProgressBar({ ratio, level, label }: Props) {
  const pct = Math.min(Math.max(ratio, 0), 1) * 100;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(ratio, 1) * 100) }}
      style={styles.track}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: LEVEL_COLOR[level] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
});
