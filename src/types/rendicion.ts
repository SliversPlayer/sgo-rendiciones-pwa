export type RendicionEstado =
  | 'BORRADOR'
  | 'PENDIENTE_ENVIO'
  | 'ENVIANDO'
  | 'ENVIADA'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'ERROR';

export type RendicionSyncStatus = 'LOCAL' | 'PENDING' | 'SYNCED' | 'ERROR';

export interface Rendicion {
  id: string;
  usuario_id: string;
  usuario_email?: string;
  titulo: string;
  glosa_grupo?: string;
  estado: RendicionEstado;
  sync_status: RendicionSyncStatus;
  fecha_creacion: string;
  fecha_actualizacion: string;
  fecha_envio?: string;
  sync_error?: string;
}

export interface RendicionFormData {
  titulo: string;
  glosa_grupo: string;
}
