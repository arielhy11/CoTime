import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { PLACE_GRACE_MS } from '../../game/modes';
import { isGameRunning, isInCountdown } from '../../game/rules';
import { useNow } from '../../hooks/useNow';
import { usePickupDetector } from '../../hooks/usePickupDetector';
import type { GameEvent } from '../../models/GameEvent';
import type { Player } from '../../models/Player';
import type { Session } from '../../models/Session';
import type { User } from '../../models/User';
import { buzzBusted, buzzSuccess } from '../../services/haptics';
import { playSound } from '../../services/sound';
import { useSessionStore } from '../../store/sessionStore';
import { colors } from '../../theme/tokens';
import { BustedPanel, CountdownPanel, PlacePromptPanel, TablePanel, type TableData } from './LivePanels';

interface LiveViewProps {
  session: Session;
  players: Player[];
  profiles: Record<string, User>;
  events: GameEvent[];
  myUid: string;
}

const TICK_MS = 250;
const KEEP_AWAKE_TAG = 'cotime-live';
/** Wait this long after a mount before trusting "never placed" (sensor needs ~1.2s to settle). */
const REMOUNT_GRACE_MS = 5000;
const COUNTDOWN_TICK_FROM_SECONDS = 5;

/**
 * The game itself. Watches this phone's sensors, reports pickups and
 * putdowns, and shows whichever panel fits: countdown, the quiet table,
 * or the red "BUSTED" screen.
 */
export function LiveView({ session, players, profiles, events, myUid }: LiveViewProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const now = useNow(TICK_MS);
  const reportPlaced = useSessionStore((s) => s.reportPlaced);
  const reportPickup = useSessionStore((s) => s.reportPickup);
  const reportPutdown = useSessionStore((s) => s.reportPutdown);
  const checkClock = useSessionStore((s) => s.checkClock);
  const endGame = useSessionStore((s) => s.endGame);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const me = players.find((p) => p.uid === myUid) ?? null;
  const meRef = useRef(me);
  meRef.current = me;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const graceHandled = useRef(false);
  const mountedAt = useRef(Date.now());
  const pendingWrites = useSessionStore((s) => s.pendingWrites);

  // Screen must stay on while the phone lies face down (web may refuse: fine).
  useEffect(() => {
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    return () => {
      void Promise.resolve(deactivateKeepAwake(KEEP_AWAKE_TAG)).catch(() => undefined);
    };
  }, []);

  const busted = (at: number) => {
    const current = meRef.current;
    if (!current || current.isOut || !isGameRunning(sessionRef.current, at)) return;
    reportPickup(at);
    playSound('alarm');
    buzzBusted();
  };

  const detector = usePickupDetector(true, {
    onArmed: (at) => {
      // Re-armed after a remount while the server still thinks we're holding.
      if (meRef.current?.isHolding) reportPutdown(at);
      reportPlaced();
      buzzSuccess();
    },
    onPickup: (_reason, at) => busted(at),
    onPutdown: (at) => {
      reportPutdown(at);
      buzzSuccess();
    },
  });

  const running = isGameRunning(session, now);
  const countdown = isInCountdown(session, now);

  // Time-up and empty time banks — any phone at the table may call it.
  useEffect(() => {
    checkClock(now);
  }, [now, checkClock]);

  // Countdown ticks and the "go" sound.
  const secondsLeft = session.startsAt !== null ? Math.ceil((session.startsAt - now) / 1000) : 0;
  const lastSecond = useRef<number | null>(null);
  useEffect(() => {
    if (lastSecond.current === secondsLeft) return;
    lastSecond.current = secondsLeft;
    if (secondsLeft > 0 && secondsLeft <= COUNTDOWN_TICK_FROM_SECONDS) playSound('tick');
    if (secondsLeft === 0) playSound('go');
  }, [secondsLeft]);

  // Picked up during the countdown and still holding when it hits zero: that's a pickup.
  const wasRunning = useRef(running);
  useEffect(() => {
    const started = running && !wasRunning.current;
    wasRunning.current = running;
    if (started && detector.phase === 'up') busted(now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Never put it down? After the grace period that counts as a pickup.
  useEffect(() => {
    if (detector.phase === 'down') {
      graceHandled.current = true;
      return;
    }
    if (graceHandled.current || !running || !me || me.isOut || session.startsAt === null) return;
    const deadline = Math.max(session.startsAt + PLACE_GRACE_MS, mountedAt.current + REMOUNT_GRACE_MS);
    if (now < deadline) return;
    graceHandled.current = true;
    if (detector.phase === 'waiting') detector.neverPlaced();
    else busted(now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, detector.phase, running]);

  // A putdown that never reached the server (offline too long): resend it.
  const lastResync = useRef(0);
  useEffect(() => {
    if (detector.phase !== 'down' || !me?.isHolding || pendingWrites > 0) return;
    if (now - lastResync.current < 5000) return;
    lastResync.current = now;
    reportPutdown(now);
  }, [now, detector.phase, me?.isHolding, pendingWrites, reportPutdown]);

  // Android back button: no sneaking out of a running game.
  const { touchPickup } = detector;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isGameRunning(sessionRef.current, Date.now())) touchPickup();
      return true;
    });
    return () => sub.remove();
  }, [touchPickup]);

  if (!me) return null;

  const data: TableData = { session, players, profiles, events, myUid, now };
  const placed = detector.phase === 'down';
  const isHost = session.hostId === myUid;

  let panel;
  if (countdown) {
    panel = <CountdownPanel data={data} sensorsAvailable={detector.sensorsAvailable} placed={placed} onPlaceManually={detector.placeManually} />;
  } else if (detector.phase === 'up') {
    panel = (
      <BustedPanel
        data={data}
        me={me}
        sensorsAvailable={detector.sensorsAvailable}
        onPutBack={detector.placeManually}
        isHost={isHost}
        onEndGame={() => setConfirmEnd(true)}
      />
    );
  } else if (detector.phase === 'waiting' && !me.isOut && !graceHandled.current) {
    panel = <PlacePromptPanel data={data} sensorsAvailable={detector.sensorsAvailable} onPlaceManually={detector.placeManually} />;
  } else {
    panel = <TablePanel data={data} />;
  }

  // Touching the screen while the phone is down counts as picking it up.
  const touchable = running && placed;

  return (
    <View style={[styles.fill, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: placed && running ? colors.black : colors.background }]}>
      <Pressable style={styles.fill} disabled={!touchable} onPressIn={detector.touchPickup} accessibilityLabel={t('live.touchWarning')}>
        {panel}
      </Pressable>
      <ConfirmModal
        visible={confirmEnd}
        title={t('live.endGameTitle')}
        message={t('live.endGameMessage')}
        confirmLabel={t('live.endGame')}
        cancelLabel={t('common.cancel')}
        danger
        onConfirm={() => {
          setConfirmEnd(false);
          void endGame().catch((e) => console.error('Ending game failed:', e instanceof Error ? e.message : e));
        }}
        onCancel={() => setConfirmEnd(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
