import { onAuthStateChanged, signInAnonymously, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * CoTime uses anonymous accounts: open the app, type a name, take a selfie,
 * play. The account persists on the device (AsyncStorage persistence).
 */
export async function signInAsGuest(): Promise<string> {
  const credential = await signInAnonymously(auth);
  return credential.user.uid;
}

export function listenToAuth(callback: (uid: string | null) => void): () => void {
  return onAuthStateChanged(auth, (user: FirebaseUser | null) => callback(user?.uid ?? null));
}
