import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import { useAuthStore } from '@/features/authentication/presentation/store/authStore';
import type { IUserRepository } from '@/features/authentication/data/UserRepository';
import type { IAuditService } from '@/shared/services/audit/AuditService';
import type { AuditAction } from '@/shared/services/audit/AuditService';

/** Updates in-app idle timer, persists last_activity_at, and optionally logs audit. */
export async function trackActivity(
  userId?: string,
  auditAction?: AuditAction,
  auditPayload?: Record<string, unknown>,
): Promise<void> {
  useAuthStore.getState().touchActivity();
  const id = userId ?? useAuthStore.getState().session?.employee.id;
  if (!id) return;
  const users = container.resolve<IUserRepository>(TOKENS.UserRepository);
  await users.touchActivity(id);

  if (auditAction) {
    const audit = container.resolve<IAuditService>(TOKENS.AuditService);
    await audit.log({
      userId: id,
      action: auditAction,
      payload: auditPayload,
    });
  }
}

export async function logSettingsChange(section: string, userId?: string): Promise<void> {
  await trackActivity(userId, 'config_change', { section });
}
