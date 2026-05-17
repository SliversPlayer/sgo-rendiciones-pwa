import type { UserProfile, UserRole } from '../types/user';

const ADMIN_ROLES: UserRole[] = ['ADMIN', 'SUPER_ADMIN'];

export function isAdminRole(role?: UserRole | null): boolean {
  return Boolean(role && ADMIN_ROLES.includes(role));
}

export function isAdminUser(userProfile?: Pick<UserProfile, 'rol'> | null): boolean {
  return isAdminRole(userProfile?.rol);
}
