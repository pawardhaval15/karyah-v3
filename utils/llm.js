import { API_URL } from './config'; // Make sure this path is correct
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function translateText(text, sourceLang, targetLang) {
  try {
    const response = await fetch(`${API_URL}api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        sourceLang,     // e.g. 'en'
    targetLang,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Translation API error');
    }
    const data = await response.json();
    return data.translation;
  } catch (error) {
    console.error('Translation error:', error.message);
    throw error;
  }
}

