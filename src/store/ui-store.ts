import { create } from 'zustand';

/** Short-lived UI state that isn't saved (e.g. the cheat-day celebration). */
interface UiState {
  celebrating: boolean;
  celebrate: () => void;
  stopCelebrating: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  celebrating: false,
  celebrate: () => set({ celebrating: true }),
  stopCelebrating: () => set({ celebrating: false }),
}));
