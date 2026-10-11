import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { resolveAuthRedirect } from './authRedirect';

/** No profile yet → onboarding. Profile done → main app. */
export function useProtectedRoute(): void {
  const router = useRouter();
  const segments = useSegments();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    const first = segments[0] as string | undefined;
    const target = resolveAuthRedirect({
      status,
      inAuthGroup: first === '(auth)',
      inDevGroup: first === 'dev',
    });
    if (target) router.replace(target);
  }, [status, segments, router]);
}
