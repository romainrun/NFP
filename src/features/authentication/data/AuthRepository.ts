import type { Result } from '@/core/types/Result';
import type {
  AuthSession,
  Employee,
  PinLoginInput,
} from '@/features/authentication/domain/types';

export interface IAuthRepository {
  listActiveEmployees(): Promise<Result<Employee[]>>;
  loginWithPin(input: PinLoginInput): Promise<Result<AuthSession>>;
  logout(session: AuthSession): Promise<Result<void>>;
}
