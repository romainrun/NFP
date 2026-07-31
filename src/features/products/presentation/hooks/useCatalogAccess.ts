import { hasPermission } from '@/features/authentication/domain/permissions';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';

/** Gates catalog mutations to manager/admin via inventory.manage. */
export function useCatalogAccess() {
  const { session } = useAuth();
  const canManage = Boolean(
    session && hasPermission(session.employee.role, 'inventory.manage'),
  );

  return {
    canManage,
    userId: session?.employee.id,
    role: session?.employee.role,
  };
}
