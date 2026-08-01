import type { Result } from '@/core/types/Result';
import type {
  ServerBackupRequestResult,
  ServerInfoSnapshot,
} from '@/features/sync/domain/serverInfo';

export interface IServerInfoRepository {
  getSnapshot(): Promise<Result<ServerInfoSnapshot>>;
  requestServerBackup(): Promise<Result<ServerBackupRequestResult>>;
}
