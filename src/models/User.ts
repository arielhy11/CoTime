export interface User {
  uid: string;
  /** Display name shown around the table. 1–20 chars. */
  name: string;
  /**
   * Small JPEG data URI (≈256px). Stored on the Firestore doc so the app
   * needs no Cloud Storage bucket. null = initials avatar.
   */
  photoURL: string | null;
  createdAt: number;
}
