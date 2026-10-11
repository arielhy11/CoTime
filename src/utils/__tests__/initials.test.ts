import { avatarColorFor, cleanName, initialsOf, MAX_NAME_LENGTH } from '../initials';

describe('initialsOf', () => {
  it('takes first and last initials', () => {
    expect(initialsOf('Dana Levi')).toBe('DL');
    expect(initialsOf('  ariel  ')).toBe('A');
    expect(initialsOf('נועה כהן')).toBe('נכ');
    expect(initialsOf('')).toBe('?');
  });
});

describe('cleanName', () => {
  it('collapses spaces and caps length', () => {
    expect(cleanName('  Big   Mo  ')).toBe('Big Mo');
    expect(cleanName('x'.repeat(40)).length).toBe(MAX_NAME_LENGTH);
  });
});

describe('avatarColorFor', () => {
  it('is stable', () => {
    expect(avatarColorFor(3)).toBe(avatarColorFor(3));
  });
});
