export type UserRole = 'USER' | 'ADMIN' | 'SUPERADMIN';

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
  mustChangePassword?: boolean;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
}
