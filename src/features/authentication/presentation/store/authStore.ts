import { create } from 'zustand';
import type { AuthSession, Employee } from '@/features/authentication/domain/types';

type AuthState = {
  session: AuthSession | null;
  isBootstrapping: boolean;
  lastActivityAt: number;
  setSession: (session: AuthSession | null) => void;
  setBootstrapping: (value: boolean) => void;
  touchActivity: () => void;
  employee: () => Employee | null;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  isBootstrapping: true,
  lastActivityAt: Date.now(),
  setSession: (session) => set({ session, lastActivityAt: Date.now() }),
  setBootstrapping: (isBootstrapping) => set({ isBootstrapping }),
  touchActivity: () => set({ lastActivityAt: Date.now() }),
  employee: () => get().session?.employee ?? null,
}));
