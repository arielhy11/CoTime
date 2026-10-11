import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function safe(run: () => Promise<void>): void {
  if (Platform.OS === 'web') return;
  void run().catch(() => undefined);
}

/** Someone at the table picked up: a buzz everyone feels through the table. */
export function buzzSomeoneCracked(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

/** You got caught. */
export function buzzBusted(): void {
  safe(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await sleep(120);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  });
}

/** Knock-out: a long rumble. */
export function buzzExplosion(): void {
  safe(async () => {
    for (let i = 0; i < 4; i += 1) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await sleep(70);
    }
  });
}

export function buzzTap(): void {
  safe(() => Haptics.selectionAsync());
}

export function buzzSuccess(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}
