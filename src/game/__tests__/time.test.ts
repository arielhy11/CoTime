import { formatClock, formatDuration } from '../time';

describe('formatClock', () => {
  it('formats minutes and hours', () => {
    expect(formatClock(7000)).toBe('0:07');
    expect(formatClock(125_000)).toBe('2:05');
    expect(formatClock(3_729_000)).toBe('1:02:09');
    expect(formatClock(-50)).toBe('0:00');
  });
});

describe('formatDuration', () => {
  it('is compact', () => {
    expect(formatDuration(12_000)).toBe('12s');
    expect(formatDuration(185_000)).toBe('3m 05s');
    expect(formatDuration(4_800_000)).toBe('1h 20m');
  });
});
