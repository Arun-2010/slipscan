import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Receipt } from '@/api/types';
import { CATEGORY_COLOR, CATEGORY_LABEL, PAYMENT_LABEL } from '@/lib/categories';
import { formatDay } from '@/lib/dates';
import { formatRupees } from '@/lib/money';
import { colors } from '@/theme';

import { AppText } from './AppText';

type Props = { receipt: Receipt; onPress: () => void };

export function BillRow({ receipt, onPress }: Props) {
  const meta = [CATEGORY_LABEL[receipt.category], formatDay(receipt.purchased_on)];
  if (receipt.payment_method) meta.push(PAYMENT_LABEL[receipt.payment_method]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${receipt.shop}, ${formatRupees(receipt.total)}, ${meta.join(', ')}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={[styles.swatch, { backgroundColor: CATEGORY_COLOR[receipt.category] }]} />
      <View style={styles.body}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {receipt.shop}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {meta.join(' · ')}
        </AppText>
      </View>
      <AppText variant="amount">{formatRupees(receipt.total)}</AppText>
      <ChevronRight size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 56 },
  swatch: { width: 10, height: 36, borderRadius: 5 },
  body: { flex: 1 },
});
