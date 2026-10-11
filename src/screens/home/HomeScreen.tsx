import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AvatarFace } from '../../components/avatar/AvatarArt';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { Screen } from '../../components/common/Screen';
import { getMode } from '../../game/modes';
import type { Session } from '../../models/Session';
import { useAuthStore } from '../../store/authStore';
import { useHistoryStore } from '../../store/historyStore';
import { colors, radii, spacing } from '../../theme/tokens';

function resultFor(session: Session, uid: string): { emoji: string; key: string; rank: number } {
  const rank = session.rankedIds.indexOf(uid) + 1;
  if (session.loserId === uid) return { emoji: '💥', key: 'home.resultLost', rank };
  if (session.winnerId === uid || (rank === 1 && session.rankedIds.length > 1)) return { emoji: '🏆', key: 'home.resultWon', rank };
  return { emoji: '😐', key: 'home.resultRank', rank };
}

export function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const uid = useAuthStore((s) => s.uid);
  const profile = useAuthStore((s) => s.profile);
  const sessions = useHistoryStore((s) => s.sessions);
  const loadHistory = useHistoryStore((s) => s.load);

  useFocusEffect(
    useCallback(() => {
      if (uid) void loadHistory(uid);
    }, [uid, loadHistory])
  );

  if (!uid || !profile) return null;

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <AppText variant="title" style={styles.logo}>
          Co<AppText variant="title" style={styles.logo} color={colors.primary}>Time</AppText>
        </AppText>
        <Pressable accessibilityRole="button" accessibilityLabel={t('profile.title')} onPress={() => router.push('/profile')} style={styles.me}>
          <AvatarFace identity={{ uid, name: profile.name, photoURL: profile.photoURL }} size={44} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <AppText style={styles.heroEmoji} center>📵</AppText>
        <AppText variant="display" center style={styles.heroTitle}>{t('home.heroTitle')}</AppText>
        <AppText center color={colors.textMuted}>{t('home.heroSubtitle', { name: profile.name })}</AppText>
      </View>

      <View style={styles.actions}>
        <Button title={t('home.start')} size="lg" onPress={() => router.push('/create')} testID="start-game" />
        <Button title={t('home.join')} size="lg" variant="secondary" onPress={() => router.push('/join')} testID="join-game" />
      </View>

      <View style={styles.how}>
        {(['how1', 'how2', 'how3'] as const).map((key, i) => (
          <View key={key} style={styles.howRow}>
            <View style={styles.howNum}><AppText variant="bold" center color={colors.background}>{i + 1}</AppText></View>
            <AppText style={styles.flex}>{t(`home.${key}`)}</AppText>
          </View>
        ))}
      </View>

      {sessions.length > 0 ? (
        <View style={styles.history}>
          <AppText variant="label">{t('home.recent')}</AppText>
          {sessions.map((session) => {
            const mode = getMode(session.mode);
            const result = resultFor(session, uid);
            return (
              <Pressable
                key={session.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/session/[id]', params: { id: session.id } })}
                style={styles.historyRow}
              >
                <AppText style={styles.historyEmoji}>{mode.emoji}</AppText>
                <View style={styles.flex}>
                  <AppText variant="bold">{t(`modes.${session.mode}.title`)}</AppText>
                  <AppText variant="caption">
                    {new Date(session.createdAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
                    {' · '}
                    {t('home.players', { count: session.playerIds.length })}
                  </AppText>
                </View>
                <AppText variant="bold">{result.emoji} {t(result.key, { rank: result.rank })}</AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { fontSize: 26 },
  me: { borderRadius: 24, borderWidth: 2, borderColor: colors.primary, padding: 2 },
  hero: { marginTop: spacing.xl, marginBottom: spacing.lg, gap: spacing.sm },
  heroEmoji: { fontSize: 64, lineHeight: 76 },
  heroTitle: { fontSize: 40, lineHeight: 46 },
  actions: { gap: spacing.sm },
  how: { marginTop: spacing.xl, gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  howNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.zen, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  history: { marginTop: spacing.xl, gap: spacing.sm },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, minHeight: 64 },
  historyEmoji: { fontSize: 26, lineHeight: 32 },
});
