export type UserRole = 'USER';

export interface DemoUser {
  usuario_id: string;
  nombre: string;
  email: string;
  rol: UserRole;
}
