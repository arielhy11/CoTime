import type { GameModeId } from '../models/Session';

export type DurationPolicy = 'required' | 'optional';

/**
 * Everything the UI and rules need to know about a mode, except copy
 * (titles/rules live in i18n under `modes.<id>`). Add a mode by adding an
 * entry here plus its branch in rules.ts / ranking.ts / damage.ts.
 */
export interface ModeDefinition {
  id: GameModeId;
  emoji: string;
  /** Card / highlight color. */
  accent: string;
  duration: DurationPolicy;
  defaultDurationMinutes: number | null;
  durationOptions: number[];
  usesLives: boolean;
  usesTimeBank: boolean;
}

export const LIVES_OPTIONS = [1, 2, 3, 5] as const;
export const DEFAULT_LIVES = 3;

export const TIME_BANK_OPTIONS_SECONDS = [60, 180, 300, 600] as const;
export const DEFAULT_TIME_BANK_SECONDS = 180;

export const MODES: Record<GameModeId, ModeDefinition> = {
  suddenDeath: {
    id: 'suddenDeath',
    emoji: '💣',
    accent: '#FF5A1F',
    duration: 'optional',
    defaultDurationMinutes: null,
    durationOptions: [15, 30, 60, 90],
    usesLives: false,
    usesTimeBank: false,
  },
  zen: {
    id: 'zen',
    emoji: '🧘',
    accent: '#B8F34A',
    duration: 'required',
    defaultDurationMinutes: 30,
    durationOptions: [10, 20, 30, 60, 90, 120],
    usesLives: false,
    usesTimeBank: false,
  },
  threeStrikes: {
    id: 'threeStrikes',
    emoji: '💥',
    accent: '#FF3B5C',
    duration: 'optional',
    defaultDurationMinutes: null,
    durationOptions: [30, 60, 90, 120],
    usesLives: true,
    usesTimeBank: false,
  },
  timeBank: {
    id: 'timeBank',
    emoji: '⏳',
    accent: '#FFD23F',
    duration: 'optional',
    defaultDurationMinutes: 60,
    durationOptions: [30, 60, 90, 120],
    usesLives: false,
    usesTimeBank: true,
  },
};

export const MODE_ORDER: GameModeId[] = ['suddenDeath', 'threeStrikes', 'zen', 'timeBank'];

export function getMode(id: GameModeId): ModeDefinition {
  const mode = MODES[id];
  if (!mode) {
    throw new Error(`Unknown game mode: ${id}`);
  }
  return mode;
}

/** Stake presets offered as chips; the host can also type their own. */
export const STAKE_PRESET_KEYS = [
  'stakes.bill',
  'stakes.round',
  'stakes.dishes',
  'stakes.story',
  'stakes.dessert',
] as const;

export const MAX_PLAYERS = 12;
/** "Phones down" countdown before pickups start counting. */
export const START_COUNTDOWN_MS = 10_000;
/** If a phone never gets placed this long after the start, it counts as a pickup. */
export const PLACE_GRACE_MS = 20_000;
