import { create } from 'zustand';
import {
  createSession,
  expireTimeBank,
  findLobbyByCode,
  finishSession,
  flagNeverPlaced,
  joinSession,
  leaveLobby,
  recordPickup,
  recordPlaced,
  recordPutdown,
  SessionError,
  setRematch,
  startSession,
  subscribeToEvents,
  subscribeToPlayers,
  subscribeToSession,
} from '../api/sessions';
import type { NewGameOptions } from '../api/sessionDocs';
import { getUsersByIds } from '../api/users';
import { PLACE_GRACE_MS } from '../game/modes';
import { effectiveOffTableMs, isGameRunning, isTimeUp, timeBankMs } from '../game/rules';
import type { GameEvent } from '../models/GameEvent';
import type { Player } from '../models/Player';
import type { Session } from '../models/Session';
import type { User } from '../models/User';
import { errorMessageOf } from '../utils/errors';
import { useAuthStore } from './authStore';

const WRITE_RETRIES = 8;
const RETRY_BASE_MS = 600;
const RETRY_MAX_MS = 8000;
/** Give a player's own phone first go at reporting before others flag them. */
const NEVER_PLACED_MARGIN_MS = 8000;
/** Don't let every phone at the table fire the same clock transaction every tick. */
const CLOCK_CHECK_THROTTLE_MS = 3000;

interface SessionState {
  sessionId: string | null;
  session: Session | null;
  players: Player[];
  events: GameEvent[];
  /** Profiles (name + photo) for everyone who has been at this table. */
  profiles: Record<string, User>;
  error: string | null;
  /** Pickup/putdown writes queued or in flight. */
  pendingWrites: number;

  watch: (sessionId: string) => void;
  unwatch: () => void;

  createGame: (options: NewGameOptions) => Promise<string>;
  joinByCode: (code: string) => Promise<string>;
  joinById: (sessionId: string) => Promise<void>;
  start: () => Promise<void>;
  leaveLobby: () => Promise<void>;
  endGame: () => Promise<void>;
  rematch: () => Promise<string>;

  reportPlaced: () => void;
  reportPickup: (at: number) => void;
  reportPutdown: (at: number) => void;
  checkClock: (now: number) => void;
}

let unsubscribers: (() => void)[] = [];
let writeChain: Promise<unknown> = Promise.resolve();
const loadingProfiles = new Set<string>();
const lastClockCheck = new Map<string, number>();

function me(): { uid: string; name: string } {
  const { uid, profile } = useAuthStore.getState();
  if (!uid || !profile) {
    throw new Error('Must have a profile to play');
  }
  return { uid, name: profile.name };
}

function requireSessionId(id: string | null): string {
  if (!id) throw new Error('No active game');
  return id;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Pickups and putdowns must land in order and must survive a flaky
 * connection (or the app being backgrounded mid-write), so they go through
 * one serial queue with retries. The rules are idempotent, so a retry that
 * already landed is a no-op.
 */
function enqueueWrite(label: string, write: () => Promise<unknown>): void {
  useSessionStore.setState((s) => ({ pendingWrites: s.pendingWrites + 1 }));
  writeChain = writeChain.then(async () => {
    try {
      for (let attempt = 0; attempt < WRITE_RETRIES; attempt += 1) {
        try {
          await write();
          return;
        } catch (error) {
          if (error instanceof SessionError) {
            console.error(`${label} rejected:`, error.code);
            return;
          }
          console.error(`${label} failed (attempt ${attempt + 1}):`, errorMessageOf(error));
          await sleep(Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** attempt));
        }
      }
      useSessionStore.setState({ error: `${label} could not be saved` });
    } finally {
      useSessionStore.setState((s) => ({ pendingWrites: Math.max(0, s.pendingWrites - 1) }));
    }
  });
}

function throttled(key: string, now: number): boolean {
  const last = lastClockCheck.get(key) ?? 0;
  if (now - last < CLOCK_CHECK_THROTTLE_MS) return true;
  lastClockCheck.set(key, now);
  return false;
}

