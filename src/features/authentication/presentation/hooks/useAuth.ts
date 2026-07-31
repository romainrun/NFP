import { useCallback, useState } from 'react';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IAuthRepository } from '@/features/authentication/data/AuthRepository';
import { useAuthStore } from '@/features/authentication/presentation/store/authStore';

export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const setSession = useAuthStore((s) => s.setSession);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loginWithPin = useCallback(
    async (employeeCode: string, pin: string) => {
      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        const auth = container.resolve<IAuthRepository>(TOKENS.AuthRepository);
        const result = await auth.loginWithPin({ employeeCode, pin });

        if (!result.ok) {
          setErrorMessage(result.error.message);
          return false;
        }

        setSession(result.value);
        return true;
      } finally {
        setIsSubmitting(false);
      }
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    if (!session) return;
    const auth = container.resolve<IAuthRepository>(TOKENS.AuthRepository);
    await auth.logout(session);
    setSession(null);
  }, [session, setSession]);

  return {
    session,
    isAuthenticated: Boolean(session),
    isSubmitting,
    errorMessage,
    clearError: () => setErrorMessage(null),
    loginWithPin,
    logout,
  };
}
