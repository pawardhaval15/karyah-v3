import { create } from 'zustand';

export const useIssueStore = create((set) => ({
    searchQuery: '',
    setSearchQuery: (query) => set({ searchQuery: query }),

    statusTab: 'all',
    setStatusTab: (tab) => set({ statusTab: tab }),

    showFilters: false,
    setShowFilters: (show) => set({ showFilters: show }),

    filters: {
        status: [],
        projects: [],
        createdBy: [],
        locations: [],
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
            createdBy: [],
            locations: [],
        }
    }),

    getActiveFiltersCount: (state) => {
        return Object.values(state.filters).reduce((count, arr) => count + arr.length, 0);
    }
}));