async function loadMissingProfiles(uids: string[]): Promise<void> {
  const known = useSessionStore.getState().profiles;
  const missing = uids.filter((id) => !known[id] && !loadingProfiles.has(id));
  if (missing.length === 0) return;
  missing.forEach((id) => loadingProfiles.add(id));
  try {
    const users = await getUsersByIds(missing);
    useSessionStore.setState((state) => ({
      profiles: { ...state.profiles, ...Object.fromEntries(users.map((u) => [u.uid, u])) },
    }));
  } catch (error) {
    console.error('Loading player profiles failed:', errorMessageOf(error));
  } finally {
    missing.forEach((id) => loadingProfiles.delete(id));
  }
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessionId: null,
  session: null,
  players: [],
  events: [],
  profiles: {},
  error: null,
  pendingWrites: 0,

  watch: (sessionId) => {
    if (get().sessionId === sessionId && unsubscribers.length > 0) return;
    get().unwatch();
    set({ sessionId, session: null, players: [], events: [], error: null });
    const onError = (error: Error) => {
      console.error('Game subscription error:', error.message);
      set({ error: error.message });
    };
    unsubscribers = [
      subscribeToSession(sessionId, (session) => {
        set({ session });
        if (session) void loadMissingProfiles(session.playerIds);
      }, onError),
      subscribeToPlayers(sessionId, (players) => {
        set({ players: [...players].sort((a, b) => a.joinedAt - b.joinedAt) });
        void loadMissingProfiles(players.map((p) => p.uid));
      }, onError),
      subscribeToEvents(sessionId, (events) => set({ events }), onError),
    ];
  },

  unwatch: () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    unsubscribers = [];
    lastClockCheck.clear();
    set({ sessionId: null, session: null, players: [], events: [] });
  },

  createGame: async (options) => {
    const { uid, name } = me();
    return createSession(uid, name, options);
  },

  joinByCode: async (code) => {
    const { uid, name } = me();
    const session = await findLobbyByCode(code);
    if (!session) throw new SessionError('SESSION_NOT_FOUND');
    await joinSession(session.id, uid, name);
    return session.id;
  },

  joinById: async (sessionId) => {
    const { uid, name } = me();
    await joinSession(sessionId, uid, name);
  },

  start: async () => {
    const { uid } = me();
    await startSession(requireSessionId(get().sessionId), uid);
  },

  leaveLobby: async () => {
    const { uid } = me();
    await leaveLobby(requireSessionId(get().sessionId), uid);
  },

  endGame: async () => {
    await finishSession(requireSessionId(get().sessionId), 'hostEnded', Date.now());
  },

  rematch: async () => {
    const session = get().session;
    if (!session) throw new Error('No active game');
    const newId = await get().createGame({
      mode: session.mode,
      stake: session.stake,
      durationMinutes: session.durationMinutes,
      lives: session.lives,
      timeBankSeconds: session.timeBankSeconds,
    });
    await setRematch(session.id, newId);
    return newId;
  },

  reportPlaced: () => {
    const sessionId = requireSessionId(get().sessionId);
    const { uid } = me();
    enqueueWrite('Placing phone', () => recordPlaced(sessionId, uid));
  },

  reportPickup: (at) => {
    const sessionId = requireSessionId(get().sessionId);
    const { uid } = me();
    enqueueWrite('Pickup', () => recordPickup(sessionId, uid, at));
  },

  reportPutdown: (at) => {
    const sessionId = requireSessionId(get().sessionId);
    const { uid } = me();
    enqueueWrite('Putdown', () => recordPutdown(sessionId, uid, at));
  },

  /** Called every second by each phone at the table: time-up and empty time banks. */
  checkClock: (now) => {
    const { session, players } = get();
    if (!session || session.status !== 'live') return;

    if (isTimeUp(session, now) && !throttled('timeUp', now)) {
      void finishSession(session.id, 'timeUp', now).catch((error) =>
        console.error('Finishing game failed:', errorMessageOf(error))
      );
    }

    // Players whose phone never made it to the table (left the screen, never opened it).
    if (isGameRunning(session, now) && session.startsAt !== null && now >= session.startsAt + PLACE_GRACE_MS + NEVER_PLACED_MARGIN_MS) {
      for (const player of players) {
        if (player.isPlaced || player.isHolding || player.isOut) continue;
        if (throttled(`unplaced:${player.uid}`, now)) continue;
        void flagNeverPlaced(session.id, player.uid, now).catch((error) =>
          console.error('Flagging unplaced player failed:', errorMessageOf(error))
        );
      }
    }

    if (session.mode === 'timeBank') {
      const bank = timeBankMs(session);
      for (const player of players) {
        if (player.isOut || !player.isHolding) continue;
        if (effectiveOffTableMs(player, now) < bank) continue;
        if (throttled(`bank:${player.uid}`, now)) continue;
        void expireTimeBank(session.id, player.uid, now).catch((error) =>
          console.error('Time bank expiry failed:', errorMessageOf(error))
        );
      }
    }
  },
}));
