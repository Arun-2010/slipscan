import { router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useReceipt, useSaveReceipt } from '@/api/receipts';
import type { ReceiptWithItems } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/CategoryChip';
import { CategoryPicker, DateInput, dateError, Field, Input } from '@/components/Form';
import { Header } from '@/components/Header';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView';
import { PAYMENT_LABEL, PAYMENT_METHODS, type Category, type PaymentMethod } from '@/lib/categories';
import { isIsoDate, toIsoDate } from '@/lib/dates';
import { getScanDraft, setScanDraft, type ScanDraft } from '@/lib/draft';
import { formatRupees, MAX_PAISE, paiseToInput, parseRupees, sumPaise } from '@/lib/money';
import { colors, TOUCH } from '@/theme';

type ItemRow = {
  key: string;
  name: string;
  qty: number | null;
  unit: string | null;
  price: string;
  category: Category | null;
  unclear: boolean;
};

type FormState = {
  source: 'scan' | 'manual';
  shop: string;
  date: string;
  category: Category;
  method: PaymentMethod | null;
  total: string;
  items: ItemRow[];
  lowConfidence: boolean;
};

let nextKey = 0;
const newKey = () => `item-${nextKey++}`;

function fromDraft(d: ScanDraft): FormState {
  const unclear = new Set(d.unclear.map((u) => u.trim().toLowerCase()));
  return {
    source: 'scan',
    shop: d.shop,
    date: d.date && isIsoDate(d.date) ? d.date : toIsoDate(new Date()),
    category: d.category,
    method: null,
    total: d.total > 0 ? paiseToInput(d.total) : '',
    items: d.items.map((i) => ({
      key: newKey(),
      name: i.name,
      qty: i.qty,
      unit: i.unit,
      price: paiseToInput(i.price),
      category: i.category,
      unclear: unclear.has(i.name.trim().toLowerCase()),
    })),
    lowConfidence: d.confidence === 'low',
  };
}

function fromReceipt(r: ReceiptWithItems): FormState {
  return {
    source: r.source,
    shop: r.shop,
    date: r.purchased_on,
    category: r.category,
    method: r.payment_method,
    total: paiseToInput(r.total),
    items: r.receipt_items.map((i) => ({
      key: newKey(),
      name: i.name,
      qty: i.qty,
      unit: i.unit,
      price: paiseToInput(i.price),
      category: i.category,
      unclear: false,
    })),
    lowConfidence: false,
  };
}

/** Check & save for a freshly scanned bill, or edit an existing bill when opened with ?id=. */
export default function Review() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useReceipt(id);

  if (id) {
    if (existing.isPending) return <Shell title="Edit bill"><LoadingState /></Shell>;
    if (existing.isError) return <Shell title="Edit bill"><ErrorState onRetry={() => existing.refetch()} /></Shell>;
    return <ReviewForm key={id} id={id} initial={fromReceipt(existing.data)} />;
  }

  const draft = getScanDraft();
  if (!draft) {
    return (
      <Shell title="Check & save">
        <EmptyState
          title="Nothing to check yet — scan a bill first."
          action={<Button label="Scan a bill" onPress={() => router.replace('/scan')} />}
        />
      </Shell>
    );
  }
  return <ReviewForm initial={fromDraft(draft)} />;
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Header title={title} back />
        {children}
      </View>
    </SafeAreaView>
  );
}

