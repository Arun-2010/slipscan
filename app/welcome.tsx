import { router } from 'expo-router';
import { BellRing, PieChart, ScanLine } from 'lucide-react-native';
import { useEffect, useState, type ComponentType } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Logo } from '@/components/Logo';
import { colors, fonts } from '@/theme';

type IconProps = { size: number; color: string };

const FEATURES: { icon: ComponentType<IconProps>; text: string }[] = [
  { icon: ScanLine, text: 'Scan bills from any shop' },
  { icon: PieChart, text: 'See spending by category' },
  { icon: BellRing, text: 'Get alerts before you overspend' },
];

export default function Welcome() {
  const [appear] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [appear]);

  const getStarted = () => router.push('/auth');
  const logIn = () => router.push({ pathname: '/auth', params: { mode: 'login' } });

  const scale = appear.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.top}>
        <Animated.View style={{ opacity: appear, transform: [{ scale }] }}>
          <Logo size={104} />
        </Animated.View>
        <AppText style={styles.name} accessibilityRole="header">
          SlipScan
        </AppText>
        <AppText style={styles.tagline}>Scan any bill. Know where your money goes.</AppText>

        <View style={styles.features}>
          {FEATURES.map(({ icon: Icon, text }) => (
            <View key={text} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Icon size={20} color={colors.white} />
              </View>
              <AppText style={styles.featureText}>{text}</AppText>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.bottom}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Get started"
          onPress={getStarted}
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.9 }]}>
          <AppText style={styles.buttonText}>Get started</AppText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={logIn} style={styles.login}>
          <AppText style={styles.note}>
            Already have an account? <AppText style={styles.noteLink}>Log in</AppText>
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primaryDeep, paddingHorizontal: 24 },
  top: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bold, fontSize: 40, lineHeight: 48, color: colors.white, marginTop: 24 },
  tagline: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.welcomeText, textAlign: 'center', marginTop: 8 },
  features: { marginTop: 40, gap: 16, alignSelf: 'stretch', paddingHorizontal: 12 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { fontFamily: fonts.medium, fontSize: 15, color: colors.white, flex: 1 },
  bottom: { paddingBottom: 16, gap: 12, alignItems: 'center' },
  button: {
    alignSelf: 'stretch',
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.primaryDeep },
  login: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  note: { fontFamily: fonts.regular, fontSize: 14, color: colors.welcomeNote },
  noteLink: { fontFamily: fonts.semibold, fontSize: 14, color: colors.white, textDecorationLine: 'underline' },
});
