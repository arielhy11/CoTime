export type GameEventType = 'joined' | 'placed' | 'pickup' | 'putdown' | 'eliminated';

/** sessions/{id}/events/{autoId} — the table's running commentary. */
export interface GameEvent {
  id: string;
  type: GameEventType;
  userId: string;
  at: number;
  /** For pickups: which pickup this was for the player (1 = first). */
  pickupNumber: number | null;
  /** For putdowns: how long the phone was off the table. */
  holdMs: number | null;
}
