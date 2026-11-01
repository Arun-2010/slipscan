import { Pressable, StyleSheet, View } from 'react-native';

import { CATEGORY_COLOR, CATEGORY_LABEL, type Category } from '@/lib/categories';
import { colors, fonts, radius } from '@/theme';

import { AppText } from './AppText';

type Props = { category: Category; selected?: boolean; onPress?: () => void };

export function CategoryChip({ category, selected = false, onPress }: Props) {
  const color = CATEGORY_COLOR[category];
  const content = (
    <>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText style={[styles.text, selected && styles.textSelected]}>{CATEGORY_LABEL[category]}</AppText>
    </>
  );
  if (!onPress) return <View style={styles.chip}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={CATEGORY_LABEL[category]}
      onPress={onPress}
      style={[styles.chip, styles.pressable, selected && { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}>
      {content}
    </Pressable>
  );
}

/** Generic selectable chip (payment method, preset amounts). */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.chip, styles.pressable, selected && { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}>
      <AppText style={[styles.text, selected && styles.textSelected]}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignSelf: 'flex-start',
  },
  pressable: { minHeight: 44, paddingHorizontal: 14 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  textSelected: { color: colors.primaryDeep, fontFamily: fonts.semibold },
});
