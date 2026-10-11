import { losersOf, rankPlayers, winnersOf } from '../ranking';
import { makePlayer } from './fixtures';

describe('rankPlayers', () => {
  it('zen: fewest pickups, then least time off the table', () => {
    const players = [
      makePlayer({ uid: 'a', pickupCount: 2, offTableMs: 100 }),
      makePlayer({ uid: 'b', pickupCount: 0 }),
      makePlayer({ uid: 'c', pickupCount: 2, offTableMs: 50 }),
    ];
    const ranked = rankPlayers('zen', players, 0);
    expect(ranked.map((r) => r.player.uid)).toEqual(['b', 'c', 'a']);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('ties share a rank', () => {
    const players = [
      makePlayer({ uid: 'a', joinedAt: 1 }),
      makePlayer({ uid: 'b', joinedAt: 2 }),
      makePlayer({ uid: 'c', pickupCount: 1, joinedAt: 3 }),
    ];
    expect(rankPlayers('zen', players, 0).map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it('three strikes: survivors, then whoever lasted longest', () => {
    const players = [
      makePlayer({ uid: 'early', isOut: true, outAt: 100, pickupCount: 3 }),
      makePlayer({ uid: 'late', isOut: true, outAt: 900, pickupCount: 3 }),
      makePlayer({ uid: 'alive', pickupCount: 2 }),
    ];
    expect(rankPlayers('threeStrikes', players, 1000).map((r) => r.player.uid)).toEqual(['alive', 'late', 'early']);
  });

  it('counts a running hold toward time off the table', () => {
    const players = [
      makePlayer({ uid: 'holding', pickupCount: 1, isHolding: true, holdingSince: 0 }),
      makePlayer({ uid: 'quick', pickupCount: 1, offTableMs: 500 }),
    ];
    const ranked = rankPlayers('zen', players, 2000);
    expect(ranked[0].player.uid).toBe('quick');
    expect(ranked[1].offTableMs).toBe(2000);
  });
});

describe('winners and losers', () => {
  it('sudden death loser owes the stake', () => {
    const ranked = rankPlayers('suddenDeath', [
      makePlayer({ uid: 'a' }),
      makePlayer({ uid: 'b', isOut: true, pickupCount: 1, outAt: 5 }),
      makePlayer({ uid: 'c' }),
    ], 10);
    expect(winnersOf(ranked).map((r) => r.player.uid)).toEqual(['a', 'c']);
    expect(losersOf(ranked).map((r) => r.player.uid)).toEqual(['b']);
  });

  it('nobody loses when everyone ties', () => {
    const ranked = rankPlayers('zen', [makePlayer({ uid: 'a' }), makePlayer({ uid: 'b' })], 0);
    expect(losersOf(ranked)).toEqual([]);
  });

  it('two players sharing last place split the stake', () => {
    const ranked = rankPlayers('zen', [
      makePlayer({ uid: 'a' }),
      makePlayer({ uid: 'b', pickupCount: 1, offTableMs: 10 }),
      makePlayer({ uid: 'c', pickupCount: 1, offTableMs: 10 }),
    ], 0);
    expect(losersOf(ranked).map((r) => r.player.uid)).toEqual(['b', 'c']);
  });

  it('solo player only loses if knocked out', () => {
    expect(losersOf(rankPlayers('zen', [makePlayer()], 0))).toEqual([]);
    expect(losersOf(rankPlayers('suddenDeath', [makePlayer({ isOut: true })], 0)).length).toBe(1);
  });
});
