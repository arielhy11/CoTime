import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import * as Updates from 'expo-updates';
import i18n, { type InitOptions } from 'i18next';
import 'intl-pluralrules';
import { initReactI18next } from 'react-i18next';
import { DevSettings, I18nManager, Platform } from 'react-native';

import enTranslations from './locales/en.json';
import heTranslations from './locales/he.json';

export const LANGUAGE_STORAGE_KEY = 'cotime.language' as const;
/** When we last reloaded to flip layout direction — guards against a reload loop. */
const DIRECTION_RELOAD_KEY = 'cotime.directionReloadAt' as const;
const DIRECTION_RELOAD_GUARD_MS = 15_000;
export type AppLanguage = 'en' | 'he';

function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'en' || value === 'he';
}

function deviceLanguage(): AppLanguage {
  const code = getLocales()[0]?.languageCode;
  return code === 'he' || code === 'iw' ? 'he' : 'en';
}

const initialLanguage = deviceLanguage();

const options = {
  resources: {
    en: { translation: enTranslations },
    he: { translation: heTranslations },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
};

void i18n.use(initReactI18next).init(options as unknown as InitOptions);

async function reloadApp(): Promise<void> {
  if (Platform.OS === 'web') {
    window.location.reload();
    return;
  }
  try {
    await Updates.reloadAsync();
  } catch {
    DevSettings.reload();
  }
}

/**
 * Keep native layout direction in sync with the language. Yoga only picks
 * up a new direction after a reload, so flip + reload once when needed.
 */
async function applyDirection(lang: AppLanguage): Promise<void> {
  const rtl = lang === 'he';
  if (Platform.OS === 'web') {
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    return;
  }
  I18nManager.allowRTL(true);
  if (I18nManager.isRTL === rtl) return;
  I18nManager.forceRTL(rtl);
  const lastReload = Number((await AsyncStorage.getItem(DIRECTION_RELOAD_KEY).catch(() => null)) ?? 0);
  if (Date.now() - lastReload < DIRECTION_RELOAD_GUARD_MS) return;
  await AsyncStorage.setItem(DIRECTION_RELOAD_KEY, String(Date.now())).catch(() => undefined);
  await reloadApp();
}

/** Restore the saved language choice (or the device language) on launch. */
export async function hydrateLanguage(): Promise<void> {
  let lang = initialLanguage;
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isAppLanguage(stored)) lang = stored;
  } catch {
    // Keep the device language.
  }
  if (i18n.language !== lang) await i18n.changeLanguage(lang);
  await applyDirection(lang);
}

export async function changeLanguage(lang: AppLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // The switch still applies for this run.
  }
  await applyDirection(lang);
}

export default i18n;
