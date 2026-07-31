export type UserRole = 'admin' | 'manager' | 'cashier';

export type Permission =
  | 'sales.create'
  | 'sales.refund'
  | 'sales.void'
  | 'inventory.manage'
  | 'reports.view'
  | 'reports.export'
  | 'settings.manage'
  | 'users.manage'
  | 'dashboard.view';

export type Employee = {
  id: string;
  employeeCode: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
};

export type AuthSession = {
  token: string;
  employee: Employee;
  authenticatedAt: string;
  expiresAt: string;
};

export type PinLoginInput = {
  employeeCode: string;
  pin: string;
};
