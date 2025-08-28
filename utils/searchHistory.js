import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_HISTORY_KEY = 'smart_search_history';
const MAX_HISTORY_ITEMS = 10;

export const saveSearchHistory = async (query, resultType = null) => {
  try {
    if (!query || query.trim().length < 2) return;
    
    const existingHistory = await getSearchHistory();
    const newHistoryItem = {
      id: Date.now().toString(),
      query: query.trim(),
      resultType,
      timestamp: new Date().toISOString()
    };
    
    // Remove duplicate if exists
    const filteredHistory = existingHistory.filter(item => 
      item.query.toLowerCase() !== query.toLowerCase()
    );
    
    // Add new item at the beginning
    const updatedHistory = [newHistoryItem, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
    
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error saving search history:', error);
  }
};

export const getSearchHistory = async () => {
  try {
    const historyString = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
    return historyString ? JSON.parse(historyString) : [];
  } catch (error) {
    console.error('Error getting search history:', error);
    return [];
  }
};

export const clearSearchHistory = async () => {
  try {
    await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch (error) {
    console.error('Error clearing search history:', error);
  }
};

export const removeSearchHistoryItem = async (itemId) => {
  try {
    const existingHistory = await getSearchHistory();
    const updatedHistory = existingHistory.filter(item => item.id !== itemId);
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error removing search history item:', error);
  }
};

export default {
  saveSearchHistory,
  getSearchHistory,
  clearSearchHistory,
  removeSearchHistoryItem
};