function ReviewForm({ id, initial }: { id?: string; initial: FormState }) {
  const save = useSaveReceipt();
  const [form, setForm] = useState<FormState>(initial);
  const [submitted, setSubmitted] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setItem = (key: string, patch: Partial<ItemRow>) =>
    setForm((f) => ({ ...f, items: f.items.map((i) => (i.key === key ? { ...i, ...patch, unclear: false } : i)) }));
  const removeItem = (key: string) => setForm((f) => ({ ...f, items: f.items.filter((i) => i.key !== key) }));
  const addItem = () =>
    setForm((f) => ({
      ...f,
      items: [...f.items, { key: newKey(), name: '', qty: null, unit: null, price: '', category: null, unclear: false }],
    }));

  const total = parseRupees(form.total);
  const itemPrices = form.items.map((i) => parseRupees(i.price));
  const itemsValid = form.items.every((i, idx) => i.name.trim() && itemPrices[idx] !== null && itemPrices[idx]! <= MAX_PAISE);
  const itemsSum = sumPaise(itemPrices.map((p) => p ?? 0));
  const mismatch = form.items.length > 0 && total !== null && Math.abs(itemsSum - total) > 100;

  const errors = {
    shop: form.shop.trim() ? null : 'Enter the shop name.',
    date: dateError(form.date),
    total: total === null ? 'Enter the bill total.' : total > MAX_PAISE ? 'That total is too large.' : null,
    items: itemsValid ? null : 'Every item needs a name and a price (up to ₹1 crore).',
  };
  const valid = !errors.shop && !errors.date && !errors.total && !errors.items;

  const onSave = () => {
    setSubmitted(true);
    if (!valid || total === null) return;
    save.mutate(
      {
        id,
        receipt: {
          shop: form.shop.trim(),
          purchased_on: form.date,
          total,
          category: form.category,
          payment_method: form.method,
          source: form.source,
        },
        items: form.items.map((i, idx) => ({
          name: i.name.trim(),
          qty: i.qty,
          unit: i.unit,
          price: itemPrices[idx] ?? 0,
          category: i.category,
        })),
      },
      {
        onSuccess: () => {
          setScanDraft(null);
          if (id) router.back();
          else router.dismissTo('/');
        },
      },
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Header title={id ? 'Edit bill' : 'Check & save'} back />

          {!id && (
            <View
              style={[styles.notice, { backgroundColor: form.lowConfidence ? colors.warnBg : colors.primarySoft }]}
              accessibilityRole="alert">
              <AlertTriangle size={18} color={form.lowConfidence ? colors.warn : colors.primary} />
              <AppText variant="body" style={styles.flex} color={form.lowConfidence ? colors.warn : colors.primaryDeep}>
                {form.lowConfidence
                  ? 'Some parts were hard to read. Please check the highlighted fields before saving.'
                  : 'The AI can misread bills. Give it a quick check before saving.'}
              </AppText>
            </View>
          )}

          <Field label="Shop" error={submitted ? errors.shop : null}>
            <Input value={form.shop} onChangeText={(v) => set('shop', v)} placeholder="Shop name" maxLength={80} />
          </Field>

          <Field label="Date" error={submitted ? errors.date : null}>
            <DateInput value={form.date} onChange={(v) => set('date', v)} />
          </Field>

          <Field label="Category">
            <CategoryPicker value={form.category} onChange={(c) => set('category', c)} />
          </Field>

          <Field label="Paid by (optional)">
            <View style={styles.row} accessibilityRole="radiogroup">
              {PAYMENT_METHODS.map((m) => (
                <Chip
                  key={m}
                  label={PAYMENT_LABEL[m]}
                  selected={form.method === m}
                  onPress={() => set('method', form.method === m ? null : m)}
                />
              ))}
            </View>
          </Field>

          <View style={styles.sectionHead}>
            <AppText variant="heading" accessibilityRole="header">
              Items ({form.items.length})
            </AppText>
            <Button label="Add item" kind="ghost" icon={<Plus size={18} color={colors.primary} />} onPress={addItem} />
          </View>
          {submitted && errors.items && (
            <AppText variant="caption" color={colors.danger}>
              {errors.items}
            </AppText>
          )}
          {form.items.length > 0 && (
            <Card style={styles.items}>
              {form.items.map((item, idx) => (
                <View key={item.key} style={[styles.itemRow, idx > 0 && styles.divider]}>
                  <View style={styles.flex}>
                    <Input
                      value={item.name}
                      onChangeText={(v) => setItem(item.key, { name: v })}
                      placeholder="Item name"
                      maxLength={120}
                      accessibilityLabel={`Item ${idx + 1} name`}
                      style={item.unclear && styles.unclear}
                    />
                    {(item.unclear || item.qty !== null) && (
                      <AppText variant="caption" color={item.unclear ? colors.warn : colors.muted}>
                        {[item.unclear ? 'Not sure about this one' : null, item.qty !== null ? `Qty ${item.qty}${item.unit ? ` ${item.unit}` : ''}` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </AppText>
                    )}
                  </View>
                  <Input
                    mono
                    value={item.price}
                    onChangeText={(v) => setItem(item.key, { price: v })}
                    placeholder="₹0"
                    keyboardType="decimal-pad"
                    accessibilityLabel={`Item ${idx + 1} price in rupees`}
                    style={[styles.price, item.unclear && styles.unclear]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.name || `item ${idx + 1}`}`}
                    onPress={() => removeItem(item.key)}
                    style={styles.iconButton}>
                    <Trash2 size={18} color={colors.danger} />
                  </Pressable>
                </View>
              ))}
            </Card>
          )}

          <Field label="Total (₹)" error={submitted ? errors.total : null}>
            <Input
              mono
              value={form.total}
              onChangeText={(v) => set('total', v)}
              keyboardType="decimal-pad"
              placeholder="0"
              accessibilityLabel="Bill total in rupees"
              style={styles.total}
            />
          </Field>
          {mismatch && (
            <View style={[styles.notice, { backgroundColor: colors.warnBg }]}>
              <AlertTriangle size={18} color={colors.warn} />
              <AppText variant="body" color={colors.warn} style={styles.flex}>
                Items add up to {formatRupees(itemsSum)}, but the total is {formatRupees(total ?? 0)}.
              </AppText>
              <Button label="Use items" kind="ghost" onPress={() => set('total', paiseToInput(itemsSum))} />
            </View>
          )}

          {save.isError && (
            <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="polite">
              Couldn&apos;t save. Check your connection and try again.
            </AppText>
          )}
          <Button label={id ? 'Save changes' : 'Save bill'} onPress={onSave} loading={save.isPending} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 18 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  items: { paddingVertical: 4, paddingHorizontal: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  price: { width: 96, textAlign: 'right' },
  unclear: { borderColor: colors.warn, backgroundColor: colors.warnBg },
  iconButton: { width: TOUCH, height: 48, alignItems: 'center', justifyContent: 'center' },
  total: { fontSize: 22 },
});
