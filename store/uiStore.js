import { create } from 'zustand';

export const useUIStore = create((set) => ({
    drawerOpen: false,
    homeRefreshing: false,
    homeRefreshKey: 0,
    setDrawerOpen: (open) => set({ drawerOpen: open }),
    toggleDrawer: () => set((state) => ({ drawerOpen: !state.drawerOpen })),
    setHomeRefreshing: (refreshing) => set({ homeRefreshing: refreshing }),
    incrementHomeRefreshKey: () => set((state) => ({ homeRefreshKey: state.homeRefreshKey + 1 })),
}));
