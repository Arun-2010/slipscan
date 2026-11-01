import { ReceiptText, WifiOff } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colors.primary} />
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}

export function EmptyState({
  title = 'No bills yet — scan your first one',
  action,
}: {
  title?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.box}>
      <ReceiptText size={32} color={colors.muted} />
      <AppText variant="body" color={colors.muted} style={styles.center}>
        {title}
      </AppText>
      {action}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <WifiOff size={28} color={colors.danger} />
      <AppText variant="bodyStrong" style={styles.center}>
        Something went wrong
      </AppText>
      <AppText variant="caption" style={styles.center}>
        {message ?? "Couldn't load your data. Check your connection."}
      </AppText>
      {onRetry && <Button label="Try again" kind="secondary" onPress={onRetry} />}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 32, paddingHorizontal: 16 },
  center: { textAlign: 'center' },
});
