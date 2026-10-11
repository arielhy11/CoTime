import type { Player } from '../models/Player';
import { effectiveOffTableMs } from './rules';

export type AwardId = 'monk' | 'quickDraw' | 'zombie' | 'doomscroll' | 'cantStop';

export interface Award {
  id: AwardId;
  emoji: string;
  userIds: string[];
  /** Numeric detail for the copy (ms or count), when the award has one. */
  value: number | null;
}

const EMOJI: Record<AwardId, string> = {
  monk: '🧘',
  quickDraw: '🤠',
  zombie: '🧟',
  doomscroll: '📜',
  cantStop: '🔁',
};

function topBy(players: Player[], score: (p: Player) => number, minimum: number): { ids: string[]; value: number } | null {
  let best = -Infinity;
  for (const p of players) best = Math.max(best, score(p));
  if (best < minimum) return null;
  return { ids: players.filter((p) => score(p) === best).map((p) => p.uid), value: best };
}

function currentHoldMs(p: Player, now: number): number {
  return p.isHolding && p.holdingSince !== null ? Math.max(0, now - p.holdingSince) : 0;
}

/** Fun superlatives for the results screen. Only awards that apply are returned. */
export function computeAwards(players: Player[], now: number): Award[] {
  const awards: Award[] = [];
  const make = (id: AwardId, userIds: string[], value: number | null) =>
    awards.push({ id, emoji: EMOJI[id], userIds, value });

  const clean = players.filter((p) => p.pickupCount === 0);
  // Only special if not everybody pulled it off.
  if (clean.length > 0 && clean.length < players.length) {
    make('monk', clean.map((p) => p.uid), null);
  }

  const pickedUp = players.filter((p) => p.firstPickupAt !== null);
  if (pickedUp.length > 0) {
    const first = Math.min(...pickedUp.map((p) => p.firstPickupAt as number));
    make('quickDraw', pickedUp.filter((p) => p.firstPickupAt === first).map((p) => p.uid), first);
  }

  const zombie = topBy(players, (p) => effectiveOffTableMs(p, now), 1000);
  if (zombie) make('zombie', zombie.ids, zombie.value);

  const doom = topBy(players, (p) => Math.max(p.longestHoldMs, currentHoldMs(p, now)), 30_000);
  if (doom) make('doomscroll', doom.ids, doom.value);

  const cantStop = topBy(players, (p) => p.pickupCount, 3);
  if (cantStop) make('cantStop', cantStop.ids, cantStop.value);

  return awards;
}
