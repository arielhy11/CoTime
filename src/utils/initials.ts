/** "Dana Levi" → "DL", "ariel" → "A". Works for Hebrew too. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = Array.from(parts[0])[0] ?? '';
  const last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] ?? '' : '';
  return (first + last).toUpperCase();
}

const AVATAR_COLORS = ['#FF5A1F', '#B8F34A', '#FF3B5C', '#FFD23F', '#7C5CFF', '#2EC4FF', '#FF8FD1'] as const;

/** Stable background colour for an initials avatar. */
export function avatarColorFor(seed: number): string {
  return AVATAR_COLORS[seed % AVATAR_COLORS.length];
}

export const MAX_NAME_LENGTH = 20;

export function cleanName(input: string): string {
  return input.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
}
