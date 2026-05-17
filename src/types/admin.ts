import type { Rendicion, RendicionEstado } from './rendicion';

export type AdminEstadoFilter = 'TODAS' | Extract<RendicionEstado, 'ENVIADA' | 'APROBADA' | 'RECHAZADA'>;

export interface AdminAdjunto {
  id: string;
  nombre: string;
  tipo: string;
  size: number;
  storagePath: string;
  downloadURL: string;
}

export interface AdminGasto {
  id: string;
  rendicion_id: string;
  fecha: string;
  glosa: string;
  centro_negocio_id: string;
  centro_negocio_nombre: string;
  centro_negocio_codigo: string;
  tipo_documento_id: string;
  tipo_documento_nombre: string;
  tipo_documento_codigo: string;
  tipo_documento_cuenta_contable: string;
  numero_documento: string;
  tipo_gasto_id: string;
  tipo_gasto_nombre: string;
  tipo_gasto_cuenta_contable: string;
  monto: number;
  adjuntos: AdminAdjunto[];
}

export interface AdminRendicion extends Rendicion {
  glosa?: string;
  total_gastos?: number;
  monto_total?: number;
}

export interface AdminRendicionDetalle {
  rendicion: AdminRendicion;
  gastos: AdminGasto[];
}
