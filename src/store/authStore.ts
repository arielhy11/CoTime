import { create } from 'zustand';
import { listenToAuth, signInAsGuest } from '../api/auth';
import { getUserById, saveUserProfile } from '../api/users';
import type { User } from '../models/User';
import { toAvatarDataUri } from '../utils/avatarImage';
import { cleanName } from '../utils/initials';
import { errorMessageOf } from '../utils/errors';

export type AuthStatus = 'loading' | 'needsProfile' | 'ready' | 'error';

export type PhotoChange =
  | { kind: 'keep' }
  | { kind: 'remove' }
  | { kind: 'new'; localUri: string };

interface AuthState {
  uid: string | null;
  profile: User | null;
  status: AuthStatus;
  error: string | null;
  saveProfile: (name: string, photo: PhotoChange) => Promise<void>;
  retry: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  uid: null,
  profile: null,
  status: 'loading',
  error: null,

  saveProfile: async (rawName, photo) => {
    const uid = get().uid;
    if (!uid) {
      throw new Error('Must be signed in to save a profile');
    }
    const name = cleanName(rawName);
    if (!name) {
      throw new Error('Name is required');
    }
    const current = get().profile;
    const photoURL =
      photo.kind === 'new'
        ? await toAvatarDataUri(photo.localUri)
        : photo.kind === 'remove'
          ? null
          : current?.photoURL ?? null;

    const saved = await saveUserProfile({
      uid,
      name,
      photoURL,
      createdAt: current?.createdAt ?? Date.now(),
    });
    set({ profile: saved, status: 'ready' });
  },

  retry: async () => {
    set({ status: 'loading', error: null });
    await resolveAccount(get().uid);
  },
}));

async function resolveAccount(uid: string | null): Promise<void> {
  try {
    if (!uid) {
      // onAuthStateChanged fires again with the new uid.
      await signInAsGuest();
      return;
    }
    const profile = await getUserById(uid);
    useAuthStore.setState({
      uid,
      profile,
      status: profile ? 'ready' : 'needsProfile',
      error: null,
    });
  } catch (error) {
    console.error('Account setup failed:', errorMessageOf(error));
    useAuthStore.setState({ status: 'error', error: errorMessageOf(error) });
  }
}

listenToAuth((uid) => {
  useAuthStore.setState({ uid });
  void resolveAccount(uid);
});
