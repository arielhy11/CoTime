import { currentLeaderIds } from '../standings';
import { makePlayer } from './fixtures';

describe('currentLeaderIds', () => {
  it('crowns the leader', () => {
    expect(currentLeaderIds('zen', [makePlayer({ uid: 'a' }), makePlayer({ uid: 'b', pickupCount: 2 })], 0)).toEqual(['a']);
  });

  it('no crown when everyone is tied or alone', () => {
    expect(currentLeaderIds('zen', [makePlayer({ uid: 'a' }), makePlayer({ uid: 'b' })], 0)).toEqual([]);
    expect(currentLeaderIds('zen', [makePlayer({ uid: 'a' })], 0)).toEqual([]);
  });
});
