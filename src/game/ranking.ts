import type { GameModeId } from '../models/Session';
import type { Player } from '../models/Player';
import { effectiveOffTableMs } from './rules';

export interface RankedPlayer {
  player: Player;
  /** 1 = best. Tied players share a rank. */
  rank: number;
  offTableMs: number;
}

type SortKey = number[];

/** Lower key = better. One strategy per mode. */
const SORT_KEYS: Record<GameModeId, (p: Player, offTableMs: number) => SortKey> = {
  // Survivors first; the one who cracked comes last.
  suddenDeath: (p, off) => [p.isOut ? 1 : 0, p.pickupCount, off],
  // Fewest pickups, then least time off the table.
  zen: (p, off) => [p.pickupCount, off],
  // Survivors first, then whoever lasted longest before getting knocked out.
  threeStrikes: (p, off) => [p.isOut ? 1 : 0, p.isOut ? -(p.outAt ?? 0) : 0, p.pickupCount, off],
  // Survivors first, then least phone time used.
  timeBank: (p, off) => [p.isOut ? 1 : 0, p.isOut ? -(p.outAt ?? 0) : 0, off, p.pickupCount],
};

function compareKeys(a: SortKey, b: SortKey): number {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function rankPlayers(mode: GameModeId, players: Player[], now: number): RankedPlayer[] {
  const keyOf = SORT_KEYS[mode];
  const withKeys = players.map((player) => {
    const offTableMs = effectiveOffTableMs(player, now);
    return { player, offTableMs, key: keyOf(player, offTableMs) };
  });
  withKeys.sort((a, b) => compareKeys(a.key, b.key) || a.player.joinedAt - b.player.joinedAt);

  const ranked: RankedPlayer[] = [];
  withKeys.forEach((entry, index) => {
    const prev = withKeys[index - 1];
    const tiedWithPrev = prev !== undefined && compareKeys(prev.key, entry.key) === 0;
    const rank = tiedWithPrev ? ranked[index - 1].rank : index + 1;
    ranked.push({ player: entry.player, rank, offTableMs: entry.offTableMs });
  });
  return ranked;
}

/** Everyone sharing first place. */
export function winnersOf(ranked: RankedPlayer[]): RankedPlayer[] {
  if (ranked.length === 0) return [];
  return ranked.filter((r) => r.rank === 1);
}

/**
 * Whoever owes the stake: everyone sharing last place. Empty when nobody
 * lost (everyone tied for first, or a solo player who never broke).
 */
export function losersOf(ranked: RankedPlayer[]): RankedPlayer[] {
  if (ranked.length === 0) return [];
  if (ranked.length === 1) {
    return ranked[0].player.isOut ? [ranked[0]] : [];
  }
  const worstRank = ranked[ranked.length - 1].rank;
  if (worstRank === 1) return [];
  return ranked.filter((r) => r.rank === worstRank);
}
