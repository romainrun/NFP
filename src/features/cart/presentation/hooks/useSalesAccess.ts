import { hasPermission } from '@/features/authentication/domain/permissions';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';

export function useSalesAccess() {
  const { session } = useAuth();
  const canSell = Boolean(session && hasPermission(session.employee.role, 'sales.create'));

  return {
    canSell,
    userId: session?.employee.id,
    displayName: session?.employee.displayName,
  };
}
