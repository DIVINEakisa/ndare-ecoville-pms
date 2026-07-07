export const userRoles = [
  'Owner',
  'Admin',
  'Property Manager',
  'Receptionist',
  'Cashier',
  'Kitchen Staff',
  'Department Staff'
] as const;

export type UserRole = (typeof userRoles)[number];

export const globalRoles: UserRole[] = ['Owner', 'Admin'];

export const rolePermissions: Record<UserRole, string[]> = {
  Owner: ['*'],
  Admin: ['*'],
  'Property Manager': [
    'dashboard:read',
    'rooms:manage',
    'reservations:manage',
    'guests:manage',
    'folios:manage',
    'orders:manage',
    'inventory:manage',
    'requisitions:approve',
    'reports:read'
  ],
  Receptionist: [
    'dashboard:read',
    'rooms:read',
    'reservations:manage',
    'guests:manage',
    'folios:manage',
    'payments:create',
    'orders:create'
  ],
  Cashier: ['dashboard:read', 'folios:read', 'payments:create', 'reports:payments'],
  'Kitchen Staff': ['dashboard:read', 'orders:manage', 'menu:read', 'inventory:read'],
  'Department Staff': ['dashboard:read', 'requisitions:create', 'inventory:read']
};

export function hasPermission(role: UserRole, permission: string) {
  const permissions = rolePermissions[role] ?? [];
  return permissions.includes('*') || permissions.includes(permission);
}
