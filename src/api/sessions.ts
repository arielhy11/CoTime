import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
  type Transaction,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { MAX_PLAYERS, PLACE_GRACE_MS } from '../game/modes';
import {
  applyNeverPlaced,
  applyPickup,
  applyPutdown,
  applyTimeBankExpiry,
  isTimeUp,
  type FinishOutcome,
  type RuleOutcome,
} from '../game/rules';
import { generateSessionCode } from '../game/sessionCode';
import type { GameEvent } from '../models/GameEvent';
import type { Player } from '../models/Player';
import type { Session } from '../models/Session';
import { parseGameEvent, parsePlayer, parseSession } from './parse';
import { eventDoc, finishPatch, newPlayerDoc, newSessionDoc, startPatch, type NewGameOptions } from './sessionDocs';

export const SESSIONS_COLLECTION = 'sessions' as const;
const PLAYERS_SUBCOLLECTION = 'players' as const;
const EVENTS_SUBCOLLECTION = 'events' as const;
const EVENT_FEED_LIMIT = 40;
const HISTORY_LIMIT = 20;
const CODE_ATTEMPTS = 6;

export type SessionErrorCode =
  | 'SESSION_NOT_FOUND'
  | 'GAME_ALREADY_STARTED'
  | 'GAME_FULL'
  | 'NOT_HOST'
  | 'CODE_GENERATION_FAILED';

export class SessionError extends Error {
  constructor(public readonly code: SessionErrorCode) {
    super(code);
    this.name = 'SessionError';
  }
}

const sessionRef = (sessionId: string) => doc(db, SESSIONS_COLLECTION, sessionId);
const playersCol = (sessionId: string) => collection(db, SESSIONS_COLLECTION, sessionId, PLAYERS_SUBCOLLECTION);
const playerRef = (sessionId: string, uid: string) => doc(playersCol(sessionId), uid);
const eventsCol = (sessionId: string) => collection(db, SESSIONS_COLLECTION, sessionId, EVENTS_SUBCOLLECTION);

// ─── Lobby ──────────────────────────────────────────────────────────────────

async function isCodeInUse(code: string): Promise<boolean> {
  const snap = await getDocs(
    query(collection(db, SESSIONS_COLLECTION), where('code', '==', code), where('status', '==', 'lobby'), limit(1))
  );
  return !snap.empty;
}

async function uniqueLobbyCode(): Promise<string> {
  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
    const code = generateSessionCode();
    if (!(await isCodeInUse(code))) return code;
  }
  throw new SessionError('CODE_GENERATION_FAILED');
}

/** Creates the game with the host already seated. Returns the session id. */
export async function createSession(hostId: string, hostName: string, options: NewGameOptions): Promise<string> {
  const code = await uniqueLobbyCode();
  const now = Date.now();
  const ref = doc(collection(db, SESSIONS_COLLECTION));
  const batch = writeBatch(db);
  batch.set(ref, newSessionDoc(hostId, code, options, now));
  batch.set(playerRef(ref.id, hostId), newPlayerDoc(hostName, now));
  batch.set(doc(eventsCol(ref.id)), eventDoc('joined', hostId, now));
  await batch.commit();
  return ref.id;
}

export async function findLobbyByCode(code: string): Promise<Session | null> {
  const snap = await getDocs(
    query(collection(db, SESSIONS_COLLECTION), where('code', '==', code), where('status', '==', 'lobby'), limit(1))
  );
  const first = snap.docs[0];
  return first ? parseSession(first.id, first.data()) : null;
}

export async function joinSession(sessionId: string, uid: string, name: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(sessionRef(sessionId));
    if (!snap.exists()) throw new SessionError('SESSION_NOT_FOUND');
    const session = parseSession(snap.id, snap.data());
    if (session.playerIds.includes(uid)) return;
    if (session.status !== 'lobby') throw new SessionError('GAME_ALREADY_STARTED');
    if (session.playerIds.length >= MAX_PLAYERS) throw new SessionError('GAME_FULL');
    const now = Date.now();
    tx.update(sessionRef(sessionId), { playerIds: arrayUnion(uid), aliveIds: arrayUnion(uid) });
    tx.set(playerRef(sessionId, uid), newPlayerDoc(name, now));
    tx.set(doc(eventsCol(sessionId)), eventDoc('joined', uid, now));
  });
}

