import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DamagedAvatar } from '../../components/avatar/DamagedAvatar';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { EventFeed } from '../../components/game/EventFeed';
import { TableRing } from '../../components/game/TableRing';
import { damageLevel, livesLeft } from '../../game/damage';
import { getMode, PLACE_GRACE_MS } from '../../game/modes';
import { timeBankRemainingMs } from '../../game/rules';
import { currentLeaderIds } from '../../game/standings';
import { formatClock } from '../../game/time';
import type { GameEvent } from '../../models/GameEvent';
import type { Player } from '../../models/Player';
import type { Session } from '../../models/Session';
import type { User } from '../../models/User';
import { playSound } from '../../services/sound';
import { buzzExplosion } from '../../services/haptics';
import { colors, fonts, spacing } from '../../theme/tokens';

export interface TableData {
  session: Session;
  players: Player[];
  profiles: Record<string, User>;
  events: GameEvent[];
  myUid: string;
  now: number;
}

function useDiameter(): number {
  const { width } = useWindowDimensions();
  return Math.min(width - spacing.md * 2, 400);
}

function fallbackNames(players: Player[]): Record<string, string> {
  return Object.fromEntries(players.map((p) => [p.uid, p.name]));
}

// ─── Countdown: "phones down in 7…" ────────────────────────────────────────

export function CountdownPanel({ data, sensorsAvailable, placed, onPlaceManually }: {
  data: TableData;
  sensorsAvailable: boolean | null;
  placed: boolean;
  onPlaceManually: () => void;
}) {
  const { t } = useTranslation();
  const diameter = useDiameter();
  const { session, players, now } = data;
  const secondsLeft = Math.max(0, Math.ceil(((session.startsAt ?? now) - now) / 1000));
  const placedCount = players.filter((p) => p.isPlaced).length;

  return (
    <View style={styles.center}>
      <AppText variant="label" center color={colors.gold}>{t('live.countdownLabel')}</AppText>
      <AppText style={styles.countdown} center>{secondsLeft}</AppText>
      <AppText variant="title" center>{placed ? t('live.lockedIn') : t('live.putItDown')}</AppText>
      <AppText center color={colors.textMuted}>{t('live.putItDownHint')}</AppText>
      <View style={styles.spacer} />
      <TableRing
        session={session}
        players={players}
        profiles={data.profiles}
        now={now}
        diameter={diameter * 0.8}
        myUid={data.myUid}
      >
        <AppText variant="bold" center>{t('live.phonesDown', { placed: placedCount, total: players.length })}</AppText>
      </TableRing>
      {sensorsAvailable === false && !placed ? (
        <Button title={t('live.placeManually')} variant="zen" onPress={onPlaceManually} style={styles.manual} />
      ) : null}
    </View>
  );
}

// ─── Not placed after the start: hurry up ──────────────────────────────────

export function PlacePromptPanel({ data, sensorsAvailable, onPlaceManually }: {
  data: TableData;
  sensorsAvailable: boolean | null;
  onPlaceManually: () => void;
}) {
  const { t } = useTranslation();
  const graceLeft = Math.max(0, (data.session.startsAt ?? data.now) + PLACE_GRACE_MS - data.now);
  return (
    <View style={styles.center}>
      <AppText style={styles.bigEmoji} center>⏰</AppText>
      <AppText variant="display" center color={colors.danger}>{t('live.hurry')}</AppText>
      <AppText variant="title" center>{t('live.putItDown')}</AppText>
      <AppText center color={colors.textMuted}>{t('live.graceLeft', { seconds: Math.ceil(graceLeft / 1000) })}</AppText>
      {sensorsAvailable === false ? (
        <Button title={t('live.placeManually')} variant="zen" onPress={onPlaceManually} style={styles.manual} />
      ) : null}
    </View>
  );
}

// ─── Phone is down: the quiet table ────────────────────────────────────────

