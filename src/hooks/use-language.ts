import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { LANGUAGE_STORAGE_KEY, LanguagePreference, getSystemLanguage } from '@/i18n';

export function useLanguage() {
  const [preference, setPreferenceState] = useState<LanguagePreference>('system');
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'es'>(
    (i18n.language?.startsWith('es') ? 'es' : 'en') as 'en' | 'es'
  );

  useEffect(() => {
    async function loadPreference() {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved === 'en' || saved === 'es' || saved === 'system') {
          setPreferenceState(saved as LanguagePreference);
        }
      } catch {
        // ignore
      }
    }
    loadPreference();

    const handleLanguageChanged = (lng: string) => {
      setCurrentLanguage(lng.startsWith('es') ? 'es' : 'en');
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  const setLanguagePreference = useCallback(async (newPref: LanguagePreference) => {
    setPreferenceState(newPref);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newPref);
    } catch {
      // ignore
    }

    const resolvedLang = newPref === 'system' ? getSystemLanguage() : newPref;
    await i18n.changeLanguage(resolvedLang);
  }, []);

  return {
    preference,
    currentLanguage,
    setLanguagePreference,
  };
}
