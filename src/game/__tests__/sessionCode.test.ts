import { CODE_ALPHABET, CODE_LENGTH, generateSessionCode, isCompleteSessionCode, normalizeSessionCode } from '../sessionCode';

describe('session codes', () => {
  it('generates codes from the safe alphabet', () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateSessionCode();
      expect(code.length).toBe(CODE_LENGTH);
      expect(code.split('').every((c) => CODE_ALPHABET.includes(c))).toBe(true);
    }
  });

  it('is deterministic with a fixed random source', () => {
    expect(generateSessionCode(() => 0)).toBe('AAAAA');
    expect(generateSessionCode(() => 0.99999)).toBe('99999');
  });

  it('normalises typed input', () => {
    expect(normalizeSessionCode(' ab-c d7 ')).toBe('ABCD7');
    expect(normalizeSessionCode('abcdefgh')).toBe('ABCDE');
    expect(normalizeSessionCode('o0i1l')).toBe('');
  });

  it('knows when a code is complete', () => {
    expect(isCompleteSessionCode('ABCD7')).toBe(true);
    expect(isCompleteSessionCode('ABCD')).toBe(false);
    expect(isCompleteSessionCode('ABCD0')).toBe(false);
  });
});
