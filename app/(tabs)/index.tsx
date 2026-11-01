import { router } from 'expo-router';
import { PlusCircle, ScanLine } from 'lucide-react-native';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useProfile } from '@/api/profile';
import { useMonthReceipts, useRecentReceipts } from '@/api/receipts';
import { useSettings } from '@/api/settings';
import { AppText } from '@/components/AppText';
import { BillRow } from '@/components/BillRow';
import { BudgetCard } from '@/components/BudgetCard';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Logo } from '@/components/Logo';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView';
import { formatMonth, monthKey } from '@/lib/dates';
import { sumPaise } from '@/lib/money';
import { colors } from '@/theme';

export default function Home() {
  const month = monthKey();
  const settings = useSettings();
  const profile = useProfile();
  const monthBills = useMonthReceipts(month);
  const recent = useRecentReceipts(5);

  const refreshing = settings.isRefetching || monthBills.isRefetching || recent.isRefetching;
  const refresh = () => {
    settings.refetch();
    monthBills.refetch();
    recent.refetch();
  };

  const loading = settings.isPending || monthBills.isPending;
  const error = settings.isError || monthBills.isError;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
        <View style={styles.brand}>
          <Logo size={36} />
          <View>
            <AppText variant="caption">SlipScan</AppText>
            <AppText variant="title" accessibilityRole="header">
              Hi{profile.data?.name ? `, ${profile.data.name.split(' ')[0]}` : ''}
            </AppText>
          </View>
        </View>

        {loading ? (
          <Card>
            <LoadingState />
          </Card>
        ) : error ? (
          <Card>
            <ErrorState onRetry={refresh} />
          </Card>
        ) : settings.data ? (
          <BudgetCard
            spent={sumPaise((monthBills.data ?? []).map((r) => r.total))}
            limit={settings.data.monthly_limit}
            monthLabel={formatMonth(month)}
          />
        ) : (
          <Card style={styles.gap}>
            <AppText variant="heading">Set a monthly limit</AppText>
            <AppText variant="body" color={colors.muted}>
              We&apos;ll warn you at 80% and when you cross it.
            </AppText>
            <Button label="Set limit" onPress={() => router.push('/set-limit')} />
          </Card>
        )}

        <View style={styles.actions}>
          <Button
            label="Scan a bill"
            icon={<ScanLine size={20} color={colors.white} />}
            onPress={() => router.push('/scan')}
            style={styles.flex}
          />
          <Button
            label="No bill? Add"
            kind="secondary"
            icon={<PlusCircle size={20} color={colors.ink} />}
            onPress={() => router.push('/add')}
            style={styles.flex}
          />
        </View>

        <View style={styles.sectionHead}>
          <AppText variant="heading" accessibilityRole="header">
            Recent bills
          </AppText>
          {!!recent.data?.length && (
            <Button label="See all" kind="ghost" onPress={() => router.push('/history')} style={styles.seeAll} />
          )}
        </View>
        <Card style={styles.list}>
          {recent.isPending ? (
            <LoadingState />
          ) : recent.isError ? (
            <ErrorState onRetry={() => recent.refetch()} />
          ) : recent.data.length === 0 ? (
            <EmptyState />
          ) : (
            recent.data.map((r, i) => (
              <View key={r.id} style={i > 0 && styles.divider}>
                <BillRow receipt={r} onPress={() => router.push({ pathname: '/bill/[id]', params: { id: r.id } })} />
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  gap: { gap: 12 },
  actions: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1, paddingHorizontal: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  seeAll: { minHeight: 44 },
  list: { paddingVertical: 4 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
});
