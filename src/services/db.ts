import Dexie, { type Table } from 'dexie';
import type { Adjunto, Gasto } from '../types/gasto';
import type { Rendicion } from '../types/rendicion';
import type {
  CentroNegocio,
  TipoDocumento,
  TipoGasto,
  TipoRendicion,
  CatalogoLocalMeta,
} from '../types/catalogo';

class SgoRendicionesDatabase extends Dexie {
  rendiciones!: Table<Rendicion, string>;
  gastos!: Table<Gasto, string>;
  adjuntos!: Table<Adjunto, string>;
  centros_negocio!: Table<CentroNegocio, string>;
  tipos_documento!: Table<TipoDocumento, string>;
  tipos_rendicion!: Table<TipoRendicion, string>;
  tipos_gasto!: Table<TipoGasto, string>;
  catalog_meta!: Table<CatalogoLocalMeta, string>;

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

    this.version(5)
      .stores({
        rendiciones:
          'id, usuario_id, uid, estado, sync_status, tipo_rendicion_id, fecha_creacion, fecha_actualizacion, fecha_envio',
        gastos: 'id, rendicion_id, fecha, centro_negocio_id, tipo_documento_id, tipo_gasto_id',
        adjuntos: 'id, gasto_id',
        centros_negocio: 'id, codigo, activo, nombre',
        tipos_documento: 'id, codigo, cuenta_contable, activo, nombre',
        tipos_rendicion: 'id, cuenta_contable, activo, nombre',
        tipos_gasto: 'id, cuenta_contable, activo, nombre',
      })
      .upgrade(async (transaction) => {
        await transaction.table<Rendicion, string>('rendiciones').toCollection().modify((rendicion) => {
          const usuarioId = rendicion.usuario_id?.trim();
          const uid = rendicion.uid?.trim();

          if (!rendicion.uid && usuarioId) {
            rendicion.uid = usuarioId;
          }

          if (!rendicion.usuario_id && uid) {
            rendicion.usuario_id = uid;
          }
        });
      });

    this.version(6)
      .stores({
        rendiciones:
          'id, usuario_id, uid, estado, sync_status, tipo_rendicion_id, fecha_creacion, fecha_actualizacion, fecha_envio, last_synced_at',
        gastos:
          'id, rendicion_id, usuario_id, uid, fecha, centro_negocio_id, tipo_documento_id, tipo_gasto_id',
        adjuntos: 'id, gasto_id, storagePath',
        centros_negocio: 'id, codigo, activo, nombre',
        tipos_documento: 'id, codigo, cuenta_contable, activo, nombre',
        tipos_rendicion: 'id, cuenta_contable, activo, nombre',
        tipos_gasto: 'id, cuenta_contable, activo, nombre',
      })
      .upgrade(async (transaction) => {
        await transaction.table<Rendicion, string>('rendiciones').toCollection().modify((rendicion) => {
          const ownerId = rendicion.usuario_id?.trim() || rendicion.uid?.trim();

          if (!rendicion.uid && ownerId) {
            rendicion.uid = ownerId;
          }

          if (!rendicion.usuario_id && ownerId) {
            rendicion.usuario_id = ownerId;
          }

          if (rendicion.sync_status === 'LOCAL') {
            rendicion.sync_status = 'PENDING_CREATE';
          }

          if (rendicion.sync_status === 'PENDING') {
            rendicion.sync_status = 'PENDING_UPDATE';
          }

          if ((rendicion.sync_status as string) === 'ERROR') {
            rendicion.sync_status = 'SYNC_ERROR';
          }

          if (rendicion.sync_status === 'SYNCED' && !rendicion.last_synced_at) {
            rendicion.last_synced_at = rendicion.fecha_actualizacion;
          }
        });

        const rendiciones = await transaction.table<Rendicion, string>('rendiciones').toArray();
        const rendicionesById = new Map(
          rendiciones.map((rendicion) => [rendicion.id, rendicion]),
        );

        await transaction.table<Gasto, string>('gastos').toCollection().modify((gasto) => {
          const rendicion = rendicionesById.get(gasto.rendicion_id);
          const ownerId = rendicion?.usuario_id?.trim() || rendicion?.uid?.trim();

          if (ownerId) {
            gasto.usuario_id = gasto.usuario_id || ownerId;
            gasto.uid = gasto.uid || ownerId;
          }

          if (!gasto.fecha_creacion) {
            gasto.fecha_creacion = rendicion?.fecha_creacion ?? gasto.fecha;
          }

          if (!gasto.fecha_actualizacion) {
            gasto.fecha_actualizacion = rendicion?.fecha_actualizacion ?? gasto.fecha;
          }
        });
      });

