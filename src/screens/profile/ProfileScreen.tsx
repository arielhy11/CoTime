import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '../../components/common/AppText';
import { Header } from '../../components/common/Header';
import { Screen } from '../../components/common/Screen';
import { ProfileForm } from '../../components/profile/ProfileForm';
import { changeLanguage, type AppLanguage } from '../../i18n/config';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { colors, radii, spacing, TOUCH_TARGET } from '../../theme/tokens';

const LANGUAGES: { id: AppLanguage; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'he', label: 'עברית' },
];

export function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const uid = useAuthStore((s) => s.uid);
  const profile = useAuthStore((s) => s.profile);
  const saveProfile = useAuthStore((s) => s.saveProfile);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  if (!uid || !profile) return null;

  return (
    <Screen scroll>
      <Header title={t('profile.title')} />
      <ProfileForm
        uid={uid}
        initialName={profile.name}
        initialPhotoURL={profile.photoURL}
        submitLabel={t('profile.save')}
        onSubmit={async (name, photo) => {
          await saveProfile(name, photo);
          router.back();
        }}
      />

      <View style={styles.section}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <AppText variant="bold">{t('profile.sounds')}</AppText>
            <AppText variant="caption">{t('profile.soundsHint')}</AppText>
          </View>
          <Switch
            value={soundEnabled}
            onValueChange={setSoundEnabled}
            trackColor={{ true: colors.primary, false: colors.surfaceHigh }}
            accessibilityLabel={t('profile.sounds')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="bold">{t('profile.language')}</AppText>
        <View style={styles.langRow}>
          {LANGUAGES.map((lang) => {
            const selected = i18n.language === lang.id;
            return (
              <Pressable
                key={lang.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => void changeLanguage(lang.id)}
                style={[styles.lang, selected && styles.langSelected]}
              >
                <AppText variant="bold" center color={selected ? colors.background : colors.text}>{lang.label}</AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  langRow: { flexDirection: 'row', gap: spacing.sm },
  lang: { flex: 1, minHeight: TOUCH_TARGET, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHigh },
  langSelected: { backgroundColor: colors.zen },
});
