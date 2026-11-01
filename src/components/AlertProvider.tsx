import { AlertTriangle, CircleAlert, X } from 'lucide-react-native';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatRupees } from '@/lib/money';
import { colors, radius } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

/** warn: amount = paise left. over: amount = paise over the limit. */
export type BudgetAlert = { kind: 'warn' | 'over'; amount: number };

type Ctx = { show: (alert: BudgetAlert) => void };

const AlertContext = createContext<Ctx>({ show: () => {} });

export function useBudgetAlertUi(): Ctx {
  return useContext(AlertContext);
}

/** Hosts the 80% warning banner and the "Limit crossed" sheet above every screen. */
export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<BudgetAlert | null>(null);
  const insets = useSafeAreaInsets();
  const show = useCallback((a: BudgetAlert) => setAlert(a), []);
  const value = useMemo(() => ({ show }), [show]);
  const close = () => setAlert(null);

  return (
    <AlertContext.Provider value={value}>
      {children}

      {alert?.kind === 'warn' && (
        <View style={[styles.banner, { top: insets.top + 8 }]} accessibilityLiveRegion="assertive" accessibilityRole="alert">
          <AlertTriangle size={20} color={colors.warn} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong" color={colors.warn}>
              You&apos;ve used 80% of your limit
            </AppText>
            <AppText variant="caption">{formatRupees(alert.amount)} left for this month.</AppText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss warning" onPress={close} hitSlop={12} style={styles.close}>
            <X size={20} color={colors.muted} />
          </Pressable>
        </View>
      )}

      <Modal visible={alert?.kind === 'over'} transparent animationType="slide" onRequestClose={close}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]} accessibilityViewIsModal>
            <View style={styles.iconWrap}>
              <CircleAlert size={32} color={colors.danger} />
            </View>
            <AppText variant="title" style={styles.center}>
              Limit crossed
            </AppText>
            <AppText variant="body" color={colors.muted} style={styles.center}>
              You&apos;ve passed your monthly limit — {alert ? formatRupees(alert.amount) : ''} over.
            </AppText>
            <Button label="Got it" onPress={close} style={styles.sheetButton} />
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.warnBg,
    borderWidth: 1,
    borderColor: '#F6D3B8',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.card + 8,
    borderTopRightRadius: radius.card + 8,
    padding: 24,
    gap: 10,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  center: { textAlign: 'center' },
  sheetButton: { alignSelf: 'stretch', marginTop: 12 },
});
