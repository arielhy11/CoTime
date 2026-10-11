import type { Player } from '../../models/Player';
import type { Session } from '../../models/Session';
import type { User } from '../../models/User';

/** Fixture table for the FX gallery (no Firebase needed). */
export function fakeTable(now: number, samplePhoto: string | null): { session: Session; players: Player[]; profiles: Record<string, User> } {
  const base = (uid: string, name: string, extra: Partial<Player>): Player => ({
    uid,
    name,
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
    ...extra,
  });
  const players = [
    base('zen-master', 'Noa', {}),
    base('dana', 'Dana', { pickupCount: 1, offTableMs: 12_000, longestHoldMs: 12_000, firstPickupAt: now - 600_000 }),
    base('ariel', 'Ariel', { pickupCount: 2, offTableMs: 50_000, longestHoldMs: 40_000, firstPickupAt: now - 900_000, isHolding: true, holdingSince: now - 8_000 }),
    base('mo', 'Big Mo', { pickupCount: 3, offTableMs: 95_000, longestHoldMs: 61_000, firstPickupAt: now - 1_200_000 }),
    base('yuval', 'Yuval', { pickupCount: 4, offTableMs: 200_000, longestHoldMs: 90_000, firstPickupAt: now - 1_300_000, isOut: true, outAt: now - 300_000 }),
  ];
  const profiles: Record<string, User> = Object.fromEntries(
    players.map((p, i) => [p.uid, { uid: p.uid, name: p.name, photoURL: i % 2 === 1 ? samplePhoto : null, createdAt: 0 }])
  );
  const session: Session = {
    id: 'demo',
    code: 'BOMB5',
    hostId: 'zen-master',
    mode: 'zen',
    status: 'finished',
    stake: 'Loser pays the bill 🍕',
    durationMinutes: 30,
    lives: 3,
    timeBankSeconds: 180,
    playerIds: players.map((p) => p.uid),
    aliveIds: players.filter((p) => !p.isOut).map((p) => p.uid),
    createdAt: now - 1_900_000,
    startsAt: now - 1_800_000,
    endsAt: now,
    endedAt: now,
    endReason: 'timeUp',
    loserId: 'yuval',
    winnerId: 'zen-master',
    rankedIds: players.map((p) => p.uid),
    rematchSessionId: null,
  };
  return { session, players, profiles };
}
