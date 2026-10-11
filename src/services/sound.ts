import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useSettingsStore } from '../store/settingsStore';

const SOURCES = {
  boom: require('../../assets/sounds/boom.wav'),
  crack: require('../../assets/sounds/crack.wav'),
  alarm: require('../../assets/sounds/alarm.wav'),
  whistle: require('../../assets/sounds/whistle.wav'),
  fanfare: require('../../assets/sounds/fanfare.wav'),
  tick: require('../../assets/sounds/tick.wav'),
  go: require('../../assets/sounds/go.wav'),
  sad: require('../../assets/sounds/sad.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

const players: Partial<Record<SoundName, AudioPlayer>> = {};

/** Phones are face down and usually on silent — the boom should still be heard. */
export async function initSounds(): Promise<void> {
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch (error) {
    console.error('Audio mode setup failed:', error instanceof Error ? error.message : error);
  }
}

function playerFor(name: SoundName): AudioPlayer {
  const existing = players[name];
  if (existing) return existing;
  const created = createAudioPlayer(SOURCES[name]);
  players[name] = created;
  return created;
}

export function playSound(name: SoundName): void {
  if (!useSettingsStore.getState().soundEnabled) return;
  try {
    const player = playerFor(name);
    void player.seekTo(0).then(() => player.play());
  } catch (error) {
    console.error(`Sound ${name} failed:`, error instanceof Error ? error.message : error);
  }
}
