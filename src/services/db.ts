import Dexie, { type Table } from 'dexie';
import type { Adjunto, Gasto } from '../types/gasto';
import type { Rendicion } from '../types/rendicion';
import type {
  CentroNegocio,
  TipoDocumento,
  TipoGasto,
  TipoRendicion,
} from '../types/catalogo';

class SgoRendicionesDatabase extends Dexie {
  rendiciones!: Table<Rendicion, string>;
  gastos!: Table<Gasto, string>;
  adjuntos!: Table<Adjunto, string>;
  centros_negocio!: Table<CentroNegocio, string>;
  tipos_documento!: Table<TipoDocumento, string>;
  tipos_rendicion!: Table<TipoRendicion, string>;
  tipos_gasto!: Table<TipoGasto, string>;

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

    this.version(3)
      .stores({
        rendiciones:
          'id, usuario_id, estado, sync_status, fecha_creacion, fecha_actualizacion, fecha_envio',
        gastos: 'id, rendicion_id, fecha',
        adjuntos: 'id, gasto_id',
      })
      .upgrade(async (transaction) => {
        await transaction.table<Rendicion, string>('rendiciones').toCollection().modify((rendicion) => {
          if (!rendicion.estado) {
            rendicion.estado = 'BORRADOR';
          }

          if (!rendicion.sync_status) {
            rendicion.sync_status = 'LOCAL';
          }
        });
      });

    this.version(4)
      .stores({
        rendiciones:
          'id, usuario_id, estado, sync_status, tipo_rendicion_id, fecha_creacion, fecha_actualizacion, fecha_envio',
        gastos: 'id, rendicion_id, fecha, centro_negocio_id, tipo_documento_id, tipo_gasto_id',
        adjuntos: 'id, gasto_id',
        centros_negocio: 'id, codigo, activo, nombre',
        tipos_documento: 'id, codigo, cuenta_contable, activo, nombre',
        tipos_rendicion: 'id, cuenta_contable, activo, nombre',
        tipos_gasto: 'id, cuenta_contable, activo, nombre',
      })
      .upgrade(async (transaction) => {
        await transaction.table<Gasto, string>('gastos').toCollection().modify((gasto) => {
          if (!gasto.centro_negocio_id && gasto.centro_costo_id) {
            gasto.centro_negocio_id = gasto.centro_costo_id;
            gasto.centro_negocio_nombre = gasto.centro_costo_nombre ?? '';
            gasto.centro_negocio_codigo = gasto.centro_costo_codigo ?? '';
          }

          if (!gasto.tipo_documento_codigo) {
            gasto.tipo_documento_codigo = '';
          }

          if (!gasto.tipo_documento_cuenta_contable) {
            gasto.tipo_documento_cuenta_contable = '';
          }

          if (!gasto.tipo_gasto_cuenta_contable) {
            gasto.tipo_gasto_cuenta_contable = gasto.tipo_gasto_codigo ?? '';
          }
        });
      });
  }
}

export const db = new SgoRendicionesDatabase();

export const rendicionesTable = db.rendiciones;
export const gastosTable = db.gastos;
export const adjuntosTable = db.adjuntos;
export const centrosNegocioTable = db.centros_negocio;
export const tiposDocumentoTable = db.tipos_documento;
export const tiposRendicionTable = db.tipos_rendicion;
export const tiposGastoTable = db.tipos_gasto;
