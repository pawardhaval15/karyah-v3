import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../utils/mmkv';

export const useSettingsStore = create(
    persist(
        (set) => ({
            biometricEnabled: false,
            customNotificationsEnabled: true,
            setBiometricEnabled: (enabled) => set({ biometricEnabled: enabled }),
            setCustomNotificationsEnabled: (enabled) => set({ customNotificationsEnabled: enabled }),
        }),
        {
            name: 'settings-storage',
            storage: createJSONStorage(() => mmkvStorage),
        }
    )
);
