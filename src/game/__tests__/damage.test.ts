import { damageLevel, livesLeft } from '../damage';
import { makePlayer, makeSession } from './fixtures';

describe('damageLevel', () => {
  it('blown up when out, pristine when clean', () => {
    expect(damageLevel(makeSession(), makePlayer({ isOut: true }), 0)).toBe(4);
    expect(damageLevel(makeSession(), makePlayer(), 0)).toBe(0);
  });

  it('zen: one step per pickup, caps at on fire', () => {
    const s = makeSession({ mode: 'zen' });
    expect([1, 2, 3, 9].map((n) => damageLevel(s, makePlayer({ pickupCount: n }), 0))).toEqual([1, 2, 3, 3]);
  });

  it('three strikes scales with lives', () => {
    const three = makeSession({ mode: 'threeStrikes', lives: 3 });
    expect([1, 2].map((n) => damageLevel(three, makePlayer({ pickupCount: n }), 0))).toEqual([1, 2]);
    const five = makeSession({ mode: 'threeStrikes', lives: 5 });
    expect([1, 2, 3, 4].map((n) => damageLevel(five, makePlayer({ pickupCount: n }), 0))).toEqual([1, 2, 2, 3]);
  });

  it('time bank follows the share of the bank used', () => {
    const s = makeSession({ mode: 'timeBank', timeBankSeconds: 30 });
    expect(damageLevel(s, makePlayer({ offTableMs: 5000 }), 0)).toBe(1);
    expect(damageLevel(s, makePlayer({ offTableMs: 15_000 }), 0)).toBe(2);
    expect(damageLevel(s, makePlayer({ offTableMs: 25_000 }), 0)).toBe(3);
  });

  it('sudden death: any pickup is fatal', () => {
    expect(damageLevel(makeSession({ mode: 'suddenDeath' }), makePlayer({ pickupCount: 1 }), 0)).toBe(4);
  });
});

describe('livesLeft', () => {
  it('never goes negative', () => {
    expect(livesLeft(3, 1)).toBe(2);
    expect(livesLeft(3, 7)).toBe(0);
  });
});
