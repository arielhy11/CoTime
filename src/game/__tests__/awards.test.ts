import { computeAwards } from '../awards';
import { makePlayer } from './fixtures';

const ids = (awards: ReturnType<typeof computeAwards>, id: string) =>
  awards.find((a) => a.id === id)?.userIds ?? null;

describe('computeAwards', () => {
  it('hands out monk, quick draw, zombie, doomscroll and cant-stop', () => {
    const awards = computeAwards([
      makePlayer({ uid: 'monk' }),
      makePlayer({ uid: 'fast', pickupCount: 1, firstPickupAt: 100, offTableMs: 2000, longestHoldMs: 2000 }),
      makePlayer({ uid: 'addict', pickupCount: 4, firstPickupAt: 500, offTableMs: 90_000, longestHoldMs: 60_000 }),
    ], 1000);
    expect(ids(awards, 'monk')).toEqual(['monk']);
    expect(ids(awards, 'quickDraw')).toEqual(['fast']);
    expect(ids(awards, 'zombie')).toEqual(['addict']);
    expect(ids(awards, 'doomscroll')).toEqual(['addict']);
    expect(ids(awards, 'cantStop')).toEqual(['addict']);
  });

  it('skips monk when everyone is clean, and skips empty awards', () => {
    const awards = computeAwards([makePlayer({ uid: 'a' }), makePlayer({ uid: 'b' })], 1000);
    expect(awards).toEqual([]);
  });

  it('counts a hold still in progress for doomscroll', () => {
    const awards = computeAwards([
      makePlayer({ uid: 'a', pickupCount: 1, firstPickupAt: 0, isHolding: true, holdingSince: 0 }),
      makePlayer({ uid: 'b' }),
    ], 45_000);
    expect(ids(awards, 'doomscroll')).toEqual(['a']);
  });
});
