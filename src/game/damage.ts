import type { SessionRules } from '../models/Session';
import type { PlayerState } from '../models/Player';
import { effectiveOffTableMs, timeBankMs } from './rules';

/**
 * How wrecked a player's avatar looks.
 * 0 pristine · 1 cracked · 2 smashed + band-aid · 3 on fire · 4 blown up
 */
export type DamageLevel = 0 | 1 | 2 | 3 | 4;

export const MAX_DAMAGE: DamageLevel = 4;

function clampLevel(n: number): DamageLevel {
  if (n <= 0) return 0;
  if (n >= 4) return 4;
  return Math.floor(n) as DamageLevel;
}

export function damageLevel(session: Pick<SessionRules, 'mode' | 'lives' | 'timeBankSeconds'>, player: PlayerState, now: number): DamageLevel {
  if (player.isOut) return 4;

  switch (session.mode) {
    case 'suddenDeath':
      return player.pickupCount > 0 ? 4 : 0;
    case 'zen':
      return clampLevel(Math.min(3, player.pickupCount));
    case 'threeStrikes': {
      if (player.pickupCount === 0) return 0;
      const lives = Math.max(1, session.lives);
      return clampLevel(Math.min(3, Math.ceil((player.pickupCount / lives) * 3)));
    }
    case 'timeBank': {
      const used = effectiveOffTableMs(player, now) / Math.max(1, timeBankMs(session as SessionRules));
      if (used <= 0) return 0;
      if (used < 1 / 3) return 1;
      if (used < 2 / 3) return 2;
      return 3;
    }
  }
}

/** Lives left in Three Strikes (never negative). */
export function livesLeft(lives: number, pickupCount: number): number {
  return Math.max(0, lives - pickupCount);
}
