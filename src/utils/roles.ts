import type { UserProfile, UserRole } from '../types/user';

const VALID_USER_ROLES: UserRole[] = ['USER', 'ADMIN', 'SUPERADMIN'];
const ADMIN_ROLES: UserRole[] = ['ADMIN', 'SUPERADMIN'];
const NORMALIZED_ADMIN_ROLES = ['ADMIN', 'SUPERADMIN'];

function normalizeRole(role: string): string {
  return role.replace(/[-_\s]/g, '').toUpperCase();
}

export function normalizeUserRole(role?: UserRole | string | null): UserRole {
  const normalizedRole = normalizeRole(role ?? '');

  if (normalizedRole === 'SUPERADMIN') {
    return 'SUPERADMIN';
  }

  if (normalizedRole === 'ADMIN') {
    return 'ADMIN';
  }

  return 'USER';
}

export function getSelectableUserRoles(): UserRole[] {
  return VALID_USER_ROLES;
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

export function isSuperAdminRole(role?: UserRole | string | null): boolean {
  return normalizeRole(role ?? '') === 'SUPERADMIN';
}

export function isSuperAdminUser(userProfile?: Pick<UserProfile, 'rol'> | null): boolean {
  return isSuperAdminRole(userProfile?.rol);
}
