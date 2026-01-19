import { create } from 'zustand';

export const useTaskStore = create((set, get) => ({
    searchQuery: '',
    setSearchQuery: (query) => set({ searchQuery: query }),

    activeTab: 'mytasks',
    setActiveTab: (tab) => set({ activeTab: tab }),

    showFilters: false,
    setShowFilters: (show) => set({ showFilters: show }),

    filters: {
        status: [],
        projects: [],
        assignedTo: [],
        locations: [],
        tags: [],
        mode: [],
        category: [],
    },

    toggleFilter: (filterType, value) => set((state) => {
        const current = state.filters[filterType];
        const updated = current.includes(value)
            ? current.filter(item => item !== value)
            : [...current, value];
        return {
            filters: {
                ...state.filters,
                [filterType]: updated
            }
        };
    }),

    clearAllFilters: () => set({
        filters: {
            status: [],
            projects: [],
            assignedTo: [],
            locations: [],
            tags: [],
            mode: [],
            category: [],
        }
    }),

    getActiveFiltersCount: () => {
        const state = get();
        return Object.values(state.filters).reduce((count, arr) => count + arr.length, 0);
    },

    // UI state for popups can also be managed here if desired, 
    // but for now keeping it local to the screen is fine or we can migrate later.
}));
