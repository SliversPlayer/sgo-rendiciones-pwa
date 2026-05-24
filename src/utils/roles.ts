import type { UserProfile, UserRole } from '../types/user';

const ADMIN_ROLES: UserRole[] = ['ADMIN', 'SUPER_ADMIN'];
const NORMALIZED_ADMIN_ROLES = ['ADMIN', 'SUPERADMIN'];

function normalizeRole(role: string): string {
  return role.replace(/[-_\s]/g, '').toUpperCase();
}

export function isAdminRole(role?: UserRole | string | null): boolean {
  if (!role) {
    return false;
  }

  return (
    ADMIN_ROLES.includes(role as UserRole) ||
    NORMALIZED_ADMIN_ROLES.includes(normalizeRole(role))
  );
}

export function isAdminUser(userProfile?: Pick<UserProfile, 'rol'> | null): boolean {
  return isAdminRole(userProfile?.rol);
}
