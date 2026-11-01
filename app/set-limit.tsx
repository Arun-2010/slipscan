import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettings, useUpdateSettings } from '@/api/settings';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/CategoryChip';
import { formatRupeesShort, MAX_PAISE, paiseToInput, parseRupees } from '@/lib/money';
import { colors, fonts } from '@/theme';

const PRESETS = [500000, 800000, 1000000, 1500000];
const DEFAULT_LIMIT = 800000;

export default function SetLimit() {
  const settings = useSettings();
  const save = useUpdateSettings();
  // first=1 when arriving straight from sign-up, where there's nothing to go back to.
  const first = useLocalSearchParams<{ first?: string }>().first === '1';
  const [text, setText] = useState<string | null>(null);

  // Prefill with the saved limit once loaded; until the user types, follow it.
  const value = text ?? paiseToInput(settings.data?.monthly_limit ?? DEFAULT_LIMIT);
  const paise = parseRupees(value);
  const invalid = paise === null || paise <= 0 || paise > MAX_PAISE;

  const onContinue = () => {
    if (invalid) return;
    save.mutate(
      { monthly_limit: paise },
      {
        onSuccess: () => {
          if (first || !router.canGoBack()) router.replace('/');
          else router.back();
        },
      },
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText variant="title" accessibilityRole="header">
            Set your monthly limit
          </AppText>
          <AppText variant="body" color={colors.muted} style={styles.subtitle}>
            We&apos;ll warn you at 80% and when you cross it.
          </AppText>

          <View style={styles.amountBox}>
            <AppText style={styles.rupee}>₹</AppText>
            <TextInput
              value={value}
              onChangeText={setText}
              keyboardType="decimal-pad"
              style={styles.amountInput}
              accessibilityLabel="Monthly limit in rupees"
              selectTextOnFocus
              maxLength={9}
            />
          </View>
          {invalid && (
            <AppText variant="caption" color={colors.danger}>
              Enter an amount between ₹1 and ₹1 crore.
            </AppText>
          )}

          <View style={styles.chips} accessibilityRole="radiogroup">
            {PRESETS.map((p) => (
              <Chip key={p} label={formatRupeesShort(p)} selected={paise === p} onPress={() => setText(paiseToInput(p))} />
            ))}
          </View>

          <AppText variant="caption" style={styles.note}>
            You can change this anytime in Settings.
          </AppText>
        </ScrollView>

        <View style={styles.footer}>
          {save.isError && (
            <AppText variant="caption" color={colors.danger} style={styles.error}>
              Couldn&apos;t save. Check your connection and try again.
            </AppText>
          )}
          <Button label="Continue" onPress={onContinue} disabled={invalid} loading={save.isPending} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { padding: 24, paddingTop: 48 },
  subtitle: { marginTop: 8 },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 4,
  },
  rupee: { fontFamily: fonts.monoMedium, fontSize: 40, color: colors.muted, marginRight: 6 },
  amountInput: { flex: 1, fontFamily: fonts.monoMedium, fontSize: 44, color: colors.ink, paddingVertical: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  note: { marginTop: 24 },
  footer: { padding: 24, paddingTop: 8 },
  error: { marginBottom: 8, textAlign: 'center' },
});
