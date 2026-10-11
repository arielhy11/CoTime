import { StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { useRTL } from '../../hooks/useRTL';
import { colors, fonts } from '../../theme/tokens';

export type TextVariant = 'body' | 'medium' | 'bold' | 'title' | 'display' | 'caption' | 'label';

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?: string;
  center?: boolean;
};

/** All text goes through here: Rubik (Latin + Hebrew), RTL-aware alignment. */
export function AppText({ variant = 'body', color, center, style, ...props }: AppTextProps) {
  const rtl = useRTL();
  const align: TextStyle = center ? { textAlign: 'center' } : { textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' };
  return (
    <Text
      {...props}
      style={[styles.base, styles[variant], align, color ? { color } : null, style] as StyleProp<TextStyle>}
    />
  );
}

const styles = StyleSheet.create({
  base: { color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  medium: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  bold: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  title: { fontFamily: fonts.black, fontSize: 28, lineHeight: 34 },
  display: { fontFamily: fonts.black, fontSize: 44, lineHeight: 50, letterSpacing: -0.5 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  label: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.textMuted },
});
