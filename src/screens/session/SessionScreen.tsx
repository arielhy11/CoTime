import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { Screen } from '../../components/common/Screen';
import { useGameFeedback } from '../../hooks/useGameFeedback';
import type { SessionStatus } from '../../models/Session';
import { useAuthStore } from '../../store/authStore';
import { useSessionStore } from '../../store/sessionStore';
import { colors, spacing } from '../../theme/tokens';
import { errorKeyOf } from '../../utils/errors';
import { LiveView } from './LiveView';
import { LobbyView } from './LobbyView';
import { ResultsView } from './ResultsView';

export function SessionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const myUid = useAuthStore((s) => s.uid);
  const { session, players, events, profiles, error } = useSessionStore();
  const { watch, unwatch, start, leaveLobby, rematch, joinById } = useSessionStore();
  const [actionError, setActionError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  // Did we see this game live? Then the results get the fanfare/bomb treatment.
  const seenStatuses = useRef(new Set<SessionStatus>());
  if (session) seenStatuses.current.add(session.status);
  const watchedLive = seenStatuses.current.has('live') || seenStatuses.current.has('lobby');

  useEffect(() => {
    if (!id) return;
    seenStatuses.current = new Set();
    watch(id);
    // During a rematch the new screen may already be watching — don't kill its subscription.
    return () => {
      if (useSessionStore.getState().sessionId === id) unwatch();
    };
  }, [id, watch, unwatch]);

  useGameFeedback(events, myUid, session?.status === 'live');

  if (!id || !myUid) return null;

  if (!session) {
    return (
      <Screen>
        <View style={styles.center}>
          {error ? <ErrorBanner message={t('errors.generic')} /> : <ActivityIndicator color={colors.primary} size="large" />}
        </View>
      </Screen>
    );
  }

  const isPlayer = session.playerIds.includes(myUid);
  const goToSession = (sessionId: string) => router.replace({ pathname: '/session/[id]', params: { id: sessionId } });

  // Opened a lobby link without being in it yet.
  if (!isPlayer && session.status === 'lobby') {
    return (
      <Screen>
        <View style={styles.center}>
          <AppText variant="title" center>{t('session.joinThis')}</AppText>
          <Button
            title={t('join.cta')}
            size="lg"
            isLoading={joining}
            onPress={() => {
              setJoining(true);
              joinById(session.id)
                .catch((e) => setActionError(t(errorKeyOf(e))))
                .finally(() => setJoining(false));
            }}
          />
          <ErrorBanner message={actionError} />
        </View>
      </Screen>
    );
  }

  if (session.status === 'lobby') {
    return (
      <LobbyView
        session={session}
        players={players}
        profiles={profiles}
        myUid={myUid}
        errorMessage={actionError}
        onStart={async () => {
          setActionError(null);
          try {
            await start();
          } catch (e) {
            setActionError(t(errorKeyOf(e)));
          }
        }}
        onLeave={async () => {
          try {
            await leaveLobby();
          } finally {
            router.replace('/');
          }
        }}
      />
    );
  }

  if (session.status === 'live') {
    if (!isPlayer) {
      return (
        <Screen>
          <View style={styles.center}>
            <AppText variant="title" center>{t('session.alreadyStarted')}</AppText>
            <Button title={t('results.home')} onPress={() => router.replace('/')} />
          </View>
        </Screen>
      );
    }
    return <LiveView session={session} players={players} profiles={profiles} events={events} myUid={myUid} />;
  }

  // Finished — but a lobby the host walked out of never started.
  if (session.startsAt === null) {
    return (
      <Screen>
        <View style={styles.center}>
          <AppText style={styles.emoji} center>🫠</AppText>
          <AppText variant="title" center>{t('session.cancelled')}</AppText>
          <Button title={t('results.home')} onPress={() => router.replace('/')} />
        </View>
      </Screen>
    );
  }

  return (
    <ResultsView
      session={session}
      players={players}
      profiles={profiles}
      myUid={myUid}
      live={watchedLive}
      onRematch={async () => goToSession(await rematch())}
      onJoinRematch={async () => {
        const next = session.rematchSessionId;
        if (!next) return;
        await joinById(next);
        goToSession(next);
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: spacing.md },
  emoji: { fontSize: 64, lineHeight: 76 },
});
