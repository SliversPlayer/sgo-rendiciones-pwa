export interface Gasto {
  id: string;
  rendicion_id: string;
  fecha: string;
  glosa: string;
  centro_costo_id: string;
  centro_costo_nombre: string;
  tipo_documento_id: string;
  tipo_documento_nombre: string;
  numero_documento: string;
  tipo_gasto_id: string;
  tipo_gasto_nombre: string;
  monto: number;
}

export interface Adjunto {
  id: string;
  gasto_id: string;
  archivo: Blob;
  nombre: string;
  tipo: string;
}

export interface GastoFormData {
  fecha: string;
  glosa: string;
  centro_costo_id: string;
  tipo_documento_id: string;
  numero_documento: string;
  tipo_gasto_id: string;
  monto: string;
}

export interface AdjuntoInput {
  archivo: Blob;
  nombre: string;
  tipo: string;
}

export interface GastoConAdjuntos {
  gasto: Gasto;
  adjuntos: Adjunto[];
}
