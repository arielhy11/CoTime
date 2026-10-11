import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '../../components/common/AppText';
import { Screen } from '../../components/common/Screen';
import { ProfileForm } from '../../components/profile/ProfileForm';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing } from '../../theme/tokens';

export function OnboardingScreen() {
  const { t } = useTranslation();
  const uid = useAuthStore((s) => s.uid);
  const saveProfile = useAuthStore((s) => s.saveProfile);
  if (!uid) return null;

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <AppText variant="display" center>
          Co<AppText variant="display" color={colors.primary}>Time</AppText>
        </AppText>
        <AppText variant="medium" center color={colors.textMuted}>{t('onboarding.tagline')}</AppText>
      </View>
      <AppText variant="title" center style={styles.title}>{t('onboarding.title')}</AppText>
      <AppText center color={colors.textMuted}>{t('onboarding.subtitle')}</AppText>
      <ProfileForm
        uid={uid}
        initialName=""
        initialPhotoURL={null}
        submitLabel={t('onboarding.cta')}
        onSubmit={saveProfile}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: spacing.lg, marginBottom: spacing.lg, gap: spacing.xs },
  title: { fontSize: 24 },
});
