export type RendicionEstado =
  | 'BORRADOR'
  | 'ENVIADA'
  | 'APROBADA'
  | 'RECHAZADA';

export type RendicionSyncStatus =
  | 'LOCAL'
  | 'PENDING'
  | 'SYNCED'
  | 'PENDING_CREATE'
  | 'PENDING_UPDATE'
  | 'PENDING_DELETE'
  | 'SYNC_ERROR';

export interface Rendicion {
  id: string;
  uid?: string;
  usuario_id: string;
  usuario_nombre?: string;
  usuario_email?: string;
  titulo: string;
  glosa_grupo?: string;
  tipo_rendicion_id: string;
  tipo_rendicion_nombre: string;
  tipo_rendicion_cuenta_contable: string;
  estado: RendicionEstado;
  sync_status: RendicionSyncStatus;
  fecha_creacion: string;
  fecha_actualizacion: string;
  last_synced_at?: string;
  fecha_envio?: string;
  fecha_aprobacion?: string;
  usuario_aprobacion?: string;
  fecha_rechazo?: string;
  usuario_rechazo?: string;
  observacion_rechazo?: string;
  sync_error?: string;
}

export interface RendicionFormData {
  titulo: string;
  glosa_grupo: string;
  tipo_rendicion_id: string;
}
