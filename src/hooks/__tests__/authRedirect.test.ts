import { resolveAuthRedirect } from '../authRedirect';

describe('resolveAuthRedirect', () => {
  it('sends new players to onboarding', () => {
    expect(resolveAuthRedirect({ status: 'needsProfile', inAuthGroup: false, inDevGroup: false })).toBe('/(auth)/onboarding');
    expect(resolveAuthRedirect({ status: 'needsProfile', inAuthGroup: true, inDevGroup: false })).toBe(null);
  });

  it('sends ready players out of onboarding', () => {
    expect(resolveAuthRedirect({ status: 'ready', inAuthGroup: true, inDevGroup: false })).toBe('/');
    expect(resolveAuthRedirect({ status: 'ready', inAuthGroup: false, inDevGroup: false })).toBe(null);
  });

  it('waits while loading and leaves the dev gallery alone', () => {
    expect(resolveAuthRedirect({ status: 'loading', inAuthGroup: false, inDevGroup: false })).toBe(null);
    expect(resolveAuthRedirect({ status: 'needsProfile', inAuthGroup: false, inDevGroup: true })).toBe(null);
  });
});
