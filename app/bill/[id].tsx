import { router, useLocalSearchParams } from 'expo-router';
import { Pencil, Trash2 } from 'lucide-react-native';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDeleteReceipt, useReceipt } from '@/api/receipts';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CategoryChip } from '@/components/CategoryChip';
import { Header } from '@/components/Header';
import { ErrorState, LoadingState } from '@/components/StateView';
import { PAYMENT_LABEL } from '@/lib/categories';
import { formatDay } from '@/lib/dates';
import { formatRupees } from '@/lib/money';
import { colors } from '@/theme';

export default function BillDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bill = useReceipt(id);
  const remove = useDeleteReceipt();

  const confirmDelete = () => {
    Alert.alert('Delete this bill?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => remove.mutate(id, { onSuccess: () => router.back() }),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Header title="Bill" back />
        {bill.isPending ? (
          <LoadingState />
        ) : bill.isError ? (
          <ErrorState message="This bill couldn't be loaded. It may have been deleted." onRetry={() => bill.refetch()} />
        ) : (
          <>
            <Card style={styles.gap}>
              <AppText variant="heading">{bill.data.shop}</AppText>
              <AppText variant="amountLarge">{formatRupees(bill.data.total)}</AppText>
              <View style={styles.meta}>
                <CategoryChip category={bill.data.category} />
                <AppText variant="caption">{formatDay(bill.data.purchased_on)}</AppText>
                {bill.data.payment_method && (
                  <AppText variant="caption">· {PAYMENT_LABEL[bill.data.payment_method]}</AppText>
                )}
                <AppText variant="caption">· {bill.data.source === 'scan' ? 'Scanned' : 'Added manually'}</AppText>
              </View>
            </Card>

            {bill.data.receipt_items.length > 0 && (
              <Card style={styles.items}>
                <AppText variant="label" style={styles.itemsTitle}>
                  {bill.data.receipt_items.length} items
                </AppText>
                {bill.data.receipt_items.map((item, i) => (
                  <View key={item.id} style={[styles.itemRow, i > 0 && styles.divider]}>
                    <View style={styles.flex}>
                      <AppText variant="body">{item.name}</AppText>
                      {item.qty !== null && (
                        <AppText variant="caption">
                          {item.qty}
                          {item.unit ? ` ${item.unit}` : ''}
                        </AppText>
                      )}
                    </View>
                    <AppText variant="amount">{formatRupees(item.price)}</AppText>
                  </View>
                ))}
              </Card>
            )}

            {remove.isError && (
              <AppText variant="caption" color={colors.danger}>
                Couldn&apos;t delete. Check your connection and try again.
              </AppText>
            )}
            <View style={styles.actions}>
              <Button
                label="Edit"
                kind="secondary"
                icon={<Pencil size={18} color={colors.ink} />}
                onPress={() => router.push({ pathname: '/review', params: { id } })}
                style={styles.flex}
              />
              <Button
                label="Delete"
                kind="danger"
                icon={<Trash2 size={18} color={colors.danger} />}
                onPress={confirmDelete}
                loading={remove.isPending}
                style={styles.flex}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  gap: { gap: 8 },
  flex: { flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  items: { paddingVertical: 8 },
  itemsTitle: { marginBottom: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  actions: { flexDirection: 'row', gap: 12 },
});
