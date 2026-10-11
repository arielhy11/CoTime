import { StyleSheet, View } from 'react-native';
import { colors, radii } from '../../theme/tokens';
import { AppText } from './AppText';

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <AppText variant="medium" color={colors.text} center>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(255,59,92,0.18)',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 12,
    marginVertical: 8,
  },
});
