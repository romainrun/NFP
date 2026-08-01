import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import { useAuthStore } from '@/features/authentication/presentation/store/authStore';
import type { IUserRepository } from '@/features/authentication/data/UserRepository';

/** Updates in-app idle timer and persists last_activity_at for sync. */
export async function trackActivity(userId?: string): Promise<void> {
  useAuthStore.getState().touchActivity();
  const id = userId ?? useAuthStore.getState().session?.employee.id;
  if (!id) return;
  const users = container.resolve<IUserRepository>(TOKENS.UserRepository);
  await users.touchActivity(id);
}
