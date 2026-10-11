import { START_COUNTDOWN_MS } from '../../game/modes';
import { makePlayer } from '../../game/__tests__/fixtures';
import { eventDoc, finishPatch, MAX_STAKE_LENGTH, newSessionDoc, startPatch } from '../sessionDocs';

describe('newSessionDoc', () => {
  it('seats the host and trims the stake', () => {
    const doc = newSessionDoc('h', 'ABCDE', { mode: 'suddenDeath', stake: `  ${'x'.repeat(100)} `, durationMinutes: null, lives: 3, timeBankSeconds: 60 }, 5);
    expect(doc.playerIds).toEqual(['h']);
    expect(doc.aliveIds).toEqual(['h']);
    expect(doc.stake.length).toBe(MAX_STAKE_LENGTH);
    expect(doc.rankedIds).toEqual([]);
  });
});

describe('startPatch', () => {
  it('starts after the countdown and sets the end time', () => {
    const patch = startPatch({ playerIds: ['a', 'b'], durationMinutes: 10 }, 1000);
    expect(patch.startsAt).toBe(1000 + START_COUNTDOWN_MS);
    expect(patch.endsAt).toBe(1000 + START_COUNTDOWN_MS + 600_000);
    expect(patch.aliveIds).toEqual(['a', 'b']);
  });

  it('has no end time for open-ended games', () => {
    expect(startPatch({ playerIds: ['a'], durationMinutes: null }, 0).endsAt).toBe(null);
  });
});

describe('finishPatch', () => {
  it('ranks players and picks a single winner and loser', () => {
    const patch = finishPatch('zen', [
      makePlayer({ uid: 'a', pickupCount: 1 }),
      makePlayer({ uid: 'b' }),
      makePlayer({ uid: 'c', pickupCount: 4 }),
    ], { endReason: 'timeUp', loserId: null, winnerId: null }, 100);
    expect(patch.rankedIds).toEqual(['b', 'a', 'c']);
    expect(patch.winnerId).toBe('b');
    expect(patch.loserId).toBe('c');
    expect(patch.status).toBe('finished');
  });

  it('keeps the loser named by the rules', () => {
    const patch = finishPatch('suddenDeath', [
      makePlayer({ uid: 'a' }),
      makePlayer({ uid: 'b', isOut: true, pickupCount: 1, outAt: 50 }),
    ], { endReason: 'firstPickup', loserId: 'b', winnerId: null }, 100);
    expect(patch.loserId).toBe('b');
    expect(patch.winnerId).toBe('a');
  });

  it('no single winner when several tie for first', () => {
    const patch = finishPatch('zen', [makePlayer({ uid: 'a' }), makePlayer({ uid: 'b' }), makePlayer({ uid: 'c', pickupCount: 1 })], { endReason: 'timeUp', loserId: null, winnerId: null }, 0);
    expect(patch.winnerId).toBe(null);
    expect(patch.loserId).toBe('c');
  });
});

describe('eventDoc', () => {
  it('fills optional fields with null', () => {
    expect(eventDoc('joined', 'u', 1)).toEqual({ type: 'joined', userId: 'u', at: 1, pickupNumber: null, holdMs: null });
  });
});
