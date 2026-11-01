import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, StyleSheet, View } from 'react-native';

import { colors, fonts } from '@/theme';

import { AppText } from './AppText';

const STEPS = ['Reading your bill…', 'Finding the shop…', 'Reading items…', 'Checking prices…', 'Adding up the total…'];
const SWEEP_MS = 1600;
const STEP_MS = 2200;
const GLOW = 90; // height of the soft glow around the scan line
const CORNER = 28;

/** Laser-style scan effect shown over the bill photo while the AI reads it. */
export function ScanningOverlay() {
  const [sweep] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));
  const [height, setHeight] = useState(0);
  const [step, setStep] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const ease = Easing.inOut(Easing.quad);
    const sweepLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: SWEEP_MS, easing: ease, useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: SWEEP_MS, easing: ease, useNativeDriver: true }),
      ]),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: ease, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: ease, useNativeDriver: true }),
      ]),
    );
    sweepLoop.start();
    pulseLoop.start();
    return () => {
      sweepLoop.stop();
      pulseLoop.stop();
    };
  }, [reduceMotion, sweep, pulse]);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), STEP_MS);
    return () => clearInterval(id);
  }, []);

  const translateY = sweep.interpolate({ inputRange: [0, 1], outputRange: [-GLOW / 2, Math.max(height - GLOW / 2, 0)] });
  const cornerOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  const dotScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] });

  return (
    <View style={styles.fill} onLayout={(e) => setHeight(e.nativeEvent.layout.height)} pointerEvents="none">
      <View style={styles.tint} />

      {reduceMotion ? (
        <View style={styles.still}>
          <ActivityIndicator size="large" color={colors.scanAccent} />
        </View>
      ) : (
        height > 0 && (
          <Animated.View style={[styles.beam, { transform: [{ translateY }] }]}>
            <LinearGradient
              colors={['rgba(74,222,128,0)', 'rgba(74,222,128,0.28)', 'rgba(74,222,128,0)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.line} />
          </Animated.View>
        )
      )}

      {[styles.tl, styles.tr, styles.bl, styles.br].map((pos, i) => (
        <Animated.View key={i} style={[styles.corner, pos, { opacity: reduceMotion ? 1 : cornerOpacity }]} />
      ))}

      <View style={styles.pillWrap}>
        <View
          style={styles.pill}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Reading your bill"
          accessibilityLiveRegion="polite">
          <Animated.View style={[styles.dot, !reduceMotion && { transform: [{ scale: dotScale }] }]} />
          <AppText style={styles.pillText}>{STEPS[step]}</AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  tint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,20,16,0.45)' },
  still: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  beam: { position: 'absolute', left: 0, right: 0, top: 0, height: GLOW, justifyContent: 'center' },
  line: {
    height: 3,
    marginHorizontal: 8,
    borderRadius: 2,
    backgroundColor: colors.scanAccent,
    shadowColor: colors.scanAccent,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.scanAccent },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
  pillWrap: { position: 'absolute', left: 0, right: 0, bottom: 20, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(11,20,16,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.35)',
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.scanAccent },
  pillText: { fontFamily: fonts.medium, fontSize: 15, color: colors.white },
});
