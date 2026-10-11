import { useEffect, useRef } from 'react';
import type { GameEvent } from '../models/GameEvent';
import { buzzExplosion, buzzSomeoneCracked } from '../services/haptics';
import { playSound } from '../services/sound';

/**
 * Sounds and buzzes for what *other* people do — your face-down phone
 * wails when a friend picks theirs up. Only events newer than the moment
 * this mounted count, so history never replays.
 */
export function useGameFeedback(events: GameEvent[], myUid: string | null, active: boolean): void {
  const mountedAt = useRef(Date.now());
  const seen = useRef(new Set<string>());

  useEffect(() => {
    const fresh = events.filter((e) => !seen.current.has(e.id) && e.at >= mountedAt.current - 1000);
    events.forEach((e) => seen.current.add(e.id));
    if (!active) return;
    for (const event of fresh) {
      if (event.userId === myUid) continue;
      if (event.type === 'pickup') {
        playSound('alarm');
        buzzSomeoneCracked();
      } else if (event.type === 'eliminated') {
        playSound('boom');
        buzzExplosion();
      }
    }
  }, [events, myUid, active]);
}
