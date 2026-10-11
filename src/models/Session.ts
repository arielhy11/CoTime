export type GameModeId = 'suddenDeath' | 'zen' | 'threeStrikes' | 'timeBank';

export type SessionStatus = 'lobby' | 'live' | 'finished';

export type EndReason = 'firstPickup' | 'lastStanding' | 'timeUp' | 'hostEnded';

/** sessions/{id} — one game at one table. Flat by design. */
export interface Session {
  id: string;
  /** 5-char join code shown in the lobby. */
  code: string;
  hostId: string;
  mode: GameModeId;
  status: SessionStatus;
  /** What the loser owes ("Loser pays the bill"). Empty string = no stake. */
  stake: string;
  /** null = no time limit (game ends by its own rules or by the host). */
  durationMinutes: number | null;
  /** Three Strikes: pickups allowed before you're out. */
  lives: number;
  /** Time Bank: total seconds of phone time each player gets. */
  timeBankSeconds: number;
  playerIds: string[];
  /** Players still in the game (not eliminated). */
  aliveIds: string[];
  createdAt: number;
  /** End of the "phones down" countdown. Pickups count only after this. */
  startsAt: number | null;
  endsAt: number | null;
  endedAt: number | null;
  endReason: EndReason | null;
  loserId: string | null;
  winnerId: string | null;
  /** Final order, best first. Written once when the game finishes. */
  rankedIds: string[];
  /** Set by the host on the results screen; other phones offer to follow. */
  rematchSessionId: string | null;
}

/** The subset of a session the game rules need. */
export type SessionRules = Pick<
  Session,
  | 'mode'
  | 'status'
  | 'lives'
  | 'timeBankSeconds'
  | 'playerIds'
  | 'aliveIds'
  | 'startsAt'
  | 'endsAt'
>;
