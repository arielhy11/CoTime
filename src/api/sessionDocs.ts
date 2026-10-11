import { rankPlayers, losersOf, winnersOf } from '../game/ranking';
import { computeEndsAt, type FinishOutcome } from '../game/rules';
import { START_COUNTDOWN_MS } from '../game/modes';
import type { GameEventType } from '../models/GameEvent';
import type { Player } from '../models/Player';
import type { GameModeId, Session } from '../models/Session';

/** Pure builders for the documents the API writes. */

export interface NewGameOptions {
  mode: GameModeId;
  stake: string;
  durationMinutes: number | null;
  lives: number;
  timeBankSeconds: number;
}

export const MAX_STAKE_LENGTH = 60;

export function newSessionDoc(hostId: string, code: string, options: NewGameOptions, now: number): Omit<Session, 'id'> {
  return {
    code,
    hostId,
    mode: options.mode,
    status: 'lobby',
    stake: options.stake.trim().slice(0, MAX_STAKE_LENGTH),
    durationMinutes: options.durationMinutes,
    lives: options.lives,
    timeBankSeconds: options.timeBankSeconds,
    playerIds: [hostId],
    aliveIds: [hostId],
    createdAt: now,
    startsAt: null,
    endsAt: null,
    endedAt: null,
    endReason: null,
    loserId: null,
    winnerId: null,
    rankedIds: [],
    rematchSessionId: null,
  };
}

export function newPlayerDoc(name: string, now: number): Omit<Player, 'uid'> {
  return {
    name,
    joinedAt: now,
    isPlaced: false,
    isHolding: false,
    holdingSince: null,
    pickupCount: 0,
    offTableMs: 0,
    longestHoldMs: 0,
    firstPickupAt: null,
    isOut: false,
    outAt: null,
  };
}

export function startPatch(session: Pick<Session, 'playerIds' | 'durationMinutes'>, now: number): Pick<Session, 'status' | 'startsAt' | 'endsAt' | 'aliveIds'> {
  const startsAt = now + START_COUNTDOWN_MS;
  return {
    status: 'live',
    startsAt,
    endsAt: computeEndsAt(startsAt, session.durationMinutes),
    aliveIds: [...session.playerIds],
  };
}

export function eventDoc(type: GameEventType, userId: string, at: number, extra: { pickupNumber?: number; holdMs?: number } = {}) {
  return {
    type,
    userId,
    at,
    pickupNumber: extra.pickupNumber ?? null,
    holdMs: extra.holdMs ?? null,
  };
}

/** Everything written to the session when a game ends: final order, winner, loser. */
export function finishPatch(
  mode: GameModeId,
  players: Player[],
  finish: FinishOutcome,
  now: number
): Pick<Session, 'status' | 'endedAt' | 'endReason' | 'rankedIds' | 'winnerId' | 'loserId'> {
  const ranked = rankPlayers(mode, players, now);
  const losers = losersOf(ranked);
  const loserIds = new Set(losers.map((r) => r.player.uid));
  const winners = winnersOf(ranked).filter((r) => !loserIds.has(r.player.uid));
  return {
    status: 'finished',
    endedAt: now,
    endReason: finish.endReason,
    rankedIds: ranked.map((r) => r.player.uid),
    winnerId: finish.winnerId ?? (winners.length === 1 ? winners[0].player.uid : null),
    loserId: finish.loserId ?? (losers.length === 1 ? losers[0].player.uid : null),
  };
}
