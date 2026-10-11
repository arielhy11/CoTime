import { SessionError } from '../api/sessions';

/** Maps an error to an i18n key for a friendly message. */
export function errorKeyOf(error: unknown): string {
  if (error instanceof SessionError) {
    return `errors.${error.code}`;
  }
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : '';
  if (code === 'unavailable' || code === 'auth/network-request-failed') return 'errors.offline';
  if (code === 'permission-denied') return 'errors.permission';
  return 'errors.generic';
}

export function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
