import type { UserRole } from './user';

export type CatalogoKey =
  | 'centros_negocio'
  | 'tipos_documento'
  | 'tipos_gasto'
  | 'tipos_rendicion';

export interface ManagedUser {
  uid: string;
  nombre: string;
  email: string;
  rut?: string;
  rol: UserRole;
  activo: boolean;
  mustChangePassword: boolean;
  passwordChangedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateManagedUserInput {
  nombre: string;
  email: string;
  rut: string;
  temporaryPassword: string;
  rol: UserRole;
  activo: boolean;
}

export interface ManagedCatalogItem {
  id: string;
  nombre: string;
  codigo: string;
  activo: boolean;
  cuenta_contable?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ManagedCatalogInput {
  nombre: string;
  codigo: string;
  activo: boolean;
  cuenta_contable?: string;
}
