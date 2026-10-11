import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const SOUND_KEY = 'cotime.soundEnabled' as const;

interface SettingsState {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  hydrate: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  soundEnabled: true,

  setSoundEnabled: (enabled) => {
    set({ soundEnabled: enabled });
    void AsyncStorage.setItem(SOUND_KEY, enabled ? '1' : '0').catch(() => undefined);
  },

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(SOUND_KEY);
      if (stored !== null) set({ soundEnabled: stored === '1' });
    } catch {
      // Keep the default.
    }
  },
}));
