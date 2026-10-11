import { missingFirebaseEnv } from '../validateFirebaseConfig';

describe('missingFirebaseEnv', () => {
  const full = {
    apiKey: 'k', authDomain: 'd', projectId: 'p', storageBucket: '', messagingSenderId: '', appId: 'a',
  };

  it('accepts a complete config (bucket and sender are optional)', () => {
    expect(missingFirebaseEnv(full)).toEqual([]);
  });

  it('names the env vars that are missing', () => {
    expect(missingFirebaseEnv({ ...full, apiKey: ' ', appId: '' })).toEqual(['EXPO_PUBLIC_API_KEY', 'EXPO_PUBLIC_APP_ID']);
  });
});
