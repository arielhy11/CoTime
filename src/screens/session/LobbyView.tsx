import * as Clipboard from 'expo-clipboard';
import { Copy, Share2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AvatarFace } from '../../components/avatar/AvatarArt';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { Header } from '../../components/common/Header';
import { Screen } from '../../components/common/Screen';
import { StakeBanner } from '../../components/game/StakeBanner';
import { getMode, MAX_PLAYERS } from '../../game/modes';
import type { Player } from '../../models/Player';
import type { Session } from '../../models/Session';
import type { User } from '../../models/User';
import { buzzSuccess } from '../../services/haptics';
import { colors, fonts, radii, spacing, TOUCH_TARGET } from '../../theme/tokens';

interface LobbyViewProps {
  session: Session;
  players: Player[];
  profiles: Record<string, User>;
  myUid: string;
  onStart: () => Promise<void>;
  onLeave: () => Promise<void>;
  errorMessage: string | null;
}

export function LobbyView({ session, players, profiles, myUid, onStart, onLeave, errorMessage }: LobbyViewProps) {
  const { t } = useTranslation();
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;

  // Android back = leave the table properly (no ghost players left in the game).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      void onLeaveRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);
  const mode = getMode(session.mode);
  const isHost = session.hostId === myUid;
  const hostName = profiles[session.hostId]?.name ?? players.find((p) => p.uid === session.hostId)?.name ?? '';

  const settings: string[] = [];
  if (session.mode === 'threeStrikes') settings.push(t('lobby.livesSetting', { count: session.lives }));
  if (session.mode === 'timeBank') settings.push(t('lobby.bankSetting', { count: session.timeBankSeconds / 60 }));
  settings.push(session.durationMinutes === null ? t('lobby.noLimit') : t('lobby.durationSetting', { count: session.durationMinutes }));

  const copy = async () => {
    await Clipboard.setStringAsync(session.code);
    buzzSuccess();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const share = async () => {
    const link =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/cotime/join?code=${session.code}`
        : `cotime://join?code=${session.code}`;
    const message = t('lobby.shareMessage', { code: session.code, link });
    try {
      await Share.share({ message });
    } catch {
      // Browsers without the Web Share API: put the invite on the clipboard instead.
      await Clipboard.setStringAsync(message);
      buzzSuccess();
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const start = async () => {
    setStarting(true);
    try {
      await onStart();
    } finally {
      setStarting(false);
    }
  };

  return (
    <Screen
      scroll
      footer={
        isHost ? (
          <>
            <Button title={t('lobby.start', { count: players.length })} size="lg" onPress={() => void start()} isLoading={starting} testID="start-session" />
            {players.length < 2 ? <AppText variant="caption" center>{t('lobby.soloHint')}</AppText> : null}
          </>
        ) : (
          <View style={styles.waiting}>
            <AppText variant="bold" center color={colors.textMuted}>{t('lobby.waitingForHost', { name: hostName })}</AppText>
          </View>
        )
      }
    >
      <Header
        title={t(`modes.${session.mode}.title`)}
        onBack={() => void onLeave()}
      />

      <View style={styles.codeCard}>
        <AppText variant="label" center>{t('lobby.code')}</AppText>
        <Pressable onPress={() => void copy()} accessibilityRole="button" accessibilityLabel={t('lobby.copy')}>
          <AppText style={styles.code} center>{session.code}</AppText>
        </Pressable>
        <View style={styles.codeActions}>
          <Pressable onPress={() => void copy()} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={t('lobby.copy')}>
            <Copy color={colors.text} size={18} />
            <AppText variant="bold">{copied ? t('lobby.copied') : t('lobby.copy')}</AppText>
          </Pressable>
          <Pressable onPress={() => void share()} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={t('lobby.share')}>
            <Share2 color={colors.text} size={18} />
            <AppText variant="bold">{t('lobby.share')}</AppText>
          </Pressable>
        </View>
      </View>

      <View style={[styles.modeRow, { borderColor: mode.accent }]}>
        <AppText style={styles.modeEmoji}>{mode.emoji}</AppText>
        <View style={styles.flex}>
          <AppText color={colors.text}>{t(`modes.${session.mode}.rules`)}</AppText>
          <AppText variant="caption" style={styles.settings}>{settings.join(' · ')}</AppText>
        </View>
      </View>

      <StakeBanner stake={session.stake} />

      <AppText variant="label" style={styles.section}>
        {t('lobby.players', { count: players.length, max: MAX_PLAYERS })}
      </AppText>
      <View style={styles.grid}>
        {players.map((player) => {
          const profile = profiles[player.uid];
          return (
            <View key={player.uid} style={styles.player}>
              <AvatarFace identity={{ uid: player.uid, name: profile?.name ?? player.name, photoURL: profile?.photoURL ?? null }} size={64} />
              <AppText variant="bold" center numberOfLines={1} style={styles.playerName}>
                {profile?.name ?? player.name}
              </AppText>
              {player.uid === session.hostId ? <AppText variant="label" center color={colors.gold}>{t('lobby.host')}</AppText> : null}
            </View>
          );
        })}
      </View>

      <View style={styles.tips}>
        <AppText variant="bold">{t('lobby.tipsTitle')}</AppText>
        <AppText variant="caption">• {t('lobby.tip1')}</AppText>
        <AppText variant="caption">• {t('lobby.tip2')}</AppText>
        <AppText variant="caption">• {t('lobby.tip3')}</AppText>
      </View>

      <ErrorBanner message={errorMessage} />
      {!isHost ? <Button title={t('lobby.leave')} variant="ghost" onPress={() => void onLeave()} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.xs, marginTop: spacing.sm },
  code: { fontFamily: fonts.black, fontSize: 56, lineHeight: 64, letterSpacing: 8, color: colors.primary },
  codeActions: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
  iconButton: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: TOUCH_TARGET, paddingHorizontal: spacing.md, borderRadius: radii.pill, backgroundColor: colors.surfaceHigh },
  modeRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', borderWidth: 1.5, borderRadius: radii.md, padding: spacing.md, marginVertical: spacing.md },
  modeEmoji: { fontSize: 34, lineHeight: 42 },
  flex: { flex: 1 },
  settings: { marginTop: 4 },
  section: { marginTop: spacing.lg, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  player: { width: 76, alignItems: 'center', gap: 4 },
  playerName: { fontSize: 13, lineHeight: 16 },
  tips: { marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, gap: 4 },
  waiting: { minHeight: 64, justifyContent: 'center' },
});
