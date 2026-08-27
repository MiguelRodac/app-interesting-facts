import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import enCommon from '@/locales/en/common.json';
import enAuth from '@/locales/en/auth.json';
import enFeed from '@/locales/en/feed.json';
import enSearch from '@/locales/en/search.json';
import enCreate from '@/locales/en/create.json';
import enProfile from '@/locales/en/profile.json';
import enSettings from '@/locales/en/settings.json';

import esCommon from '@/locales/es/common.json';
import esAuth from '@/locales/es/auth.json';
import esFeed from '@/locales/es/feed.json';
import esSearch from '@/locales/es/search.json';
import esCreate from '@/locales/es/create.json';
import esProfile from '@/locales/es/profile.json';
import esSettings from '@/locales/es/settings.json';

export const LANGUAGE_STORAGE_KEY = 'app_language_preference';

export type LanguagePreference = 'system' | 'en' | 'es';

export const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    feed: enFeed,
    search: enSearch,
    create: enCreate,
    profile: enProfile,
    settings: enSettings,
  },
  es: {
    common: esCommon,
    auth: esAuth,
    feed: esFeed,
    search: esSearch,
    create: esCreate,
    profile: esProfile,
    settings: esSettings,
  },
} as const;

export function getSystemLanguage(): 'en' | 'es' {
  const locales = Localization.getLocales();
  const deviceLang = locales?.[0]?.languageCode?.toLowerCase() ?? 'en';
  return deviceLang.startsWith('es') ? 'es' : 'en';
}

export async function initI18n() {
  if (i18n.isInitialized) return i18n;

  let initialLanguage: 'en' | 'es' = getSystemLanguage();

  try {
    const savedPref = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedPref === 'en' || savedPref === 'es') {
      initialLanguage = savedPref;
    }
  } catch {
    // fallback to system language on storage error
  }

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLanguage,
      fallbackLng: 'en',
      defaultNS: 'common',
      ns: ['common', 'auth', 'feed', 'search', 'create', 'profile', 'settings'],
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });

  return i18n;
}

// Kick off initialization immediately
initI18n();

export default i18n;
