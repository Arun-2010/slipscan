import { subDays } from 'date-fns';
import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { CATEGORIES, type Category } from '@/lib/categories';
import { isIsoDate, toIsoDate } from '@/lib/dates';
import { colors, fonts, radius } from '@/theme';

import { AppText } from './AppText';
import { CategoryChip, Chip } from './CategoryChip';

export function Field({ label, children, error }: { label: string; children: ReactNode; error?: string | null }) {
  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      {children}
      {error ? (
        <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

export function Input({ style, mono, ...rest }: TextInputProps & { mono?: boolean }) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      {...rest}
      style={[styles.input, mono && { fontFamily: fonts.mono }, style]}
    />
  );
}

export function CategoryPicker({ value, onChange }: { value: Category; onChange: (c: Category) => void }) {
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup">
      {CATEGORIES.map((c) => (
        <CategoryChip key={c} category={c} selected={value === c} onPress={() => onChange(c)} />
      ))}
    </View>
  );
}

/** Date entry as YYYY-MM-DD with quick Today / Yesterday chips (no extra picker library needed). */
export function DateInput({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const today = toIsoDate(new Date());
  const yesterday = toIsoDate(subDays(new Date(), 1));
  return (
    <View style={styles.dateBox}>
      <View style={styles.wrap} accessibilityRole="radiogroup">
        <Chip label="Today" selected={value === today} onPress={() => onChange(today)} />
        <Chip label="Yesterday" selected={value === yesterday} onPress={() => onChange(yesterday)} />
      </View>
      <Input
        mono
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        accessibilityLabel="Date, in year month day format"
        maxLength={10}
      />
    </View>
  );
}

export function dateError(value: string): string | null {
  if (!isIsoDate(value)) return 'Enter a date like 2026-10-29.';
  if (value > toIsoDate(new Date())) return "Date can't be in the future.";
  return null;
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  input: {
    minHeight: 48,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateBox: { gap: 10 },
});
