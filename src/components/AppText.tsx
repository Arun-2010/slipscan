import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, fonts } from '@/theme';

type Variant = 'title' | 'heading' | 'body' | 'bodyStrong' | 'label' | 'caption' | 'amount' | 'amountLarge';

type Props = TextProps & { variant?: Variant; color?: string };

export function AppText({ variant = 'body', color, style, ...rest }: Props) {
  return <Text {...rest} style={[styles[variant], color ? { color } : null, style]} />;
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, color: colors.ink },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.ink },
  bodyStrong: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.ink },
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.muted },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  amount: { fontFamily: fonts.monoMedium, fontSize: 15, lineHeight: 21, color: colors.ink },
  amountLarge: { fontFamily: fonts.monoMedium, fontSize: 32, lineHeight: 40, color: colors.ink },
});
