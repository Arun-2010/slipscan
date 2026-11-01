import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSaveReceipt } from '@/api/receipts';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/CategoryChip';
import { CategoryPicker, DateInput, dateError, Field, Input } from '@/components/Form';
import { Header } from '@/components/Header';
import { PAYMENT_LABEL, PAYMENT_METHODS, type Category, type PaymentMethod } from '@/lib/categories';
import { toIsoDate } from '@/lib/dates';
import { MAX_PAISE, parseRupees } from '@/lib/money';
import { colors, fonts } from '@/theme';

export default function AddManual() {
  const save = useSaveReceipt();
  const [amount, setAmount] = useState('');
  const [what, setWhat] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [category, setCategory] = useState<Category>('other');
  const [date, setDate] = useState(() => toIsoDate(new Date()));
  const [submitted, setSubmitted] = useState(false);

  const paise = parseRupees(amount);
  const errors = {
    amount:
      paise === null || paise <= 0
        ? 'Enter the amount you paid.'
        : paise > MAX_PAISE
          ? 'That amount is too large.'
          : null,
    what: what.trim() ? null : 'Say what it was, e.g. Auto fare.',
    date: dateError(date),
  };
  const valid = !errors.amount && !errors.what && !errors.date;

  const reset = () => {
    setAmount('');
    setWhat('');
    setCategory('other');
    setDate(toIsoDate(new Date()));
    setSubmitted(false);
  };

  const onSave = () => {
    setSubmitted(true);
    if (!valid || paise === null) return;
    save.mutate(
      {
        receipt: {
          shop: what.trim(),
          purchased_on: date,
          total: paise,
          category,
          payment_method: method,
          source: 'manual',
        },
        items: [],
      },
      {
        onSuccess: () => {
          reset();
          router.navigate('/');
        },
      },
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Header title="Add a spend" />
          <AppText variant="body" color={colors.muted} style={styles.lead}>
            For spends with no bill — auto fare, chai, a UPI payment to a person.
          </AppText>

          <Field label="Amount" error={submitted ? errors.amount : null}>
            <View style={styles.amountBox}>
              <AppText style={styles.rupee}>₹</AppText>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.muted}
                style={styles.amountInput}
                accessibilityLabel="Amount in rupees"
                maxLength={12}
              />
            </View>
          </Field>

          <Field label="What was it?" error={submitted ? errors.what : null}>
            <Input value={what} onChangeText={setWhat} placeholder="Auto fare, chai, rent…" maxLength={80} />
          </Field>

          <Field label="Paid by">
            <View style={styles.row} accessibilityRole="radiogroup">
              {PAYMENT_METHODS.map((m) => (
                <Chip key={m} label={PAYMENT_LABEL[m]} selected={method === m} onPress={() => setMethod(m)} />
              ))}
            </View>
          </Field>

          <Field label="Category">
            <CategoryPicker value={category} onChange={setCategory} />
          </Field>

          <Field label="Date" error={submitted ? errors.date : null}>
            <DateInput value={date} onChange={setDate} />
          </Field>

          {save.isError && (
            <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="polite">
              Couldn&apos;t save. Check your connection and try again.
            </AppText>
          )}
          <Button label="Save" onPress={onSave} loading={save.isPending} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 20 },
  lead: { marginTop: -12 },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  rupee: { fontFamily: fonts.monoMedium, fontSize: 32, color: colors.muted, marginRight: 6 },
  amountInput: { flex: 1, fontFamily: fonts.monoMedium, fontSize: 36, color: colors.ink, paddingVertical: 6 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
