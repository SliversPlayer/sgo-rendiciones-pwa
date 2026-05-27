export interface Gasto {
  id: string;
  rendicion_id: string;
  uid?: string;
  usuario_id?: string;
  usuario_email?: string;
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
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  centro_costo_id?: string;
  centro_costo_nombre?: string;
  centro_costo_codigo?: string;
  tipo_gasto_codigo?: string;
}

export interface Adjunto {
  id: string;
  gasto_id: string;
  archivo: Blob;
  nombre: string;
  tipo: string;
  size?: number;
  storagePath?: string;
  downloadURL?: string;
  uploadedAt?: string;
}

export interface GastoFormData {
  fecha: string;
  glosa: string;
  centro_negocio_id: string;
  tipo_documento_id: string;
  numero_documento: string;
  tipo_gasto_id: string;
  monto: string;
}

export interface AdjuntoInput {
  id?: string;
  archivo: Blob;
  nombre: string;
  tipo: string;
  size?: number;
  storagePath?: string;
  downloadURL?: string;
  uploadedAt?: string;
}

export interface GastoConAdjuntos {
  gasto: Gasto;
  adjuntos: Adjunto[];
}
