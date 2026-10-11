import type { GameEvent, GameEventType } from '../models/GameEvent';
import type { Player } from '../models/Player';
import type { EndReason, GameModeId, Session, SessionStatus } from '../models/Session';
import type { User } from '../models/User';

/**
 * Firestore documents → models. Fail fast on malformed data instead of
 * papering over it with defaults (one data format, no fallbacks).
 */

type Data = Record<string, unknown>;

const MODES: readonly GameModeId[] = ['suddenDeath', 'zen', 'threeStrikes', 'timeBank'];
const STATUSES: readonly SessionStatus[] = ['lobby', 'live', 'finished'];
const END_REASONS: readonly EndReason[] = ['firstPickup', 'lastStanding', 'timeUp', 'hostEnded'];
const EVENT_TYPES: readonly GameEventType[] = ['joined', 'placed', 'pickup', 'putdown', 'eliminated'];

export class MalformedDocumentError extends Error {
  constructor(collection: string, id: string, field: string) {
    super(`Malformed ${collection}/${id}: bad field "${field}"`);
    this.name = 'MalformedDocumentError';
  }
}

function reader(collection: string, id: string, data: Data) {
  const fail = (field: string): never => {
    throw new MalformedDocumentError(collection, id, field);
  };
  return {
    str(field: string): string {
      const v = data[field];
      return typeof v === 'string' ? v : fail(field);
    },
    num(field: string): number {
      const v = data[field];
      return typeof v === 'number' && Number.isFinite(v) ? v : fail(field);
    },
    bool(field: string): boolean {
      const v = data[field];
      return typeof v === 'boolean' ? v : fail(field);
    },
    numOrNull(field: string): number | null {
      const v = data[field];
      if (v === null) return null;
      return typeof v === 'number' && Number.isFinite(v) ? v : fail(field);
    },
    strOrNull(field: string): string | null {
      const v = data[field];
      if (v === null) return null;
      return typeof v === 'string' ? v : fail(field);
    },
    strArray(field: string): string[] {
      const v = data[field];
      return Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]) : fail(field);
    },
    oneOf<T extends string>(field: string, allowed: readonly T[]): T {
      const v = data[field];
      return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fail(field);
    },
    oneOfOrNull<T extends string>(field: string, allowed: readonly T[]): T | null {
      const v = data[field];
      if (v === null) return null;
      return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fail(field);
    },
  };
}

export function parseUser(id: string, data: Data): User {
  const r = reader('users', id, data);
  return {
    uid: id,
    name: r.str('name'),
    photoURL: r.strOrNull('photoURL'),
    createdAt: r.num('createdAt'),
  };
}

export function parseSession(id: string, data: Data): Session {
  const r = reader('sessions', id, data);
  return {
    id,
    code: r.str('code'),
    hostId: r.str('hostId'),
    mode: r.oneOf('mode', MODES),
    status: r.oneOf('status', STATUSES),
    stake: r.str('stake'),
    durationMinutes: r.numOrNull('durationMinutes'),
    lives: r.num('lives'),
    timeBankSeconds: r.num('timeBankSeconds'),
    playerIds: r.strArray('playerIds'),
    aliveIds: r.strArray('aliveIds'),
    createdAt: r.num('createdAt'),
    startsAt: r.numOrNull('startsAt'),
    endsAt: r.numOrNull('endsAt'),
    endedAt: r.numOrNull('endedAt'),
    endReason: r.oneOfOrNull('endReason', END_REASONS),
    loserId: r.strOrNull('loserId'),
    winnerId: r.strOrNull('winnerId'),
    rankedIds: r.strArray('rankedIds'),
    rematchSessionId: r.strOrNull('rematchSessionId'),
  };
}

export function parsePlayer(id: string, data: Data): Player {
  const r = reader('players', id, data);
  return {
    uid: id,
    name: r.str('name'),
    joinedAt: r.num('joinedAt'),
    isPlaced: r.bool('isPlaced'),
    isHolding: r.bool('isHolding'),
    holdingSince: r.numOrNull('holdingSince'),
    pickupCount: r.num('pickupCount'),
    offTableMs: r.num('offTableMs'),
    longestHoldMs: r.num('longestHoldMs'),
    firstPickupAt: r.numOrNull('firstPickupAt'),
    isOut: r.bool('isOut'),
    outAt: r.numOrNull('outAt'),
  };
}

export function parseGameEvent(id: string, data: Data): GameEvent {
  const r = reader('events', id, data);
  return {
    id,
    type: r.oneOf('type', EVENT_TYPES),
    userId: r.str('userId'),
    at: r.num('at'),
    pickupNumber: r.numOrNull('pickupNumber'),
    holdMs: r.numOrNull('holdMs'),
  };
}
