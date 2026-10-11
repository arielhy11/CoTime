/** No 0/O, 1/I/L — codes get read out loud across a noisy table. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 5;

export function generateSessionCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  }
  return code;
}

/** Uppercase and drop anything that can't be in a code (spaces, dashes, look-alikes). */
export function normalizeSessionCode(input: string): string {
  return input
    .toUpperCase()
    .split('')
    .filter((ch) => CODE_ALPHABET.includes(ch))
    .join('')
    .slice(0, CODE_LENGTH);
}

export function isCompleteSessionCode(code: string): boolean {
  return code.length === CODE_LENGTH && code.split('').every((ch) => CODE_ALPHABET.includes(ch));
}
