import type { AuthStatus } from '../store/authStore';

export type AuthRedirectTarget = '/(auth)/onboarding' | '/' | null;

/** Pure routing table for the profile gate. */
export function resolveAuthRedirect(input: { status: AuthStatus; inAuthGroup: boolean; inDevGroup: boolean }): AuthRedirectTarget {
  if (input.inDevGroup) return null;
  if (input.status === 'needsProfile') {
    return input.inAuthGroup ? null : '/(auth)/onboarding';
  }
  if (input.status === 'ready' && input.inAuthGroup) {
    return '/';
  }
  return null;
}
