import { Pressable, StyleSheet } from 'react-native';
import { colors, fonts, radii, TOUCH_TARGET } from '../../theme/tokens';
import { buzzTap } from '../../services/haptics';
import { AppText } from './AppText';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  accent?: string;
}

export function Chip({ label, selected, onPress, accent = colors.primary }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        buzzTap();
        onPress();
      }}
      style={[styles.chip, selected && { backgroundColor: accent, borderColor: accent }]}
    >
      <AppText style={styles.label} color={selected ? colors.background : colors.text} center>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: TOUCH_TARGET,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: fonts.bold, fontSize: 15 },
});
