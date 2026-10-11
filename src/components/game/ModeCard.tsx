import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ModeDefinition } from '../../game/modes';
import { buzzTap } from '../../services/haptics';
import { colors, radii, spacing } from '../../theme/tokens';
import { AppText } from '../common/AppText';

interface ModeCardProps {
  mode: ModeDefinition;
  selected: boolean;
  onPress: () => void;
}

export function ModeCard({ mode, selected, onPress }: ModeCardProps) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        buzzTap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        selected && { borderColor: mode.accent, backgroundColor: colors.surfaceHigh },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.emojiWrap, { backgroundColor: `${mode.accent}26` }]}>
        <AppText style={styles.emoji} center>{mode.emoji}</AppText>
      </View>
      <View style={styles.text}>
        <AppText variant="bold" style={styles.title} color={selected ? mode.accent : colors.text}>
          {t(`modes.${mode.id}.title`)}
        </AppText>
        <AppText variant="caption">{t(`modes.${mode.id}.tagline`)}</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { transform: [{ scale: 0.98 }] },
  emojiWrap: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 30, lineHeight: 38 },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 18 },
});
