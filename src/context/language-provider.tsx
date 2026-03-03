'use client';

import React, { createContext, useState, ReactNode, useMemo, useCallback } from 'react';
import es from '@/locales/es.json';
import en from '@/locales/en.json';

type Locale = 'en' | 'es';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: Record<string, any>) => string;
}

const translations = { es, en };

export const LanguageContext = createContext<LanguageContextType>({
  locale: 'es',
  setLocale: () => {},
  t: () => '',
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocale] = useState<Locale>('es');

  const t = useCallback((key: string, values?: Record<string, any>): string => {
    const keys = key.split('.');
    let result: any = translations[locale];
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        return key;
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

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