export function TablePanel({ data }: { data: TableData }) {
  const { t } = useTranslation();
  const diameter = useDiameter();
  const { session, players, now } = data;
  const mode = getMode(session.mode);
  const clock = session.endsAt !== null ? formatClock(session.endsAt - now) : formatClock(now - (session.startsAt ?? now));
  const leaders = currentLeaderIds(session.mode, players, now);

  return (
    <View style={styles.center}>
      <AppText variant="label" center color={colors.zen}>{t('live.lockedIn')}</AppText>
      <TableRing
        session={session}
        players={players}
        profiles={data.profiles}
        now={now}
        diameter={diameter}
        myUid={data.myUid}
        leaderIds={leaders}
      >
        <AppText style={styles.tableEmoji} center>{mode.emoji}</AppText>
        <AppText style={styles.clock} center>{clock}</AppText>
        <AppText variant="caption" center>{session.endsAt !== null ? t('live.timeLeft') : t('live.elapsed')}</AppText>
      </TableRing>
      <AppText variant="caption" center style={styles.touchHint}>{t('live.touchWarning')}</AppText>
      <View style={styles.feed}>
        <EventFeed events={data.events} profiles={data.profiles} fallbackNames={fallbackNames(players)} max={4} include={['pickup', 'eliminated', 'putdown']} />
      </View>
    </View>
  );
}

// ─── You picked it up ───────────────────────────────────────────────────────

export function BustedPanel({ data, me, sensorsAvailable, onPutBack, isHost, onEndGame }: {
  data: TableData;
  me: Player;
  sensorsAvailable: boolean | null;
  onPutBack: () => void;
  isHost: boolean;
  onEndGame: () => void;
}) {
  const { t } = useTranslation();
  const { session, now, players } = data;
  const profile = data.profiles[me.uid];
  const identity = { uid: me.uid, name: profile?.name ?? me.name, photoURL: profile?.photoURL ?? null };
  const heldFor = me.isHolding && me.holdingSince !== null ? now - me.holdingSince : 0;

  let status: string;
  if (me.isOut) {
    status = t('live.youreOut');
  } else if (session.mode === 'threeStrikes') {
    status = t('live.livesLeft', { count: livesLeft(session.lives, me.pickupCount) });
  } else if (session.mode === 'timeBank') {
    status = t('live.bankLeft', { time: formatClock(timeBankRemainingMs(session, me, now)) });
  } else {
    status = t('live.pickupNumber', { count: me.pickupCount });
  }

  return (
    <View style={[styles.center, styles.busted]}>
      <AppText style={styles.bustedTitle} center>{me.isOut ? t('live.boom') : t('live.busted')}</AppText>
      <View style={styles.bigAvatar}>
        <DamagedAvatar
          identity={identity}
          size={190}
          level={damageLevel(session, me, now)}
          holding={me.isHolding && !me.isOut}
          onExplode={() => {
            playSound('boom');
            buzzExplosion();
          }}
        />
      </View>
      <AppText variant="title" center>{status}</AppText>
      {!me.isOut ? (
        <>
          <AppText center color={colors.text} style={styles.heldFor}>{t('live.heldFor', { time: formatClock(heldFor) })}</AppText>
          <AppText variant="bold" center color={colors.gold}>{t('live.putItBack')}</AppText>
        </>
      ) : (
        <AppText center color={colors.textMuted}>{t('live.outHint')}</AppText>
      )}
      {sensorsAvailable === false && !me.isOut ? (
        <Button title={t('live.putBackManually')} variant="zen" onPress={onPutBack} style={styles.manual} />
      ) : null}
      <View style={styles.feed}>
        <EventFeed events={data.events} profiles={data.profiles} fallbackNames={fallbackNames(players)} max={3} include={['pickup', 'eliminated']} />
      </View>
      {isHost ? <Button title={t('live.endGame')} variant="ghost" onPress={onEndGame} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  countdown: { fontFamily: fonts.black, fontSize: 120, lineHeight: 130, color: colors.primary },
  spacer: { height: spacing.md },
  manual: { marginTop: spacing.md, alignSelf: 'stretch' },
  bigEmoji: { fontSize: 72, lineHeight: 84 },
  tableEmoji: { fontSize: 28, lineHeight: 34 },
  clock: { fontFamily: fonts.black, fontSize: 34, lineHeight: 40 },
  touchHint: { marginTop: spacing.sm },
  feed: { alignSelf: 'stretch', marginTop: spacing.md },
  busted: { backgroundColor: 'rgba(255,59,92,0.12)' },
  bustedTitle: { fontFamily: fonts.black, fontSize: 56, lineHeight: 64, color: colors.danger, letterSpacing: 2 },
  bigAvatar: { marginVertical: spacing.lg },
  heldFor: { fontFamily: fonts.bold, fontSize: 20 },
});
