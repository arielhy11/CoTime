import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, radii, TOUCH_TARGET } from '../../theme/tokens';
import { buzzTap } from '../../services/haptics';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'zen';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const BACKGROUND: Record<ButtonVariant, string> = {
  primary: colors.primary,
  secondary: colors.surfaceHigh,
  ghost: 'transparent',
  danger: colors.danger,
  zen: colors.zen,
};

const FOREGROUND: Record<ButtonVariant, string> = {
  primary: colors.text,
  secondary: colors.text,
  ghost: colors.textMuted,
  danger: colors.text,
  zen: colors.background,
};

export function Button({ title, onPress, variant = 'primary', icon, isLoading = false, disabled = false, size = 'md', style, testID }: ButtonProps) {
  const inactive = isLoading || disabled;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: isLoading }}
      disabled={inactive}
      onPress={() => {
        buzzTap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        size === 'lg' && styles.large,
        { backgroundColor: BACKGROUND[variant] },
        variant === 'primary' && styles.glow,
        pressed && styles.pressed,
        inactive && styles.inactive,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={FOREGROUND[variant]} />
      ) : (
        <View style={styles.row}>
          {icon}
          <AppText style={[styles.label, size === 'lg' && styles.labelLarge]} color={FOREGROUND[variant]} center>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: TOUCH_TARGET + 8,
    borderRadius: radii.md,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: { minHeight: 64, borderRadius: radii.lg },
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  inactive: { opacity: 0.45 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontFamily: fonts.extraBold, fontSize: 17, letterSpacing: 0.2 },
  labelLarge: { fontSize: 20 },
});
