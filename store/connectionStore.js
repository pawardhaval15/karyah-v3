import { create } from 'zustand';

export const useConnectionStore = create((set) => ({
    searchQuery: '',
    setSearchQuery: (query) => set({ searchQuery: query }),

    revealedNumbers: new Set(),
    toggleNumberVisibility: (connectionId) => set((state) => {
        const newSet = new Set(state.revealedNumbers);
        if (newSet.has(connectionId)) {
            newSet.delete(connectionId);
        } else {
            newSet.add(connectionId);
        }
        return { revealedNumbers: newSet };
    }),

    selectedConnectionId: null,
    setSelectedConnectionId: (id) => set({ selectedConnectionId: id }),

    clearSelectedConnection: () => set({ selectedConnectionId: null }),
}));
