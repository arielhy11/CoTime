import { collection, doc, documentId, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User } from '../models/User';
import { parseUser } from './parse';

export const USERS_COLLECTION = 'users' as const;
/** Firestore `in` queries take at most 30 values. */
const IN_QUERY_LIMIT = 30;

export async function getUserById(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  return snap.exists() ? parseUser(snap.id, snap.data()) : null;
}

export async function saveUserProfile(user: User): Promise<User> {
  await setDoc(doc(db, USERS_COLLECTION, user.uid), {
    name: user.name,
    photoURL: user.photoURL,
    createdAt: user.createdAt,
  });
  return user;
}

/** Batch-load profiles (photos) for everyone at the table. */
export async function getUsersByIds(uids: string[]): Promise<User[]> {
  const unique = [...new Set(uids)];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += IN_QUERY_LIMIT) {
    chunks.push(unique.slice(i, i + IN_QUERY_LIMIT));
  }
  const results = await Promise.all(
    chunks.map((ids) => getDocs(query(collection(db, USERS_COLLECTION), where(documentId(), 'in', ids))))
  );
  return results.flatMap((snap) => snap.docs.map((d) => parseUser(d.id, d.data())));
}