/** Non-host leaves the lobby. The host leaving cancels the game instead. */
export async function leaveLobby(sessionId: string, uid: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(sessionRef(sessionId));
    if (!snap.exists()) return;
    const session = parseSession(snap.id, snap.data());
    if (session.status !== 'lobby') return;
    if (session.hostId === uid) {
      tx.update(sessionRef(sessionId), { status: 'finished', endedAt: Date.now(), endReason: 'hostEnded' });
      return;
    }
    tx.update(sessionRef(sessionId), { playerIds: arrayRemove(uid), aliveIds: arrayRemove(uid) });
    tx.delete(playerRef(sessionId, uid));
  });
}

export async function startSession(sessionId: string, uid: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(sessionRef(sessionId));
    if (!snap.exists()) throw new SessionError('SESSION_NOT_FOUND');
    const session = parseSession(snap.id, snap.data());
    if (session.hostId !== uid) throw new SessionError('NOT_HOST');
    if (session.status !== 'lobby') return;
    tx.update(sessionRef(sessionId), startPatch(session, Date.now()));
  });
}

export async function setRematch(sessionId: string, rematchSessionId: string): Promise<void> {
  await updateDoc(sessionRef(sessionId), { rematchSessionId });
}

// ─── Live game ──────────────────────────────────────────────────────────────

async function readPlayers(tx: Transaction, sessionId: string, uids: string[]): Promise<Player[]> {
  const snaps = await Promise.all(uids.map((id) => tx.get(playerRef(sessionId, id))));
  return snaps.filter((s) => s.exists()).map((s) => parsePlayer(s.id, s.data() as Record<string, unknown>));
}

async function readSessionAndPlayer(tx: Transaction, sessionId: string, uid: string) {
  const [sSnap, pSnap] = await Promise.all([tx.get(sessionRef(sessionId)), tx.get(playerRef(sessionId, uid))]);
  if (!sSnap.exists() || !pSnap.exists()) throw new SessionError('SESSION_NOT_FOUND');
  return {
    session: parseSession(sSnap.id, sSnap.data()),
    player: parsePlayer(pSnap.id, pSnap.data()),
  };
}

type EventSpec = Pick<GameEvent, 'type' | 'at'> & { pickupNumber?: number; holdMs?: number };

/** Writes a rule outcome: player patch, session alive list, finish, and events. */
async function commitOutcome(
  tx: Transaction,
  session: Session,
  player: Player,
  outcome: RuleOutcome,
  now: number,
  events: EventSpec[]
): Promise<void> {
  let finish: ReturnType<typeof finishPatch> | null = null;
  if (outcome.finish) {
    const others = await readPlayers(tx, session.id, session.playerIds.filter((id) => id !== player.uid));
    finish = finishPatch(session.mode, [{ ...player, ...outcome.playerPatch }, ...others], outcome.finish, now);
  }
  // All reads are done — writes from here on.
  tx.update(playerRef(session.id, player.uid), outcome.playerPatch);
  if (outcome.eliminated || finish) {
    tx.update(sessionRef(session.id), { aliveIds: outcome.aliveIds, ...(finish ?? {}) });
  }
  const allEvents: EventSpec[] = outcome.eliminated
    ? [...events, { type: 'eliminated', at: outcome.playerPatch.outAt ?? now }]
    : events;
  for (const e of allEvents) {
    tx.set(doc(eventsCol(session.id)), eventDoc(e.type, player.uid, e.at, e));
  }
}

export async function recordPlaced(sessionId: string, uid: string): Promise<void> {
  const ref = playerRef(sessionId, uid);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().isPlaced === true) return;
  const batch = writeBatch(db);
  batch.update(ref, { isPlaced: true });
  batch.set(doc(eventsCol(sessionId)), eventDoc('placed', uid, Date.now()));
  await batch.commit();
}

/** The phone left the table. Returns the outcome (null = didn't count). */
export async function recordPickup(sessionId: string, uid: string, at: number): Promise<RuleOutcome | null> {
  return runTransaction(db, async (tx) => {
    const { session, player } = await readSessionAndPlayer(tx, sessionId, uid);
    const outcome = applyPickup(session, player, at);
    if (!outcome) return null;
    await commitOutcome(tx, session, player, outcome, at, [
      { type: 'pickup', at, pickupNumber: outcome.playerPatch.pickupCount },
    ]);
    return outcome;
  });
}

