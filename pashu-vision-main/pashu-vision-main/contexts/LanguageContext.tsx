
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { translations } from '../utils/translations';

type Language = 'en' | 'hi';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string, options?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Helper function to get nested keys and replace placeholders
const getNestedValue = (obj: any, key: string, options?: { [key: string]: string | number }): string => {
  let value = key.split('.').reduce((acc, part) => acc && acc[part], obj);
  if (value && options) {
    Object.keys(options).forEach(placeholder => {
      value = value.replace(`{${placeholder}}`, String(options[placeholder]));
    });
  }
  return value;
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const toggleLanguage = useCallback(() => {
    setLanguage(prevLang => (prevLang === 'en' ? 'hi' : 'en'));
  }, []);

  const t = useCallback((key: string, options?: { [key: string]: string | number }): string => {
    const translation = getNestedValue(translations[language], key, options);
    if (!translation) {
      console.warn(`Translation key "${key}" not found for language "${language}". Falling back to English.`);
      const fallback = getNestedValue(translations['en'], key, options);
      return fallback || key;
    }
    return translation;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
