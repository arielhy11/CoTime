/**
 * Pickup detection as a pure state machine fed with accelerometer samples
 * (units of g — expo-sensors normalises both platforms to g).
 *
 *   waiting ──flat & still──▶ down ──tilt / lift / touch / app hidden──▶ up
 *                               ▲                                        │
 *                               └──────────────flat & still──────────────┘
 *
 * It never assumes which way gravity points (face up vs face down reports
 * opposite signs, and platforms disagree), so "down" stores whatever
 * resting orientation it saw as the baseline and measures tilt against it.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Sample extends Vec3 {
  t: number;
}

export type DetectorPhase = 'waiting' | 'down' | 'up';

export type DetectorEvent = 'armed' | 'pickup' | 'putdown';

export type PickupReason = 'motion' | 'touch' | 'appHidden' | 'neverPlaced';

export interface DetectorConfig {
  /** Max angle from horizontal that still counts as "lying on the table". */
  flatMaxTiltDeg: number;
  /** Phone must be still this long before it counts as placed. */
  stillWindowMs: number;
  /** Max deviation (g) from the window mean that still counts as still. */
  stillMaxDeviationG: number;
  /** Tilt away from the resting orientation that counts as a pickup. */
  pickupTiltDeg: number;
  pickupSustainMs: number;
  /** Straight-up lift: |acceleration| differing from 1g by this much. */
  liftDeviationG: number;
  liftSustainMs: number;
}

export const DEFAULT_DETECTOR_CONFIG: DetectorConfig = {
  flatMaxTiltDeg: 25,
  stillWindowMs: 1200,
  stillMaxDeviationG: 0.06,
  pickupTiltDeg: 35,
  pickupSustainMs: 300,
  liftDeviationG: 0.35,
  liftSustainMs: 200,
};

export interface DetectorState {
  phase: DetectorPhase;
  /** Resting gravity vector while down. */
  baseline: Vec3 | null;
  window: Sample[];
  tiltSince: number | null;
  liftSince: number | null;
  /** Has the phone been placed at least once? */
  armed: boolean;
}

export interface DetectorStep {
  state: DetectorState;
  event: DetectorEvent | null;
  reason: PickupReason | null;
}

export function createDetectorState(): DetectorState {
  return { phase: 'waiting', baseline: null, window: [], tiltSince: null, liftSince: null, armed: false };
}

export function magnitude(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/** Angle between two vectors, degrees. */
export function angleBetweenDeg(a: Vec3, b: Vec3): number {
  const ma = magnitude(a);
  const mb = magnitude(b);
  if (ma === 0 || mb === 0) return 0;
  const cos = (a.x * b.x + a.y * b.y + a.z * b.z) / (ma * mb);
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

/** Angle between the phone's screen normal (z axis) and vertical. Face up or face down are both 0°. */
export function tiltFromHorizontalDeg(v: Vec3): number {
  const m = magnitude(v);
  if (m === 0) return 90;
  return (Math.acos(Math.min(1, Math.abs(v.z) / m)) * 180) / Math.PI;
}

function mean(samples: Sample[]): Vec3 {
  const n = samples.length;
  const sum = samples.reduce((acc, s) => ({ x: acc.x + s.x, y: acc.y + s.y, z: acc.z + s.z }), { x: 0, y: 0, z: 0 });
  return { x: sum.x / n, y: sum.y / n, z: sum.z / n };
}

/** Flat on a surface and not moving for the whole window. Returns the resting vector. */
export function restingVector(window: Sample[], config: DetectorConfig): Vec3 | null {
  if (window.length < 3) return null;
  const span = window[window.length - 1].t - window[0].t;
  if (span < config.stillWindowMs * 0.9) return null;
  const avg = mean(window);
  const still = window.every(
    (s) => Math.abs(s.x - avg.x) <= config.stillMaxDeviationG
      && Math.abs(s.y - avg.y) <= config.stillMaxDeviationG
      && Math.abs(s.z - avg.z) <= config.stillMaxDeviationG
  );
  if (!still) return null;
  if (tiltFromHorizontalDeg(avg) > config.flatMaxTiltDeg) return null;
  return avg;
}

function trimWindow(window: Sample[], sample: Sample, windowMs: number): Sample[] {
  const next = [...window, sample];
  const cutoff = sample.t - windowMs;
  let start = 0;
  while (start < next.length - 1 && next[start].t < cutoff) start += 1;
  return next.slice(start);
}

function settle(state: DetectorState, window: Sample[], config: DetectorConfig): DetectorStep {
  const resting = restingVector(window, config);
  if (!resting) {
    return { state: { ...state, window }, event: null, reason: null };
  }
  const event: DetectorEvent = state.armed ? 'putdown' : 'armed';
  return {
    state: { phase: 'down', baseline: resting, window: [], tiltSince: null, liftSince: null, armed: true },
    event,
    reason: null,
  };
}

function goUp(state: DetectorState, reason: PickupReason): DetectorStep {
  return {
    state: { ...state, phase: 'up', baseline: null, window: [], tiltSince: null, liftSince: null },
    event: 'pickup',
    reason,
  };
}

export function feedSample(
  state: DetectorState,
  sample: Sample,
  config: DetectorConfig = DEFAULT_DETECTOR_CONFIG
): DetectorStep {
  if (state.phase !== 'down' || !state.baseline) {
    return settle(state, trimWindow(state.window, sample, config.stillWindowMs), config);
  }

  const tilted = angleBetweenDeg(sample, state.baseline) > config.pickupTiltDeg;
  const tiltSince = tilted ? state.tiltSince ?? sample.t : null;
  if (tiltSince !== null && sample.t - tiltSince >= config.pickupSustainMs) {
    return goUp(state, 'motion');
  }

  const lifting = Math.abs(magnitude(sample) - 1) > config.liftDeviationG;
  const liftSince = lifting ? state.liftSince ?? sample.t : null;
  if (liftSince !== null && sample.t - liftSince >= config.liftSustainMs) {
    return goUp(state, 'motion');
  }

  return { state: { ...state, tiltSince, liftSince }, event: null, reason: null };
}

/** Touch, app going to background, or never placed — counts as a pickup when the phone is down. */
export function forcePickup(state: DetectorState, reason: PickupReason): DetectorStep {
  if (state.phase === 'up') {
    return { state, event: null, reason: null };
  }
  if (state.phase === 'waiting' && reason !== 'neverPlaced') {
    // Not placed yet: touching the screen while setting up is fine.
    return { state, event: null, reason: null };
  }
  return goUp({ ...state, armed: true }, reason);
}

/**
 * No sensors (web / simulator): treat the phone as placed straight away
 * and let the player confirm putting it back by hand.
 */
export function manualPlace(state: DetectorState): DetectorStep {
  if (state.phase === 'down') return { state, event: null, reason: null };
  const event: DetectorEvent = state.armed ? 'putdown' : 'armed';
  return {
    state: { phase: 'down', baseline: { x: 0, y: 0, z: 1 }, window: [], tiltSince: null, liftSince: null, armed: true },
    event,
    reason: null,
  };
}
