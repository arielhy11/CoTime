import type { Player } from '../../models/Player';
import type { SessionRules } from '../../models/Session';

export function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    uid: 'p1',
    name: 'Player',
    joinedAt: 0,
    isPlaced: true,
    isHolding: false,
    holdingSince: null,
    pickupCount: 0,
    offTableMs: 0,
    longestHoldMs: 0,
    firstPickupAt: null,
    isOut: false,
    outAt: null,
    ...overrides,
  };
}

export function makeSession(overrides: Partial<SessionRules> = {}): SessionRules {
  return {
    mode: 'zen',
    status: 'live',
    lives: 3,
    timeBankSeconds: 60,
    playerIds: ['p1', 'p2', 'p3'],
    aliveIds: ['p1', 'p2', 'p3'],
    startsAt: 1000,
    endsAt: null,
    ...overrides,
  };
}
