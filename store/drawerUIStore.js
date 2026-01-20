import { create } from 'zustand';

export const useDrawerUIStore = create((set) => ({
    showLanguageModal: false,
    setShowLanguageModal: (visible) => set({ showLanguageModal: visible }),

    // Any other drawer-specific UI state can go here
}));
