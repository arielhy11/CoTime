/** CoTime palette — late-night party: ink background, hot fuse-orange, zen lime. */
export const colors = {
  background: '#0D0A14',
  surface: '#1A1426',
  surfaceHigh: '#261D38',
  border: '#33284A',
  primary: '#FF5A1F',
  primaryPressed: '#E04812',
  zen: '#B8F34A',
  danger: '#FF3B5C',
  gold: '#FFD23F',
  violet: '#7C5CFF',
  text: '#FFF8F0',
  textMuted: '#A99BC2',
  textDim: '#6E6187',
  black: '#000000',
  soot: '#1B1311',
} as const;

export const fonts = {
  regular: 'Rubik_400Regular',
  medium: 'Rubik_500Medium',
  bold: 'Rubik_700Bold',
  extraBold: 'Rubik_800ExtraBold',
  black: 'Rubik_900Black',
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/** Minimum touch target (pt). */
export const TOUCH_TARGET = 44;
