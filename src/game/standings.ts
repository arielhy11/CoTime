import type { Player } from '../models/Player';
import type { GameModeId } from '../models/Session';
import { rankPlayers, winnersOf } from './ranking';

/** Who gets the crown mid-game: the current leaders, unless everyone is tied. */
export function currentLeaderIds(mode: GameModeId, players: Player[], now: number): string[] {
  if (players.length < 2) return [];
  const winners = winnersOf(rankPlayers(mode, players, now));
  if (winners.length === players.length) return [];
  return winners.map((r) => r.player.uid);
}
