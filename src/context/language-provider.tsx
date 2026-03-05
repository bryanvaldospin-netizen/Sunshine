'use client';

import React, { createContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import es from '@/locales/es.json';
import en from '@/locales/en.json';
import enGB from '@/locales/en-GB.json';

type Locale = 'en' | 'es' | 'en-GB';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: Record<string, any>) => string;
}

const translations = { es, en, 'en-GB': enGB };

export const LanguageContext = createContext<LanguageContextType>({
  locale: 'es',
  setLocale: () => {},
  t: () => '',
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>('es');

  useEffect(() => {
    const storedLocale = localStorage.getItem('locale') as Locale | null;
    if (storedLocale && ['es', 'en', 'en-GB'].includes(storedLocale)) {
      setLocaleState(storedLocale);
    }
  }, []);
  
  const setLocale = (newLocale: Locale) => {
    try {
      localStorage.setItem('locale', newLocale);
      setLocaleState(newLocale);
    } catch (error) {
      console.error("Could not save locale to localStorage:", error);
    }
  };

  const t = useCallback((key: string, values?: Record<string, any>): string => {
    const keys = key.split('.');
    let result: any = translations[locale];
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        // Fallback to English if key not found in current locale
        let fallbackResult: any = translations['en'];
        for (const fk of keys) {
            fallbackResult = fallbackResult?.[fk];
            if(fallbackResult === undefined) return key;
        }
        result = fallbackResult;
        break;
      }
    }

    let str = result as string;
    if (values) {
      for (const valueKey in values) {
        if (Object.prototype.hasOwnProperty.call(values, valueKey)) {
          const regex = new RegExp(`{${valueKey}}`, 'g');
          str = str.replace(regex, values[valueKey] ?? '');
        }
      }
    }
    return str;
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t, setLocale]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
