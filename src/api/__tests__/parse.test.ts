import { MalformedDocumentError, parseGameEvent, parsePlayer, parseSession, parseUser } from '../parse';
import { newPlayerDoc, newSessionDoc } from '../sessionDocs';

describe('parsers', () => {
  it('round-trips a freshly built session and player', () => {
    const data = newSessionDoc('host', 'ABCDE', { mode: 'zen', stake: 'Loser pays', durationMinutes: 30, lives: 3, timeBankSeconds: 180 }, 1);
    const session = parseSession('s1', data as unknown as Record<string, unknown>);
    expect(session.id).toBe('s1');
    expect(session.status).toBe('lobby');
    const player = parsePlayer('host', newPlayerDoc('Ariel', 1) as unknown as Record<string, unknown>);
    expect(player.name).toBe('Ariel');
    expect(player.isPlaced).toBe(false);
  });

  it('fails fast on bad data', () => {
    expect(() => parseUser('u', { name: 'x', photoURL: 5, createdAt: 1 })).toThrow();
    expect(() => parseSession('s', { mode: 'chess' })).toThrow();
    expect(() => parseGameEvent('e', { type: 'pickup', userId: 'u', at: 'yesterday' })).toThrow();
  });

  it('names the broken field', () => {
    let message = '';
    try {
      parseUser('u1', { name: 3, photoURL: null, createdAt: 1 });
    } catch (e) {
      message = e instanceof MalformedDocumentError ? e.message : '';
    }
    expect(message).toBe('Malformed users/u1: bad field "name"');
  });

  it('parses events with nullable details', () => {
    const e = parseGameEvent('e1', { type: 'putdown', userId: 'u', at: 5, pickupNumber: null, holdMs: 1200 });
    expect(e.holdMs).toBe(1200);
    expect(e.pickupNumber).toBe(null);
  });
});
