import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import fr from './locales/fr.json';
// import hi from './locales/hi.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    //   hi: { translation: hi }
    },
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

// Save language preference on change
i18n.on('languageChanged', async (lng) => {
  try {
    await AsyncStorage.setItem('appLanguage', lng);
  } catch (e) {
    console.error('Failed to save language to AsyncStorage', e);
  }
});

// Function to initialize language on app start
export async function initI18n() {
  try {
    const storedLang = await AsyncStorage.getItem('appLanguage');
    if (storedLang) {
      await i18n.changeLanguage(storedLang);
    }
  } catch (e) {
    console.error('Failed to load language from AsyncStorage', e);
  }
}

export default i18n;
