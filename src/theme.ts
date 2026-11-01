export const colors = {
  bg: '#F4F6F3',
  card: '#FFFFFF',
  border: '#E1E6E2',
  ink: '#15201B',
  muted: '#5B665F',
  primary: '#1F7A4D',
  primaryDeep: '#123D2B',
  primarySoft: '#E5F2EA',
  warn: '#D9620F',
  warnBg: '#FDF1E7',
  danger: '#B42318',
  dangerBg: '#FDECEA',
  scanAccent: '#4ADE80',
  white: '#FFFFFF',
  welcomeText: '#CFE3D7',
  welcomeNote: '#A9C7B6',
} as const;

export const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  mono: 'DMMono_400Regular',
  monoMedium: 'DMMono_500Medium',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { card: 20, button: 14, chip: 20 } as const;

export const TOUCH = 44;
