import { create } from 'zustand';
import { listRecentSessions } from '../api/sessions';
import type { Session } from '../models/Session';
import { errorMessageOf } from '../utils/errors';

interface HistoryState {
  sessions: Session[];
  isLoading: boolean;
  error: string | null;
  load: (uid: string) => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  sessions: [],
  isLoading: false,
  error: null,

  load: async (uid) => {
    set({ isLoading: true, error: null });
    try {
      const sessions = await listRecentSessions(uid);
      set({ sessions: sessions.filter((s) => s.status === 'finished' && s.startsAt !== null), isLoading: false });
    } catch (error) {
      console.error('Loading game history failed:', errorMessageOf(error));
      set({ isLoading: false, error: errorMessageOf(error) });
    }
  },
}));
