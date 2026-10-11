import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AvatarFace, type AvatarIdentity } from '../../components/avatar/AvatarArt';
import { DamagedAvatar } from '../../components/avatar/DamagedAvatar';
import { Crater } from '../../components/avatar/DamageOverlay';
import { Explosion } from '../../components/avatar/Explosion';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { Screen } from '../../components/common/Screen';
import { computeAwards } from '../../game/awards';
import { damageLevel } from '../../game/damage';
import { getMode } from '../../game/modes';
import { losersOf, rankPlayers, winnersOf } from '../../game/ranking';
import { formatDuration } from '../../game/time';
import type { Player } from '../../models/Player';
import type { Session } from '../../models/Session';
import type { User } from '../../models/User';
import { buzzExplosion } from '../../services/haptics';
import { playSound } from '../../services/sound';
import { colors, fonts, radii, spacing } from '../../theme/tokens';

interface ResultsViewProps {
  session: Session;
  players: Player[];
  profiles: Record<string, User>;
  myUid: string;
  /** Just finished in front of us (vs. opened from history): play the fanfare. */
  live: boolean;
  onRematch: () => Promise<void>;
  onJoinRematch: () => Promise<void>;
}

function identityOf(player: Player, profiles: Record<string, User>): AvatarIdentity {
  const profile = profiles[player.uid];
  return { uid: player.uid, name: profile?.name ?? player.name, photoURL: profile?.photoURL ?? null };
}

const LOSER_SIZE = 150;

/** The loser's face gets the bomb. Tap to bomb them again. */
function LoserBomb({ identity, autoPlay }: { identity: AvatarIdentity; autoPlay: boolean }) {
  const { t } = useTranslation();
  const [playKey, setPlayKey] = useState(autoPlay ? 1 : 0);
  const [blasting, setBlasting] = useState(autoPlay);

  const replay = () => {
    playSound('whistle');
    setBlasting(true);
    setPlayKey((k) => k + 1);
  };

  useEffect(() => {
    if (autoPlay) playSound('whistle');
  }, [autoPlay]);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('results.bombAgain')} onPress={replay} style={styles.loserBomb}>
      {blasting ? (
        <Explosion
          identity={identity}
          size={LOSER_SIZE}
          playKey={playKey}
          onBlast={() => {
            playSound('boom');
            buzzExplosion();
          }}
          onDone={() => setBlasting(false)}
        />
      ) : (
        <Crater identity={identity} size={LOSER_SIZE} />
      )}
      <AppText variant="caption" center style={styles.bombHint}>{t('results.bombAgain')}</AppText>
    </Pressable>
  );
}

