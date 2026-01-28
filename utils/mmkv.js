import AsyncStorage from '@react-native-async-storage/async-storage';

let mmkvInstance = null;
let isMMKVAvailable = false;

try {
    const { MMKV } = require('react-native-mmkv');
    mmkvInstance = new MMKV();
    isMMKVAvailable = true;
} catch (e) {
    // Silence error, we will use fallback
}

/**
 * A safe wrapper around MMKV with AsyncStorage fallback
 */
export const storage = {
    set: (key, value) => {
        if (isMMKVAvailable && mmkvInstance) {
            mmkvInstance.set(key, value);
        } else {
            AsyncStorage.setItem(key, value);
        }
    },
    getString: (key) => {
        if (isMMKVAvailable && mmkvInstance) {
            return mmkvInstance.getString(key);
        }
        // AsyncStorage is async, but we need sync for getString behavior.
        // In Expo Go, this will return null immediately. 
        // For settings, it's better to use mmkvStorage wrapper for Zustand.
        return null;
    },
    delete: (key) => {
        if (isMMKVAvailable && mmkvInstance) {
            mmkvInstance.delete(key);
        } else {
            AsyncStorage.removeItem(key);
        }
    },
};

/**
 * Zustand-compatible storage wrapper
 */
export const mmkvStorage = {
    setItem: (key, value) => {
        if (isMMKVAvailable && mmkvInstance) {
            mmkvInstance.set(key, value);
        } else {
            AsyncStorage.setItem(key, value);
        }
    },
    getItem: async (key) => {
        if (isMMKVAvailable && mmkvInstance) {
            return mmkvInstance.getString(key) ?? null;
        }
        return await AsyncStorage.getItem(key);
    },
    removeItem: async (key) => {
        if (isMMKVAvailable && mmkvInstance) {
            mmkvInstance.delete(key);
        } else {
            await AsyncStorage.removeItem(key);
        }
    },
};
