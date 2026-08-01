import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';
import { useAuthStore } from '@/features/authentication/presentation/store/authStore';
import { useAutoLockMs } from '@/features/settings/presentation/hooks/useAutoLockMs';

/**
 * Locks the POS after idle timeout — required for unattended tills.
 */
export function useIdleLogout() {
  const { logout, isAuthenticated } = useAuth();
  const lastActivityAt = useAuthStore((s) => s.lastActivityAt);
  const touchActivity = useAuthStore((s) => s.touchActivity);
  const autoLockMs = useAutoLockMs();

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const idleMs = Date.now() - lastActivityAt;
      if (idleMs >= autoLockMs) {
        void logout();
      }
    }, 15_000);

    return () => clearInterval(interval);
  }, [isAuthenticated, lastActivityAt, logout, autoLockMs]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        touchActivity();
      }
    });
    return () => sub.remove();
  }, [touchActivity]);
}
