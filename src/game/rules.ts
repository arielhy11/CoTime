import type { EndReason, SessionRules } from '../models/Session';
import type { PlayerPatch, PlayerState } from '../models/Player';

/**
 * Pure game rules. Each function takes the current session + player and
 * returns what should change — the API layer applies it in a transaction.
 * null = nothing happens.
 */

export interface FinishOutcome {
  endReason: EndReason;
  loserId: string | null;
  winnerId: string | null;
}

export interface RuleOutcome {
  playerPatch: PlayerPatch;
  /** New aliveIds for the session (same array when unchanged). */
  aliveIds: string[];
  eliminated: boolean;
  finish: FinishOutcome | null;
}

export function isGameRunning(session: SessionRules, now: number): boolean {
  return session.status === 'live'
    && session.startsAt !== null
    && now >= session.startsAt
    && (session.endsAt === null || now < session.endsAt);
}

export function isInCountdown(session: SessionRules, now: number): boolean {
  return session.status === 'live' && session.startsAt !== null && now < session.startsAt;
}

export function timeBankMs(session: SessionRules): number {
  return session.timeBankSeconds * 1000;
}

/** Off-table time including a pickup that's still going on. */
export function effectiveOffTableMs(player: PlayerState, now: number): number {
  if (player.isHolding && player.holdingSince !== null) {
    return player.offTableMs + Math.max(0, now - player.holdingSince);
  }
  return player.offTableMs;
}

export function timeBankRemainingMs(session: SessionRules, player: PlayerState, now: number): number {
  return Math.max(0, timeBankMs(session) - effectiveOffTableMs(player, now));
}

function without(ids: string[], uid: string): string[] {
  return ids.filter((id) => id !== uid);
}

/** After someone is knocked out: does the game end? */
function lastStandingFinish(session: SessionRules, aliveIds: string[]): FinishOutcome | null {
  const multiplayer = session.playerIds.length > 1;
  if (multiplayer && aliveIds.length <= 1) {
    return { endReason: 'lastStanding', loserId: null, winnerId: aliveIds[0] ?? null };
  }
  if (!multiplayer && aliveIds.length === 0) {
    return { endReason: 'lastStanding', loserId: null, winnerId: null };
  }
  return null;
}

function eliminationOutcome(
  session: SessionRules,
  uid: string,
  patch: PlayerPatch,
  outAt: number
): RuleOutcome {
  const aliveIds = without(session.aliveIds, uid);
  return {
    playerPatch: { ...patch, isOut: true, outAt },
    aliveIds,
    eliminated: true,
    finish: lastStandingFinish(session, aliveIds),
  };
}

/** The phone just left the table. */
export function applyPickup(session: SessionRules, player: PlayerState, now: number): RuleOutcome | null {
  if (!isGameRunning(session, now) || player.isOut || player.isHolding) {
    return null;
  }

  const pickupCount = player.pickupCount + 1;
  const patch: PlayerPatch = {
    pickupCount,
    isHolding: true,
    holdingSince: now,
    firstPickupAt: player.firstPickupAt ?? now,
  };

  switch (session.mode) {
    case 'suddenDeath': {
      const aliveIds = without(session.aliveIds, player.uid);
      return {
        playerPatch: { ...patch, isOut: true, outAt: now },
        aliveIds,
        eliminated: true,
        finish: { endReason: 'firstPickup', loserId: player.uid, winnerId: null },
      };
    }
    case 'threeStrikes': {
      if (pickupCount >= session.lives) {
        return eliminationOutcome(session, player.uid, patch, now);
      }
      return { playerPatch: patch, aliveIds: session.aliveIds, eliminated: false, finish: null };
    }
    case 'zen':
    case 'timeBank':
      return { playerPatch: patch, aliveIds: session.aliveIds, eliminated: false, finish: null };
  }
}

/** The phone is back on the table. Closes the running pickup. */
export function applyPutdown(session: SessionRules, player: PlayerState, now: number): RuleOutcome | null {
  // Once the game is over the results are frozen (results count a hold up to endedAt).
  if (session.status !== 'live' || !player.isHolding || player.holdingSince === null) {
    return null;
  }
  const holdMs = Math.max(0, now - player.holdingSince);
  const patch: PlayerPatch = {
    isPlaced: true,
    isHolding: false,
    holdingSince: null,
    offTableMs: player.offTableMs + holdMs,
    longestHoldMs: Math.max(player.longestHoldMs, holdMs),
  };

  if (session.mode === 'timeBank' && !player.isOut && isGameRunning(session, now)) {
    const bank = timeBankMs(session);
    if (player.offTableMs + holdMs >= bank) {
      const outAt = player.holdingSince + (bank - player.offTableMs);
      return eliminationOutcome(session, player.uid, { ...patch, offTableMs: bank }, outAt);
    }
  }

  return { playerPatch: patch, aliveIds: session.aliveIds, eliminated: false, finish: null };
}

/**
 * Time Bank: a player holding their phone can burn through their bank while
 * their app is in the background, so any phone at the table may call this.
 */
export function applyTimeBankExpiry(session: SessionRules, player: PlayerState, now: number): RuleOutcome | null {
  if (session.mode !== 'timeBank' || !isGameRunning(session, now)) return null;
  if (player.isOut || !player.isHolding || player.holdingSince === null) return null;
  const bank = timeBankMs(session);
  if (effectiveOffTableMs(player, now) < bank) return null;

  const holdMs = bank - player.offTableMs;
  const patch: PlayerPatch = {
    isHolding: false,
    holdingSince: null,
    offTableMs: bank,
    longestHoldMs: Math.max(player.longestHoldMs, holdMs),
  };
  return eliminationOutcome(session, player.uid, patch, player.holdingSince + holdMs);
}

/**
 * A player whose phone never reached the table after the grace period.
 * Any phone at the table may flag them, so leaving the game screen early
 * (or never opening it) can't dodge the rules.
 */
export function applyNeverPlaced(session: SessionRules, player: PlayerState, now: number, graceMs: number): RuleOutcome | null {
  if (!isGameRunning(session, now) || session.startsAt === null) return null;
  if (player.isPlaced || player.isHolding || player.isOut) return null;
  const deadline = session.startsAt + graceMs;
  if (now < deadline) return null;
  return applyPickup(session, player, deadline);
}

export function isTimeUp(session: SessionRules, now: number): boolean {
  return session.status === 'live' && session.endsAt !== null && now >= session.endsAt;
}

export function computeEndsAt(startsAt: number, durationMinutes: number | null): number | null {
  return durationMinutes === null ? null : startsAt + durationMinutes * 60_000;
}
