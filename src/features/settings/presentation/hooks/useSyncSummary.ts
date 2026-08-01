import { useQuery } from '@tanstack/react-query';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { ISyncRepository } from '@/features/sync/data/SyncRepository';
import type { IAdminSettingsRepository } from '@/features/settings/data/AdminSettingsRepository';

export type SyncSummary = {
  pendingCount: number;
  failedCount: number;
  backendAvailable: boolean;
  simulateOffline: boolean;
  newCatalogAvailable: boolean;
  newDataAvailable: boolean;
  lastSuccessfulSyncAt: string | null;
  apiUrl: string;
};

export function useSyncSummary() {
  return useQuery({
    queryKey: ['sync', 'summary'],
    queryFn: async (): Promise<SyncSummary> => {
      const syncRepo = container.resolve<ISyncRepository>(TOKENS.SyncRepository);
      const adminRepo = container.resolve<IAdminSettingsRepository>(TOKENS.AdminSettingsRepository);

      const pending = await syncRepo.countPending();
      const failed = await syncRepo.countFailed();
      const bundle = await adminRepo.getBundle();

      const sync = bundle.ok ? bundle.value.sync : null;

      return {
        pendingCount: pending.ok ? pending.value : 0,
        failedCount: failed.ok ? failed.value : 0,
        backendAvailable: sync?.backendAvailable ?? false,
        simulateOffline: sync?.simulateOffline ?? false,
        newCatalogAvailable: sync?.newCatalogAvailable ?? false,
        newDataAvailable: sync?.newDataAvailable ?? false,
        lastSuccessfulSyncAt: sync?.lastSuccessfulSyncAt ?? null,
        apiUrl: sync?.apiUrl ?? '',
      };
    },
    refetchInterval: 30_000,
  });
}
