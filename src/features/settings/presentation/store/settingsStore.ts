import { create } from 'zustand';
import type { ThemePreference } from '@/features/settings/domain/types';

type SettingsState = {
  themePreference: ThemePreference;
  storeName: string;
  setThemePreference: (preference: ThemePreference) => void;
  setStoreName: (name: string) => void;
  hydrate: (input: { themePreference: ThemePreference; storeName: string }) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  themePreference: 'system',
  storeName: 'NaturallyForme',
  setThemePreference: (themePreference) => set({ themePreference }),
  setStoreName: (storeName) => set({ storeName }),
  hydrate: (input) => set(input),
}));
