import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme/tokens';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** Pinned under the content (e.g. the main call to action). */
  footer?: ReactNode;
  background?: string;
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

/** Safe-area page shell with the app background. */
export function Screen({ children, scroll = false, footer, background = colors.background, padded = true, contentStyle }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const padding = padded ? spacing.lg : 0;
  const body = scroll ? (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[{ padding, paddingBottom: padding + (footer ? 0 : insets.bottom) }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, { padding }, contentStyle]}>{children}</View>
  );

  return (
    <View style={[styles.fill, { backgroundColor: background, paddingTop: insets.top }]}>
      {body}
      {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
});
