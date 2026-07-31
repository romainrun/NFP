import type { Permission, UserRole } from '@/features/authentication/domain/types';

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  cashier: ['sales.create', 'dashboard.view'],
  manager: [
    'sales.create',
    'sales.refund',
    'sales.void',
    'sales.oversell',
    'inventory.manage',
    'reports.view',
    'reports.export',
    'dashboard.view',
  ],
  admin: [
    'sales.create',
    'sales.refund',
    'sales.void',
    'sales.oversell',
    'inventory.manage',
    'reports.view',
    'reports.export',
    'settings.manage',
    'users.manage',
    'dashboard.view',
  ],
};

export function permissionsForRole(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
