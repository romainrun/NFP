import { useEffect } from 'react';
import { AppState } from 'react-native';
import { APP_CONFIG } from '@/core/config/appConfig';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';
import { useAuthStore } from '@/features/authentication/presentation/store/authStore';

/**
 * Locks the POS after idle timeout — required for unattended tills.
 */
export function useIdleLogout() {
  const { logout, isAuthenticated } = useAuth();
  const lastActivityAt = useAuthStore((s) => s.lastActivityAt);
  const touchActivity = useAuthStore((s) => s.touchActivity);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const idleMs = Date.now() - lastActivityAt;
      if (idleMs >= APP_CONFIG.idleLogoutMs) {
        void logout();
      }
    }, 15_000);

    return () => clearInterval(interval);
  }, [isAuthenticated, lastActivityAt, logout]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        touchActivity();
      }
    });
    return () => sub.remove();
  }, [touchActivity]);
}
