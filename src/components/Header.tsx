import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, TOUCH } from '@/theme';

import { AppText } from './AppText';

/** Simple screen header with an optional back button and right-side action. */
export function Header({ title, back = false, right }: { title: string; back?: boolean; right?: ReactNode }) {
  return (
    <View style={styles.row}>
      {back && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.icon}>
          <ArrowLeft size={22} color={colors.ink} />
        </Pressable>
      )}
      <AppText variant="title" accessibilityRole="header" style={styles.title} numberOfLines={1}>
        {title}
      </AppText>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: TOUCH, marginBottom: 16 },
  icon: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  title: { flex: 1 },
});
