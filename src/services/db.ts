import Dexie, { type Table } from 'dexie';
import type { Rendicion } from '../types/rendicion';

// Futuras interfaces (vacías por ahora o importar luego)
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

class SgoRendicionesDatabase extends Dexie {
  // Tablas actuales
  rendiciones!: Table<Rendicion, string>;

  // Futuras (Sprint 2)
  gastos!: Table<Gasto, string>;
  adjuntos!: Table<Adjunto, string>;

  constructor() {
    super('sgo-rendiciones-db');

    // Version actual (Sprint 1)
    this.version(1).stores({
      rendiciones: 'id, usuario_id, estado, fecha_creacion, fecha_actualizacion',
    });

    // 🔥 Preparado para Sprint 2 (NO BORRAR)
    this.version(2).stores({
      rendiciones: 'id, usuario_id, estado, fecha_creacion, fecha_actualizacion',
      gastos: 'id, rendicion_id, fecha',
      adjuntos: 'id, gasto_id',
    });
  }
}

// Singleton
export const db = new SgoRendicionesDatabase();

// Debuggear 
db.on('populate', () => {
  console.log('DB inicializada');
});

// Acceso controlado
export const rendicionesTable = db.rendiciones;