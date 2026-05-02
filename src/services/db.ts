import Dexie, { type Table } from 'dexie';
import type { Adjunto, Gasto } from '../types/gasto';
import type { Rendicion } from '../types/rendicion';

class SgoRendicionesDatabase extends Dexie {
  rendiciones!: Table<Rendicion, string>;
  gastos!: Table<Gasto, string>;
  adjuntos!: Table<Adjunto, string>;

  constructor() {
    super('sgo-rendiciones-db');

    this.version(1).stores({
      rendiciones: 'id, usuario_id, estado, fecha_creacion, fecha_actualizacion',
    });

    this.version(2).stores({
      rendiciones: 'id, usuario_id, estado, fecha_creacion, fecha_actualizacion',
      gastos: 'id, rendicion_id, fecha',
      adjuntos: 'id, gasto_id',
    });
  }
}

export const db = new SgoRendicionesDatabase();

db.on('populate', () => {
  console.log('DB inicializada');
});

export const rendicionesTable = db.rendiciones;
export const gastosTable = db.gastos;
export const adjuntosTable = db.adjuntos;
