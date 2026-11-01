import { router } from 'expo-router';
import { Download, LogOut, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth, useSignOut } from '@/api/auth';
import { useProfile } from '@/api/profile';
import { fetchAllReceipts, useDeleteAllData } from '@/api/receipts';
import { useSettings, useUpdateSettings } from '@/api/settings';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState, LoadingState } from '@/components/StateView';
import { receiptsToCsv } from '@/lib/csv';
import { formatRupees } from '@/lib/money';
import { colors } from '@/theme';

export default function SettingsScreen() {
  const settings = useSettings();
  const update = useUpdateSettings();
  const deleteAll = useDeleteAllData();
  const profile = useProfile();
  const { user } = useAuth();
  const signOut = useSignOut();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportCsv = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const receipts = await fetchAllReceipts();
      if (receipts.length === 0) {
        setExportError('No bills to export yet.');
        return;
      }
      await Share.share({ title: 'SlipScan bills', message: receiptsToCsv(receipts) });
    } catch {
      setExportError("Couldn't export. Check your connection and try again.");
    } finally {
      setExporting(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert('Log out?', 'Your bills stay saved in your account. Log in again to see them.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => signOut.mutate() },
    ]);
  };

  const confirmDeleteAll = () => {
    Alert.alert('Delete all data?', 'Every bill and your limit will be removed from your account. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete everything',
        style: 'destructive',
        onPress: () => deleteAll.mutate(undefined, { onSuccess: () => router.push('/set-limit') }),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="title" accessibilityRole="header">
          Settings
        </AppText>

        {settings.isPending ? (
          <Card>
            <LoadingState />
          </Card>
        ) : settings.isError ? (
          <Card>
            <ErrorState onRetry={() => settings.refetch()} />
          </Card>
        ) : (
          <>
            <Card style={styles.gap}>
              <AppText variant="label">Monthly limit</AppText>
              <AppText variant="amountLarge">
                {settings.data ? formatRupees(settings.data.monthly_limit) : 'Not set'}
              </AppText>
              <Button
                label={settings.data ? 'Change limit' : 'Set limit'}
                kind="secondary"
                onPress={() => router.push('/set-limit')}
              />
            </Card>

            <Card style={styles.gap}>
              <AppText variant="heading" accessibilityRole="header">
                Alerts
              </AppText>
              <ToggleRow
                label="Warn me at 80%"
                value={settings.data?.alert_80 ?? true}
                disabled={!settings.data || update.isPending}
                onChange={(v) => update.mutate({ alert_80: v })}
              />
              <ToggleRow
                label="Alert me when I cross my limit"
                value={settings.data?.alert_100 ?? true}
                disabled={!settings.data || update.isPending}
                onChange={(v) => update.mutate({ alert_100: v })}
              />
              {update.isError && (
                <AppText variant="caption" color={colors.danger}>
                  Couldn&apos;t save. Try again.
                </AppText>
              )}
            </Card>
          </>
        )}

        <Card style={styles.gap}>
          <AppText variant="heading" accessibilityRole="header">
            Your data
          </AppText>
          <Button
            label="Export CSV"
            kind="secondary"
            icon={<Download size={18} color={colors.ink} />}
            onPress={exportCsv}
            loading={exporting}
          />
          {exportError && (
            <AppText variant="caption" color={colors.danger}>
              {exportError}
            </AppText>
          )}
          <Button
            label="Delete all data"
            kind="danger"
            icon={<Trash2 size={18} color={colors.danger} />}
            onPress={confirmDeleteAll}
            loading={deleteAll.isPending}
          />
          {deleteAll.isError && (
            <AppText variant="caption" color={colors.danger}>
              Couldn&apos;t delete. Check your connection and try again.
            </AppText>
          )}
        </Card>

        <Card style={styles.gap}>
          <AppText variant="heading" accessibilityRole="header">
            Account
          </AppText>
          <View style={styles.toggle}>
            <View style={styles.flex}>
              <AppText variant="label">Name</AppText>
              <AppText variant="bodyStrong">{profile.data?.name ?? '—'}</AppText>
            </View>
            <Button label="Edit" kind="ghost" onPress={() => router.push('/name')} accessibilityHint="Change your name" />
          </View>
          <View>
            <AppText variant="label">Email</AppText>
            <AppText variant="body">{user?.email ?? '—'}</AppText>
          </View>
          <Button
            label="Log out"
            kind="secondary"
            icon={<LogOut size={18} color={colors.ink} />}
            onPress={confirmSignOut}
            loading={signOut.isPending}
          />
          {signOut.isError && (
            <AppText variant="caption" color={colors.danger}>
              Couldn&apos;t log out. Try again.
            </AppText>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggle}>
      <AppText variant="body" style={styles.flex}>
        {label}
      </AppText>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor={colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  gap: { gap: 12 },
  toggle: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 12 },
  flex: { flex: 1 },
});