    this.version(7)
      .stores({
        rendiciones:
          'id, usuario_id, uid, estado, sync_status, tipo_rendicion_id, fecha_creacion, fecha_actualizacion, fecha_envio, last_synced_at',
        gastos:
          'id, rendicion_id, usuario_id, uid, fecha, centro_negocio_id, tipo_documento_id, tipo_gasto_id',
        adjuntos: 'id, gasto_id, storagePath',
        centros_negocio: 'id, codigo, activo, nombre',
        tipos_documento: 'id, codigo, cuenta_contable, activo, nombre',
        tipos_rendicion: 'id, cuenta_contable, activo, nombre',
        tipos_gasto: 'id, cuenta_contable, activo, nombre',
      })
      .upgrade(async (transaction) => {
        await transaction.table<Rendicion, string>('rendiciones').toCollection().modify((rendicion) => {
          if (['PENDIENTE_ENVIO', 'ENVIANDO', 'ERROR'].includes(rendicion.estado as string)) {
            rendicion.estado = 'BORRADOR';
            rendicion.sync_status =
            rendicion.sync_status === 'SYNCED' ? 'PENDING_UPDATE' : rendicion.sync_status;
          }
        });
      });

    this.version(8)
      .stores({
        rendiciones:
          'id, usuario_id, uid, estado, sync_status, tipo_rendicion_id, fecha_creacion, fecha_actualizacion, fecha_envio, last_synced_at',
        gastos:
          'id, rendicion_id, usuario_id, uid, sync_status, local_id, remote_id, fecha, centro_negocio_id, tipo_documento_id, tipo_gasto_id',
        adjuntos: 'id, gasto_id, storagePath',
        centros_negocio: 'id, codigo, activo, nombre',
        tipos_documento: 'id, codigo, cuenta_contable, activo, nombre',
        tipos_rendicion: 'id, cuenta_contable, activo, nombre',
        tipos_gasto: 'id, cuenta_contable, activo, nombre',
      })
      .upgrade(async (transaction) => {
        await transaction.table<Gasto, string>('gastos').toCollection().modify((gasto) => {
          if (!gasto.sync_status) {
            gasto.sync_status = 'synced';
          }

          if (!gasto.local_id) {
            gasto.local_id = gasto.id;
          }

          if (!gasto.remote_id && gasto.sync_status === 'synced') {
            gasto.remote_id = gasto.id;
          }
        });
      });

    this.version(9).stores({
      rendiciones:
        'id, usuario_id, uid, estado, sync_status, tipo_rendicion_id, fecha_creacion, fecha_actualizacion, fecha_envio, last_synced_at',
      gastos:
        'id, rendicion_id, usuario_id, uid, sync_status, local_id, remote_id, fecha, centro_negocio_id, tipo_documento_id, tipo_gasto_id',
      adjuntos: 'id, gasto_id, storagePath',
      centros_negocio: 'id, codigo, activo, nombre',
      tipos_documento: 'id, codigo, cuenta_contable, activo, nombre',
      tipos_rendicion: 'id, cuenta_contable, activo, nombre',
      tipos_gasto: 'id, cuenta_contable, activo, nombre',
      catalog_meta: 'catalogoId, version, updatedAt, lastFetchedAt, includeInactive',
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
export const catalogMetaTable = db.catalog_meta;
