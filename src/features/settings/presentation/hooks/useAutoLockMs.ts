import { useQuery } from '@tanstack/react-query';
import { APP_CONFIG } from '@/core/config/appConfig';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IAdminSettingsRepository } from '@/features/settings/data/AdminSettingsRepository';

/** Idle lock duration from admin POS settings (milliseconds). */
export function useAutoLockMs() {
  const query = useQuery({
    queryKey: ['admin', 'auto-lock'],
    queryFn: async () => {
      const repo = container.resolve<IAdminSettingsRepository>(TOKENS.AdminSettingsRepository);
      const bundle = await repo.getBundle();
      if (!bundle.ok) throw bundle.error;
      const minutes = bundle.value.pos.autoLockMinutes;
      return Math.max(1, minutes) * 60_000;
    },
    staleTime: 60_000,
  });
  return query.data ?? APP_CONFIG.idleLogoutMs;
}
