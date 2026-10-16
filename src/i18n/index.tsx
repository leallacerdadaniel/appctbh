import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { strings, type Lang, type Strings } from './strings';

export { languages, type Lang } from './strings';

const STORAGE_KEY = 'ctbh.lang';

/** French devices get French; everyone else starts in English. */
function deviceLang(): Lang {
  return getLocales()[0]?.languageCode === 'fr' ? 'fr' : 'en';
}

type I18n = { lang: Lang; t: Strings; setLang: (lang: Lang) => void };

const I18nContext = createContext<I18n | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(deviceLang);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'fr' || saved === 'en') setLangState(saved);
      })
      .catch(() => {});
  }, []);

  function setLang(next: Lang) {
    setLangState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }

  return (
    <I18nContext.Provider value={{ lang, t: strings[lang], setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside LanguageProvider');
  return ctx;
}