export function ResultsView({ session, players, profiles, myUid, live, onRematch, onJoinRematch }: ResultsViewProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const endedAt = session.endedAt ?? Date.now();
  const mode = getMode(session.mode);

  const ranked = useMemo(() => rankPlayers(session.mode, players, endedAt), [session.mode, players, endedAt]);
  const losers = useMemo(() => losersOf(ranked), [ranked]);
  const loserIds = new Set(losers.map((r) => r.player.uid));
  const winners = winnersOf(ranked).filter((r) => !loserIds.has(r.player.uid));
  const awards = useMemo(() => computeAwards(players, endedAt), [players, endedAt]);
  const nameOf = (uid: string) => profiles[uid]?.name ?? players.find((p) => p.uid === uid)?.name ?? '?';
  // The verdict written when the game ended wins over a re-rank of possibly stale snapshots.
  const iLost = session.loserId !== null ? session.loserId === myUid : loserIds.has(myUid);
  const iWon = session.winnerId !== null ? session.winnerId === myUid : winners.some((w) => w.player.uid === myUid);

  const playedResultSound = useRef(false);
  useEffect(() => {
    if (!live || playedResultSound.current || players.length === 0) return;
    playedResultSound.current = true;
    playSound(iLost ? 'sad' : 'fanfare');
  }, [live, iLost, players.length]);

  const reason = (() => {
    switch (session.endReason) {
      case 'firstPickup':
        return t('results.reasonFirstPickup', { name: nameOf(session.loserId ?? '') });
      case 'lastStanding':
        return session.winnerId ? t('results.reasonLastStanding', { name: nameOf(session.winnerId) }) : t('results.reasonAllOut');
      case 'timeUp':
        return t('results.reasonTimeUp');
      case 'hostEnded':
        return t('results.reasonHostEnded');
      default:
        return '';
    }
  })();

  const isHost = session.hostId === myUid;
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      console.error('Rematch failed:', e instanceof Error ? e.message : e);
    } finally {
      setBusy(false);
    }
  };

  const footer = (
    <>
      {session.rematchSessionId && !isHost ? (
        <Button title={t('results.joinRematch')} size="lg" onPress={() => void run(onJoinRematch)} isLoading={busy} />
      ) : null}
      {isHost && !session.rematchSessionId ? (
        <Button title={t('results.rematch')} size="lg" onPress={() => void run(onRematch)} isLoading={busy} />
      ) : null}
      <Button title={t('results.home')} variant="ghost" onPress={() => router.replace('/')} />
    </>
  );

  return (
    <Screen scroll footer={footer}>
      <AppText variant="label" center color={mode.accent} style={styles.top}>{mode.emoji} {t(`modes.${session.mode}.title`)}</AppText>
      <AppText variant="display" center>{iLost ? t('results.youLost') : iWon ? t('results.youWon') : t('results.gameOver')}</AppText>
      <AppText center color={colors.textMuted}>{reason}</AppText>

      {winners.length > 0 ? (
        <View style={styles.winners}>
          {winners.map((w) => (
            <View key={w.player.uid} style={styles.winner}>
              <DamagedAvatar identity={identityOf(w.player, profiles)} size={winners.length > 2 ? 72 : 104} level={damageLevel(session, w.player, endedAt)} crown animateChanges={false} />
              <AppText variant="bold" center numberOfLines={1}>{identityOf(w.player, profiles).name}</AppText>
            </View>
          ))}
          <AppText variant="title" center color={colors.zen} style={styles.fullWidth}>
            {winners.length === 1 ? t('results.winsOne') : t('results.winsMany')}
          </AppText>
        </View>
      ) : null}

      {losers.length > 0 ? (
        <View style={styles.loserCard}>
          <AppText variant="label" center color={colors.danger}>{t('results.loserLabel')}</AppText>
          <View style={styles.losers}>
            {losers.map((l) => (
              <View key={l.player.uid} style={styles.loser}>
                <LoserBomb identity={identityOf(l.player, profiles)} autoPlay={live} />
                <AppText variant="title" center>{identityOf(l.player, profiles).name}</AppText>
              </View>
            ))}
          </View>
          {session.stake ? (
            <AppText variant="bold" center color={colors.gold} style={styles.owes}>
              {t(losers.length === 1 ? 'results.owesOne' : 'results.owesMany', { stake: session.stake })}
            </AppText>
          ) : null}
        </View>
      ) : session.stake ? (
        <AppText variant="bold" center color={colors.zen} style={styles.nobody}>{t('results.nobodyOwes', { stake: session.stake })}</AppText>
      ) : null}

      <AppText variant="label" style={styles.section}>{t('results.standings')}</AppText>
      <View style={styles.table}>
        {ranked.map((r) => {
          const identity = identityOf(r.player, profiles);
          return (
            <View key={r.player.uid} style={[styles.row, r.player.uid === myUid && styles.rowMe]}>
              <AppText style={styles.rank}>#{r.rank}</AppText>
              <AvatarOrWreck player={r.player} identity={identity} session={session} endedAt={endedAt} />
              <View style={styles.flex}>
                <AppText variant="bold" numberOfLines={1}>{identity.name}</AppText>
                <AppText variant="caption">
                  {t('stats.pickups', { count: r.player.pickupCount })} · {t('results.offTable', { time: formatDuration(r.offTableMs) })}
                </AppText>
              </View>
              {r.player.isOut ? <AppText style={styles.skull}>💀</AppText> : null}
            </View>
          );
        })}
      </View>

      {awards.length > 0 ? (
        <>
          <AppText variant="label" style={styles.section}>{t('results.awards')}</AppText>
          <View style={styles.awards}>
            {awards.map((award) => (
              <View key={award.id} style={styles.award}>
                <AppText style={styles.awardEmoji} center>{award.emoji}</AppText>
                <AppText variant="bold" center>{t(`awards.${award.id}.title`)}</AppText>
                <AppText variant="caption" center numberOfLines={2}>{award.userIds.map(nameOf).join(', ')}</AppText>
                <AppText variant="caption" center color={colors.textDim}>
                  {t(`awards.${award.id}.detail`, {
                    count: award.value ?? 0,
                    time: formatDuration(award.value ?? 0),
                  })}
                </AppText>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function AvatarOrWreck({ player, identity, session, endedAt }: { player: Player; identity: AvatarIdentity; session: Session; endedAt: number }) {
  const level = damageLevel(session, player, endedAt);
  if (level === 0) return <AvatarFace identity={identity} size={44} />;
  return <DamagedAvatar identity={identity} size={44} level={level} animateChanges={false} />;
}

const styles = StyleSheet.create({
  top: { marginTop: spacing.md },
  winners: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.lg, marginTop: spacing.xl + spacing.md },
  winner: { alignItems: 'center', gap: 6, maxWidth: 120 },
  fullWidth: { width: '100%' },
  loserCard: { marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm, borderWidth: 1.5, borderColor: colors.danger },
  losers: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.lg },
  loser: { alignItems: 'center', gap: 4 },
  loserBomb: { alignItems: 'center', paddingTop: spacing.xl },
  bombHint: { marginTop: 6 },
  owes: { fontSize: 18 },
  nobody: { marginTop: spacing.lg },
  section: { marginTop: spacing.xl, marginBottom: spacing.sm },
  table: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface, minHeight: 60 },
  rowMe: { borderWidth: 1.5, borderColor: colors.primary },
  rank: { fontFamily: fonts.black, fontSize: 18, width: 36, color: colors.textMuted },
  flex: { flex: 1 },
  skull: { fontSize: 20, lineHeight: 24 },
  awards: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  award: { width: '48%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, gap: 2 },
  awardEmoji: { fontSize: 32, lineHeight: 40 },
});
