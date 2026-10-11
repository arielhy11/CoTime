/** sessions/{id}/players/{uid} — one player's live state in one game. */
export interface Player {
  uid: string;
  name: string;
  joinedAt: number;
  /** Phone has been placed flat on the table at least once this game. */
  isPlaced: boolean;
  /** Phone is currently picked up. */
  isHolding: boolean;
  /** Holder's clock when the current pickup began. */
  holdingSince: number | null;
  pickupCount: number;
  /** Total time off the table across finished pickups. */
  offTableMs: number;
  longestHoldMs: number;
  firstPickupAt: number | null;
  isOut: boolean;
  outAt: number | null;
}

/** Fields the game rules read and write. */
export type PlayerState = Omit<Player, 'name' | 'joinedAt'>;

export type PlayerPatch = Partial<PlayerState>;
