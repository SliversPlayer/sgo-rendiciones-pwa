export type RendicionEstado = 'BORRADOR';

export interface Rendicion {
  id: string;
  usuario_id: string;
  titulo: string;
  glosa_grupo?: string;
  estado: RendicionEstado;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface RendicionFormData {
  titulo: string;
  glosa_grupo: string;
}
