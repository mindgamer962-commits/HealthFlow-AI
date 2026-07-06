import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  selectedPHCId: string | null; // For filtering the district dashboard by a specific PHC
  searchQuery: string;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSelectedPHCId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  selectedPHCId: null,
  searchQuery: '',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSelectedPHCId: (id) => set({ selectedPHCId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
