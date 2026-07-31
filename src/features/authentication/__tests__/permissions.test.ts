import { hasPermission, permissionsForRole } from '@/features/authentication/domain/permissions';

describe('permissions', () => {
  it('gives cashiers sales.create but not settings.manage', () => {
    expect(hasPermission('cashier', 'sales.create')).toBe(true);
    expect(hasPermission('cashier', 'settings.manage')).toBe(false);
  });

  it('gives admin the full permission set', () => {
    expect(permissionsForRole('admin')).toContain('users.manage');
    expect(permissionsForRole('admin')).toContain('reports.export');
  });
});
