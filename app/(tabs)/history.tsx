import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMonthReceipts, usePriceWatch } from '@/api/receipts';
import type { Receipt } from '@/api/types';
import { AppText } from '@/components/AppText';
import { BillRow } from '@/components/BillRow';
import { Card } from '@/components/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateView';
import { CATEGORY_COLOR, CATEGORY_LABEL, type Category } from '@/lib/categories';
import { formatMonth, monthKey, shiftMonth } from '@/lib/dates';
import { formatRupees, sumPaise } from '@/lib/money';
import { colors, TOUCH } from '@/theme';

function byCategory(receipts: Receipt[]): { category: Category; total: number }[] {
  const totals = new Map<Category, number>();
  for (const r of receipts) totals.set(r.category, (totals.get(r.category) ?? 0) + r.total);
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
}

function topShops(receipts: Receipt[]): { shop: string; total: number; count: number }[] {
  const shops = new Map<string, { shop: string; total: number; count: number }>();
  for (const r of receipts) {
    const key = r.shop.trim().toLowerCase();
    const s = shops.get(key) ?? { shop: r.shop.trim(), total: 0, count: 0 };
    s.total += r.total;
    s.count += 1;
    shops.set(key, s);
  }
  return [...shops.values()].sort((a, b) => b.total - a.total).slice(0, 5);
}

export default function HistoryScreen() {
  const current = monthKey();
  const [month, setMonth] = useState(current);
  const bills = useMonthReceipts(month);
  const prices = usePriceWatch();

  const data = useMemo(() => bills.data ?? [], [bills.data]);
  const total = sumPaise(data.map((r) => r.total));
  const categories = useMemo(() => byCategory(data), [data]);
  const shops = useMemo(() => topShops(data), [data]);
  const isCurrent = month === current;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={bills.isRefetching}
            onRefresh={() => {
              bills.refetch();
              prices.refetch();
            }}
            tintColor={colors.primary}
          />
        }>
        <AppText variant="title" accessibilityRole="header">
          History
        </AppText>

        <View style={styles.switcher}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            onPress={() => setMonth(shiftMonth(month, -1))}
            style={styles.arrow}>
            <ChevronLeft size={22} color={colors.ink} />
          </Pressable>
          <View style={styles.monthLabel}>
            <AppText variant="heading">{formatMonth(month)}</AppText>
            <AppText variant="amount" color={colors.muted}>
              {formatRupees(total)}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            accessibilityState={{ disabled: isCurrent }}
            disabled={isCurrent}
            onPress={() => setMonth(shiftMonth(month, 1))}
            style={[styles.arrow, isCurrent && styles.disabled]}>
            <ChevronRight size={22} color={colors.ink} />
          </Pressable>
        </View>

        {bills.isPending ? (
          <Card>
            <LoadingState />
          </Card>
        ) : bills.isError ? (
          <Card>
            <ErrorState onRetry={() => bills.refetch()} />
          </Card>
        ) : data.length === 0 ? (
          <Card>
            <EmptyState title={isCurrent ? undefined : 'No bills this month.'} />
          </Card>
        ) : (
          <>
            <Card style={styles.gap}>
              <AppText variant="heading" accessibilityRole="header">
                By category
              </AppText>
              <View style={styles.chart} accessible accessibilityLabel={`Spending by category. ${categories
                .map((c) => `${CATEGORY_LABEL[c.category]} ${formatRupees(c.total)}`)
                .join(', ')}`}>
                <PieChart
                  donut
                  radius={88}
                  innerRadius={56}
                  data={categories.map((c) => ({ value: c.total, color: CATEGORY_COLOR[c.category] }))}
                  centerLabelComponent={() => (
                    <View style={styles.center}>
                      <AppText variant="caption">Total</AppText>
                      <AppText variant="amount">{formatRupees(total)}</AppText>
                    </View>
                  )}
                />
              </View>
              {categories.map((c) => (
                <View key={c.category} style={styles.legendRow}>
                  <View style={[styles.dot, { backgroundColor: CATEGORY_COLOR[c.category] }]} />
                  <AppText variant="body" style={styles.flex}>
                    {CATEGORY_LABEL[c.category]}
                  </AppText>
                  <AppText variant="caption">{Math.round((c.total / total) * 100)}%</AppText>
                  <AppText variant="amount" style={styles.legendAmount}>
                    {formatRupees(c.total)}
                  </AppText>
                </View>
              ))}
            </Card>

            <Card style={styles.gap}>
              <AppText variant="heading" accessibilityRole="header">
                Top shops
              </AppText>
              {shops.map((s, i) => (
                <View key={s.shop} style={styles.legendRow}>
                  <AppText variant="label" style={styles.rank}>
                    {i + 1}
                  </AppText>
                  <View style={styles.flex}>
                    <AppText variant="body" numberOfLines={1}>
                      {s.shop}
                    </AppText>
                    <AppText variant="caption">
                      {s.count} {s.count === 1 ? 'bill' : 'bills'}
                    </AppText>
                  </View>
                  <AppText variant="amount">{formatRupees(s.total)}</AppText>
                </View>
              ))}
            </Card>
          </>
        )}

        {isCurrent && (
          <Card style={styles.gap}>
            <AppText variant="heading" accessibilityRole="header">
              Price watch
            </AppText>
            <AppText variant="caption">This week&apos;s prices vs. the 30 days before.</AppText>
            {prices.isPending ? (
              <LoadingState />
            ) : prices.isError ? (
              <ErrorState onRetry={() => prices.refetch()} />
            ) : prices.data.length === 0 ? (
              <AppText variant="body" color={colors.muted}>
                No price changes yet. Scan a few bills with the same items to see trends.
              </AppText>
            ) : (
              prices.data.map((p) => {
                const up = p.changePct > 0;
                const Icon = up ? TrendingUp : TrendingDown;
                const tint = up ? colors.danger : colors.primary;
                return (
                  <View key={p.name} style={styles.legendRow}>
                    <Icon size={18} color={tint} />
                    <View style={styles.flex}>
                      <AppText variant="body" numberOfLines={1}>
                        {p.name}
                      </AppText>
                      <AppText variant="caption">
                        {formatRupees(p.before)} → {formatRupees(p.now)}
                        {p.unit ? ` per ${p.unit}` : ''}
                      </AppText>
                    </View>
                    <AppText variant="amount" color={tint}>
                      {up ? '+' : '−'}
                      {Math.abs(Math.round(p.changePct))}%
                    </AppText>
                  </View>
                );
              })
            )}
          </Card>
        )}

        {data.length > 0 && (
          <>
            <AppText variant="heading" accessibilityRole="header">
              All bills
            </AppText>
            <Card style={styles.list}>
              {data.map((r, i) => (
                <View key={r.id} style={i > 0 && styles.divider}>
                  <BillRow receipt={r} onPress={() => router.push({ pathname: '/bill/[id]', params: { id: r.id } })} />
                </View>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  switcher: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: TOUCH / 2,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.35 },
  monthLabel: { alignItems: 'center' },
  gap: { gap: 12 },
  chart: { alignItems: 'center', paddingVertical: 8 },
  center: { alignItems: 'center' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  legendAmount: { minWidth: 84, textAlign: 'right' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  rank: { width: 18 },
  flex: { flex: 1 },
  list: { paddingVertical: 4 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
});
