import { Accelerometer } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import {
  createDetectorState,
  feedSample,
  forcePickup,
  manualPlace,
  type DetectorPhase,
  type DetectorStep,
  type PickupReason,
} from '../game/pickupDetector';

const SAMPLE_INTERVAL_MS = 100;

interface Callbacks {
  onArmed: (at: number) => void;
  onPickup: (reason: PickupReason, at: number) => void;
  onPutdown: (at: number) => void;
}

export interface PickupDetectorApi {
  phase: DetectorPhase;
  /** null while checking. false on web / simulators — use placeManually. */
  sensorsAvailable: boolean | null;
  placeManually: () => void;
  touchPickup: () => void;
  neverPlaced: () => void;
}

/**
 * Wires the pure pickup state machine to the accelerometer, app state
 * (leaving the app = picking up) and screen touches.
 */
export function usePickupDetector(enabled: boolean, callbacks: Callbacks): PickupDetectorApi {
  const stateRef = useRef(createDetectorState());
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const [phase, setPhase] = useState<DetectorPhase>('waiting');
  const [sensorsAvailable, setSensorsAvailable] = useState<boolean | null>(null);

  const handle = useCallback((step: DetectorStep) => {
    stateRef.current = step.state;
    setPhase(step.state.phase);
    if (!step.event) return;
    const at = Date.now();
    if (step.event === 'armed') callbacksRef.current.onArmed(at);
    if (step.event === 'putdown') callbacksRef.current.onPutdown(at);
    if (step.event === 'pickup') callbacksRef.current.onPickup(step.reason ?? 'motion', at);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let subscription: { remove: () => void } | null = null;

    const startSensors = async () => {
      const available = Platform.OS !== 'web' && (await Accelerometer.isAvailableAsync().catch(() => false));
      if (cancelled) return;
      setSensorsAvailable(available);
      if (!available) return;
      await Accelerometer.requestPermissionsAsync().catch(() => undefined);
      if (cancelled) return;
      Accelerometer.setUpdateInterval(SAMPLE_INTERVAL_MS);
      subscription = Accelerometer.addListener(({ x, y, z }) => {
        handle(feedSample(stateRef.current, { x, y, z, t: Date.now() }));
      });
    };
    void startSensors();

    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        handle(forcePickup(stateRef.current, 'appHidden'));
      }
    });

    return () => {
      cancelled = true;
      subscription?.remove();
      appStateSub.remove();
    };
  }, [enabled, handle]);

  const placeManually = useCallback(() => handle(manualPlace(stateRef.current)), [handle]);
  const touchPickup = useCallback(() => handle(forcePickup(stateRef.current, 'touch')), [handle]);
  const neverPlaced = useCallback(() => handle(forcePickup(stateRef.current, 'neverPlaced')), [handle]);

  return { phase, sensorsAvailable, placeManually, touchPickup, neverPlaced };
}
