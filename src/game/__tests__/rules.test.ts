import {
  applyNeverPlaced,
  applyPickup,
  applyPutdown,
  applyTimeBankExpiry,
  computeEndsAt,
  effectiveOffTableMs,
  isGameRunning,
  isInCountdown,
  isTimeUp,
  timeBankRemainingMs,
} from '../rules';
import { makePlayer, makeSession } from './fixtures';

describe('game clock', () => {
  it('ignores the countdown, counts after start', () => {
    const s = makeSession({ startsAt: 1000 });
    expect(isInCountdown(s, 500)).toBe(true);
    expect(isGameRunning(s, 500)).toBe(false);
    expect(isGameRunning(s, 1000)).toBe(true);
  });

  it('stops counting the moment the clock runs out', () => {
    const s = makeSession({ startsAt: 1000, endsAt: 5000 });
    expect(isGameRunning(s, 4999)).toBe(true);
    expect(isGameRunning(s, 5000)).toBe(false);
    expect(applyPickup(s, makePlayer(), 5000)).toBe(null);
  });

  it('is not running in the lobby or after finishing', () => {
    expect(isGameRunning(makeSession({ status: 'lobby' }), 5000)).toBe(false);
    expect(isGameRunning(makeSession({ status: 'finished' }), 5000)).toBe(false);
  });

  it('computes end time and time-up', () => {
    expect(computeEndsAt(1000, null)).toBe(null);
    expect(computeEndsAt(1000, 2)).toBe(121_000);
    const s = makeSession({ endsAt: 2000 });
    expect(isTimeUp(s, 1999)).toBe(false);
    expect(isTimeUp(s, 2000)).toBe(true);
  });
});

describe('applyPickup', () => {
  it('does nothing during the countdown', () => {
    expect(applyPickup(makeSession(), makePlayer(), 500)).toBe(null);
  });

  it('does nothing when already holding or out', () => {
    expect(applyPickup(makeSession(), makePlayer({ isHolding: true, holdingSince: 1100 }), 2000)).toBe(null);
    expect(applyPickup(makeSession(), makePlayer({ isOut: true }), 2000)).toBe(null);
  });

  it('zen: counts the pickup and starts the hold', () => {
    const out = applyPickup(makeSession(), makePlayer(), 2000);
    expect(out?.playerPatch).toEqual({ pickupCount: 1, isHolding: true, holdingSince: 2000, firstPickupAt: 2000 });
    expect(out?.finish).toBe(null);
    expect(out?.eliminated).toBe(false);
  });

  it('keeps the first pickup time', () => {
    const out = applyPickup(makeSession(), makePlayer({ pickupCount: 1, firstPickupAt: 1500 }), 3000);
    expect(out?.playerPatch.firstPickupAt).toBe(1500);
  });

  it('sudden death: first pickup loses and ends the game', () => {
    const out = applyPickup(makeSession({ mode: 'suddenDeath' }), makePlayer({ uid: 'p2' }), 2000);
    expect(out?.finish).toEqual({ endReason: 'firstPickup', loserId: 'p2', winnerId: null });
    expect(out?.aliveIds).toEqual(['p1', 'p3']);
    expect(out?.playerPatch.isOut).toBe(true);
  });

  it('three strikes: out on the last life, last one standing wins', () => {
    const session = makeSession({ mode: 'threeStrikes', lives: 2, aliveIds: ['p1', 'p2'] });
    const first = applyPickup(session, makePlayer({ uid: 'p1' }), 2000);
    expect(first?.eliminated).toBe(false);
    const second = applyPickup(session, makePlayer({ uid: 'p1', pickupCount: 1 }), 3000);
    expect(second?.eliminated).toBe(true);
    expect(second?.aliveIds).toEqual(['p2']);
    expect(second?.finish).toEqual({ endReason: 'lastStanding', loserId: null, winnerId: 'p2' });
  });

  it('three strikes: game continues while 2+ are alive', () => {
    const session = makeSession({ mode: 'threeStrikes', lives: 1 });
    const out = applyPickup(session, makePlayer({ uid: 'p1' }), 2000);
    expect(out?.aliveIds).toEqual(['p2', 'p3']);
    expect(out?.finish).toBe(null);
  });

  it('solo three strikes ends when the only player is out', () => {
    const session = makeSession({ mode: 'threeStrikes', lives: 1, playerIds: ['p1'], aliveIds: ['p1'] });
    expect(applyPickup(session, makePlayer(), 2000)?.finish?.endReason).toBe('lastStanding');
  });
});

