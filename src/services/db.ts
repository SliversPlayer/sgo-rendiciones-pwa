import Dexie, { type Table } from 'dexie';
import type { Rendicion } from '../types/rendicion';

class SgoRendicionesDatabase extends Dexie {
  rendiciones!: Table<Rendicion, string>;

  constructor() {
    super('sgo-rendiciones-db');

    this.version(1).stores({
      rendiciones: 'id, usuario_id, estado, fecha_creacion, fecha_actualizacion',
    });
  }
}

export const db = new SgoRendicionesDatabase();

export const rendicionesTable = db.rendiciones;