export async function recordPutdown(sessionId: string, uid: string, at: number): Promise<RuleOutcome | null> {
  return runTransaction(db, async (tx) => {
    const { session, player } = await readSessionAndPlayer(tx, sessionId, uid);
    const outcome = applyPutdown(session, player, at);
    if (!outcome) return null;
    const holdMs = player.holdingSince === null ? 0 : at - player.holdingSince;
    await commitOutcome(tx, session, player, outcome, at, [{ type: 'putdown', at, holdMs }]);
    return outcome;
  });
}

/** Any phone may knock out a Time Bank player whose bank ran dry. */
export async function expireTimeBank(sessionId: string, uid: string, now: number): Promise<RuleOutcome | null> {
  return runTransaction(db, async (tx) => {
    const { session, player } = await readSessionAndPlayer(tx, sessionId, uid);
    const outcome = applyTimeBankExpiry(session, player, now);
    if (!outcome) return null;
    await commitOutcome(tx, session, player, outcome, now, []);
    return outcome;
  });
}

/** Any phone may count a pickup for a player whose phone never reached the table. */
export async function flagNeverPlaced(sessionId: string, uid: string, now: number): Promise<RuleOutcome | null> {
  return runTransaction(db, async (tx) => {
    const { session, player } = await readSessionAndPlayer(tx, sessionId, uid);
    const outcome = applyNeverPlaced(session, player, now, PLACE_GRACE_MS);
    if (!outcome) return null;
    const at = outcome.playerPatch.holdingSince ?? now;
    await commitOutcome(tx, session, player, outcome, at, [
      { type: 'pickup', at, pickupNumber: outcome.playerPatch.pickupCount },
    ]);
    return outcome;
  });
}

/** Ends a live game (timer ran out, or the host called it). Idempotent. */
export async function finishSession(sessionId: string, reason: 'timeUp' | 'hostEnded', now: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(sessionRef(sessionId));
    if (!snap.exists()) throw new SessionError('SESSION_NOT_FOUND');
    const session = parseSession(snap.id, snap.data());
    if (session.status !== 'live') return;
    if (reason === 'timeUp' && !isTimeUp(session, now)) return;
    const at = reason === 'timeUp' && session.endsAt !== null ? session.endsAt : now;
    const players = await readPlayers(tx, sessionId, session.playerIds);
    const finish: FinishOutcome = { endReason: reason, loserId: null, winnerId: null };
    tx.update(sessionRef(sessionId), finishPatch(session.mode, players, finish, at));
  });
}

// ─── Subscriptions & history ────────────────────────────────────────────────

export function subscribeToSession(sessionId: string, onData: (s: Session | null) => void, onError: (e: Error) => void): () => void {
  return onSnapshot(
    sessionRef(sessionId),
    (snap) => onData(snap.exists() ? parseSession(snap.id, snap.data()) : null),
    onError
  );
}

export function subscribeToPlayers(sessionId: string, onData: (players: Player[]) => void, onError: (e: Error) => void): () => void {
  return onSnapshot(
    playersCol(sessionId),
    (snap) => onData(snap.docs.map((d) => parsePlayer(d.id, d.data()))),
    onError
  );
}

export function subscribeToEvents(sessionId: string, onData: (events: GameEvent[]) => void, onError: (e: Error) => void): () => void {
  return onSnapshot(
    query(eventsCol(sessionId), orderBy('at', 'desc'), limit(EVENT_FEED_LIMIT)),
    (snap) => onData(snap.docs.map((d) => parseGameEvent(d.id, d.data()))),
    onError
  );
}

export async function listRecentSessions(uid: string): Promise<Session[]> {
  const snap = await getDocs(
    query(
      collection(db, SESSIONS_COLLECTION),
      where('playerIds', 'array-contains', uid),
      orderBy('createdAt', 'desc'),
      limit(HISTORY_LIMIT)
    )
  );
  return snap.docs.map((d) => parseSession(d.id, d.data()));
}

