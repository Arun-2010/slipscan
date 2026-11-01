import { View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

type Props = { size?: number };

/** White rounded tile with a green receipt outline, light-green scan corners and a scan line. */
export function Logo({ size = 104 }: Props) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="SlipScan logo"
      style={{
        width: size,
        height: size,
        borderRadius: (size * 28) / 104,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Svg width={size * 0.7} height={size * 0.7} viewBox="0 0 72 72">
        {/* scan corners */}
        <Path d="M6 18V10a4 4 0 0 1 4-4h8" stroke={colors.scanAccent} strokeWidth={4} strokeLinecap="round" fill="none" />
        <Path d="M54 6h8a4 4 0 0 1 4 4v8" stroke={colors.scanAccent} strokeWidth={4} strokeLinecap="round" fill="none" />
        <Path d="M66 54v8a4 4 0 0 1-4 4h-8" stroke={colors.scanAccent} strokeWidth={4} strokeLinecap="round" fill="none" />
        <Path d="M18 66h-8a4 4 0 0 1-4-4v-8" stroke={colors.scanAccent} strokeWidth={4} strokeLinecap="round" fill="none" />
        {/* receipt with zig-zag bottom */}
        <Path
          d="M22 14h28v42l-4.7-3-4.6 3-4.7-3-4.6 3-4.7-3-4.7 3z"
          stroke={colors.primary}
          strokeWidth={3.5}
          strokeLinejoin="round"
          fill="none"
        />
        <Line x1={28} y1={24} x2={44} y2={24} stroke={colors.primary} strokeWidth={3} strokeLinecap="round" />
        <Line x1={28} y1={42} x2={38} y2={42} stroke={colors.primary} strokeWidth={3} strokeLinecap="round" />
        {/* scan line */}
        <Rect x={12} y={31.5} width={48} height={4} rx={2} fill={colors.scanAccent} />
      </Svg>
    </View>
  );
}