describe('applyPutdown', () => {
  it('closes the hold and tracks the longest one', () => {
    const p = makePlayer({ isHolding: true, holdingSince: 2000, offTableMs: 500, longestHoldMs: 400 });
    const out = applyPutdown(makeSession(), p, 2600);
    expect(out?.playerPatch).toEqual({ isPlaced: true, isHolding: false, holdingSince: null, offTableMs: 1100, longestHoldMs: 600 });
  });

  it('ignores putdowns once the game is over', () => {
    const p = makePlayer({ isHolding: true, holdingSince: 2000 });
    expect(applyPutdown(makeSession({ status: 'finished' }), p, 3000)).toBe(null);
  });

  it('ignores a putdown when not holding', () => {
    expect(applyPutdown(makeSession(), makePlayer(), 2000)).toBe(null);
  });

  it('time bank: putting down after the bank ran out eliminates', () => {
    const s = makeSession({ mode: 'timeBank', timeBankSeconds: 10 });
    const p = makePlayer({ isHolding: true, holdingSince: 2000, offTableMs: 8000 });
    const out = applyPutdown(s, p, 6000);
    expect(out?.eliminated).toBe(true);
    expect(out?.playerPatch.offTableMs).toBe(10_000);
    expect(out?.playerPatch.outAt).toBe(4000);
  });
});

describe('time bank', () => {
  const s = makeSession({ mode: 'timeBank', timeBankSeconds: 10 });

  it('counts a running hold', () => {
    const p = makePlayer({ isHolding: true, holdingSince: 2000, offTableMs: 3000 });
    expect(effectiveOffTableMs(p, 4000)).toBe(5000);
    expect(timeBankRemainingMs(s, p, 4000)).toBe(5000);
    expect(timeBankRemainingMs(s, p, 99_000)).toBe(0);
  });

  it('expires a holder whose bank is empty', () => {
    const p = makePlayer({ uid: 'p3', isHolding: true, holdingSince: 2000, offTableMs: 9000 });
    expect(applyTimeBankExpiry(s, p, 2500)).toBe(null);
    const out = applyTimeBankExpiry(s, p, 3500);
    expect(out?.eliminated).toBe(true);
    expect(out?.playerPatch.outAt).toBe(3000);
    expect(out?.aliveIds).toEqual(['p1', 'p2']);
  });

  it('only applies to time bank games', () => {
    const p = makePlayer({ isHolding: true, holdingSince: 2000, offTableMs: 99_000 });
    expect(applyTimeBankExpiry(makeSession({ mode: 'zen' }), p, 3000)).toBe(null);
  });
});

describe('applyNeverPlaced', () => {
  const s = makeSession({ startsAt: 1000 });
  const unplaced = makePlayer({ uid: 'p2', isPlaced: false });

  it('waits for the grace period', () => {
    expect(applyNeverPlaced(s, unplaced, 1500, 20_000)).toBe(null);
  });

  it('counts a pickup at the deadline', () => {
    const out = applyNeverPlaced(s, unplaced, 30_000, 20_000);
    expect(out?.playerPatch.pickupCount).toBe(1);
    expect(out?.playerPatch.holdingSince).toBe(21_000);
  });

  it('leaves placed, holding or knocked-out players alone', () => {
    expect(applyNeverPlaced(s, makePlayer({ isPlaced: true }), 30_000, 20_000)).toBe(null);
    expect(applyNeverPlaced(s, makePlayer({ isPlaced: false, isHolding: true, holdingSince: 2000 }), 30_000, 20_000)).toBe(null);
    expect(applyNeverPlaced(s, makePlayer({ isPlaced: false, isOut: true }), 30_000, 20_000)).toBe(null);
  });
});
