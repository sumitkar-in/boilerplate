import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './locales/en';

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en,
    },
    lng: localStorage.getItem('boilerplate.language') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
