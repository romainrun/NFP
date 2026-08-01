import { useQuery } from '@tanstack/react-query';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IAdminSettingsRepository } from '@/features/settings/data/AdminSettingsRepository';
import type { AdminSettingsBundle } from '@/features/settings/domain/adminSettings';

export function useAdminBundle() {
  return useQuery({
    queryKey: ['admin', 'bundle'],
    queryFn: async (): Promise<AdminSettingsBundle> => {
      const repo = container.resolve<IAdminSettingsRepository>(TOKENS.AdminSettingsRepository);
      const result = await repo.getBundle();
      if (!result.ok) throw result.error;
      return result.value;
    },
  });
}
