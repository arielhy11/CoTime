import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '../src/components/common/AppText';
import { Button } from '../src/components/common/Button';
import { colors, spacing } from '../src/theme/tokens';

export default function NotFound() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={styles.center}>
      <AppText style={styles.emoji} center>🤷</AppText>
      <AppText variant="title" center>{t('app.notFound')}</AppText>
      <Button title={t('app.goHome')} onPress={() => router.replace('/')} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg, backgroundColor: colors.background },
  emoji: { fontSize: 56, lineHeight: 66 },
});
