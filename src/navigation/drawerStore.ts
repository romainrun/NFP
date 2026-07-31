import { create } from 'zustand';
import type { MainParamList } from '@/navigation/types';

type DrawerState = {
  isOpen: boolean;
  activeRoute: keyof MainParamList;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setActiveRoute: (route: keyof MainParamList) => void;
};

/** Controlled side menu — avoids RN Drawer “stuck open” issues on tablets/Expo Go. */
export const useDrawerStore = create<DrawerState>((set, get) => ({
  isOpen: false,
  activeRoute: 'Dashboard',
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set({ isOpen: !get().isOpen }),
  setActiveRoute: (route) => set({ activeRoute: route }),
}));
