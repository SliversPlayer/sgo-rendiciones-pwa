export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface DemoUser {
  usuario_id: string;
  nombre: string;
  email: string;
  rol: UserRole;
}

export interface UserProfile {
  uid: string;
  email: string;
  nombre: string;
  rol: UserRole;
  activo: boolean;
  created_at: string;
}
