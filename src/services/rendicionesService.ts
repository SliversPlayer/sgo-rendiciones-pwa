import { adjuntosTable, db, gastosTable, rendicionesTable } from './db';
import { getTipoRendicionById } from './catalogos';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestoreDb } from './firebase/firebase';
import type {
  Rendicion,
  RendicionEstado,
  RendicionFormData,
  RendicionSyncStatus,
} from '../types/rendicion';
import type { Adjunto, Gasto } from '../types/gasto';
import { nowIso } from '../utils/date';
import { formatTipoRendicionNombre } from '../utils/format';
import { createId } from '../utils/id';
import {
  getRendicionOwnerId,
  isRendicionOwnedByUser,
  reportInvalidRendicionOwner,
} from '../utils/rendicionOwner';
import { isRendicionEditable } from '../utils/rendicionStatus';

export interface RendicionesStats {
  totalRendiciones: number;
  totalBorradores: number;
  totalEnviadas: number;
  montoTotalAcumulado: number;
}

function assertUsuarioId(usuarioId: string): string {
  const normalizedUsuarioId = usuarioId.trim();

  if (!normalizedUsuarioId) {
    throw new Error('Debes iniciar sesion para acceder a tus rendiciones.');
  }

  return normalizedUsuarioId;
}

function sortByRecentUpdate(rendiciones: Rendicion[]): Rendicion[] {
  return rendiciones.sort(
    (first, second) =>
      new Date(second.fecha_actualizacion).getTime() -
      new Date(first.fecha_actualizacion).getTime(),
  );
}

function uniqueRendiciones(rendiciones: Rendicion[]): Rendicion[] {
  return Array.from(
    rendiciones.reduce((itemsById, rendicion) => {
      itemsById.set(rendicion.id, rendicion);
      return itemsById;
    }, new Map<string, Rendicion>()).values(),
  );
}

function getPendingSyncStatus(status: RendicionSyncStatus): RendicionSyncStatus {
  if (status === 'LOCAL' || status === 'PENDING_CREATE') {
    return 'PENDING_CREATE';
  }

  return 'PENDING_UPDATE';
}

function isPendingDelete(rendicion: Rendicion): boolean {
  return rendicion.sync_status === 'PENDING_DELETE';
}

function currentWasBackedUp(rendicion: Rendicion): boolean {
  return rendicion.sync_status !== 'LOCAL' && rendicion.sync_status !== 'PENDING_CREATE';
}

function hasPendingLocalChanges(rendicion: Rendicion): boolean {
  return ['LOCAL', 'PENDING', 'ERROR', 'PENDING_CREATE', 'PENDING_UPDATE', 'PENDING_DELETE', 'SYNC_ERROR'].includes(
    rendicion.sync_status,
  );
}

async function reportInvalidLocalRendiciones(context: string): Promise<void> {
  const invalidRendiciones = await rendicionesTable
    .filter((rendicion) => !getRendicionOwnerId(rendicion))
    .toArray();

  invalidRendiciones.forEach((rendicion) => reportInvalidRendicionOwner(rendicion, context));
}

export function assertRendicionBelongsToUser(rendicion: Rendicion, usuarioId: string): void {
  const ownerId = getRendicionOwnerId(rendicion);

  if (!ownerId) {
    reportInvalidRendicionOwner(rendicion, 'owner-guard');
    throw new Error('La rendicion no tiene propietario valido.');
  }

  if (!isRendicionOwnedByUser(rendicion, usuarioId)) {
    throw new Error('No tienes acceso a esta rendicion.');
  }
}

export async function getRendiciones(usuarioId: string): Promise<Rendicion[]> {
  const normalizedUsuarioId = assertUsuarioId(usuarioId);
  await reportInvalidLocalRendiciones('getRendiciones');

  const [byUsuarioId, byUid] = await Promise.all([
    rendicionesTable.where('usuario_id').equals(normalizedUsuarioId).toArray(),
    rendicionesTable.where('uid').equals(normalizedUsuarioId).toArray(),
  ]);

  return sortByRecentUpdate(
    uniqueRendiciones([...byUsuarioId, ...byUid]).filter(
      (rendicion) =>
        isRendicionOwnedByUser(rendicion, normalizedUsuarioId) && !isPendingDelete(rendicion),
    ),
  );
}

export async function getRendicionById(
  id: string,
  usuarioId: string,
): Promise<Rendicion | undefined> {
  const rendicion = await rendicionesTable.get(id);

  if (!rendicion) {
    return undefined;
  }

  if (!getRendicionOwnerId(rendicion)) {
    reportInvalidRendicionOwner(rendicion, 'getRendicionById');
    return undefined;
  }

  return isRendicionOwnedByUser(rendicion, assertUsuarioId(usuarioId)) ? rendicion : undefined;
}

function getRemoteAdminFields(remote: Partial<Rendicion>) {
  return {
    fecha_aprobacion: remote.fecha_aprobacion,
    usuario_aprobacion: remote.usuario_aprobacion,
    fecha_rechazo: remote.fecha_rechazo,
    usuario_rechazo: remote.usuario_rechazo,
    observacion_rechazo: remote.observacion_rechazo,
  };
}

const RENDICION_ESTADOS: RendicionEstado[] = [
  'BORRADOR',
  'PENDIENTE_ENVIO',
  'ENVIANDO',
  'ENVIADA',
  'APROBADA',
  'RECHAZADA',
  'ERROR',
];

type RemoteRendicionData = Partial<Rendicion> & {
  glosa?: string;
  ownerUid?: string;
  ownerEmail?: string;
};

type RemoteGastoData = Partial<Gasto> & {
  adjuntos?: RemoteAdjuntoData[];
};

interface RemoteAdjuntoData {
  id?: string;
  nombre?: string;
  tipo?: string;
  size?: number;
  storagePath?: string;
  downloadURL?: string;
  uploadedAt?: string;
}

function normalizeRemoteEstado(value: unknown): RendicionEstado {
  return RENDICION_ESTADOS.includes(value as RendicionEstado)
    ? (value as RendicionEstado)
    : 'BORRADOR';
}

function normalizeRemoteRendicion(
  id: string,
  remote: RemoteRendicionData,
  usuarioId: string,
  syncTimestamp: string,
): Rendicion | null {
  const remoteOwnerId = remote.usuario_id ?? remote.uid ?? remote.ownerUid ?? '';

  if (remoteOwnerId !== usuarioId) {
    return null;
  }

  return {
    id,
    uid: usuarioId,
    usuario_id: usuarioId,
    usuario_email: remote.usuario_email ?? remote.ownerEmail,
    usuario_nombre: remote.usuario_nombre,
    titulo: remote.titulo ?? 'Sin titulo',
    glosa_grupo: remote.glosa_grupo ?? remote.glosa,
    tipo_rendicion_id: remote.tipo_rendicion_id ?? '',
    tipo_rendicion_nombre: remote.tipo_rendicion_nombre ?? '',
    tipo_rendicion_cuenta_contable: remote.tipo_rendicion_cuenta_contable ?? '',
    estado: normalizeRemoteEstado(remote.estado),
    sync_status: 'SYNCED',
    fecha_creacion: remote.fecha_creacion ?? syncTimestamp,
    fecha_actualizacion: remote.fecha_actualizacion ?? syncTimestamp,
    last_synced_at: syncTimestamp,
    fecha_envio: remote.fecha_envio,
    ...getRemoteAdminFields(remote),
    sync_error: undefined,
  };
}

function normalizeRemoteGasto(
  id: string,
  remote: RemoteGastoData,
  rendicion: Rendicion,
): Gasto {
  return {
    id,
    rendicion_id: rendicion.id,
    uid: rendicion.uid,
    usuario_id: rendicion.usuario_id,
    usuario_email: rendicion.usuario_email,
    fecha: remote.fecha ?? rendicion.fecha_actualizacion,
    glosa: remote.glosa ?? 'Sin glosa',
    centro_negocio_id: remote.centro_negocio_id ?? remote.centro_costo_id ?? '',
    centro_negocio_nombre: remote.centro_negocio_nombre ?? remote.centro_costo_nombre ?? '',
    centro_negocio_codigo: remote.centro_negocio_codigo ?? remote.centro_costo_codigo ?? '',
    tipo_documento_id: remote.tipo_documento_id ?? '',
    tipo_documento_nombre: remote.tipo_documento_nombre ?? '',
    tipo_documento_codigo: remote.tipo_documento_codigo ?? '',
    tipo_documento_cuenta_contable: remote.tipo_documento_cuenta_contable ?? '',
    numero_documento: remote.numero_documento ?? '',
    tipo_gasto_id: remote.tipo_gasto_id ?? '',
    tipo_gasto_nombre: remote.tipo_gasto_nombre ?? '',
    tipo_gasto_cuenta_contable:
      remote.tipo_gasto_cuenta_contable ?? remote.tipo_gasto_codigo ?? '',
    monto: Number(remote.monto ?? 0),
    fecha_creacion: remote.fecha_creacion ?? rendicion.fecha_creacion,
    fecha_actualizacion: remote.fecha_actualizacion ?? rendicion.fecha_actualizacion,
    centro_costo_id: remote.centro_costo_id ?? remote.centro_negocio_id,
    centro_costo_nombre: remote.centro_costo_nombre ?? remote.centro_negocio_nombre,
    centro_costo_codigo: remote.centro_costo_codigo ?? remote.centro_negocio_codigo,
    tipo_gasto_codigo: remote.tipo_gasto_codigo,
  };
}

function normalizeRemoteAdjuntos(
  gastoId: string,
  remoteAdjuntos: RemoteAdjuntoData[] | undefined,
): Adjunto[] {
  if (!Array.isArray(remoteAdjuntos)) {
    return [];
  }

  return remoteAdjuntos.map((adjunto) => {
    const tipo = adjunto.tipo ?? 'application/octet-stream';

    return {
      id: adjunto.id ?? createId(),
      gasto_id: gastoId,
      archivo: new Blob([], { type: tipo }),
      nombre: adjunto.nombre ?? 'Adjunto',
      tipo,
      size: adjunto.size ?? 0,
      storagePath: adjunto.storagePath,
      downloadURL: adjunto.downloadURL,
      uploadedAt: adjunto.uploadedAt,
    };
  });
}

export async function refreshUserRendicionesFromRemote(usuarioId: string): Promise<void> {
  const normalizedUsuarioId = assertUsuarioId(usuarioId);
  const remoteCollection = collection(firestoreDb, 'rendiciones');
  const [usuarioIdSnapshot, uidSnapshot] = await Promise.all([
    getDocs(query(remoteCollection, where('usuario_id', '==', normalizedUsuarioId))),
    getDocs(query(remoteCollection, where('uid', '==', normalizedUsuarioId))),
  ]);
  const remoteDocuments = Array.from(
    [...usuarioIdSnapshot.docs, ...uidSnapshot.docs]
      .reduce((documentsById, documentSnapshot) => {
        documentsById.set(documentSnapshot.id, documentSnapshot);
        return documentsById;
      }, new Map<string, (typeof usuarioIdSnapshot.docs)[number]>())
      .values(),
  );
  const syncTimestamp = nowIso();

  for (const documentSnapshot of remoteDocuments) {
    const remoteRendicion = normalizeRemoteRendicion(
      documentSnapshot.id,
      documentSnapshot.data() as RemoteRendicionData,
      normalizedUsuarioId,
      syncTimestamp,
    );

    if (!remoteRendicion) {
      continue;
    }

    const local = await rendicionesTable.get(documentSnapshot.id);

    if (local) {
      try {
        assertRendicionBelongsToUser(local, normalizedUsuarioId);
      } catch {
        continue;
      }

      if (hasPendingLocalChanges(local)) {
        continue;
      }
    }

    const remoteGastosSnapshot = await getDocs(
      collection(firestoreDb, 'rendiciones', documentSnapshot.id, 'gastos'),
    );
    const remoteGastos = remoteGastosSnapshot.docs.map((gastoSnapshot) => {
      const data = gastoSnapshot.data() as RemoteGastoData;

      return {
        gasto: normalizeRemoteGasto(gastoSnapshot.id, data, remoteRendicion),
        adjuntos: normalizeRemoteAdjuntos(gastoSnapshot.id, data.adjuntos),
      };
    });

    await db.transaction('rw', rendicionesTable, gastosTable, adjuntosTable, async () => {
      await rendicionesTable.put(remoteRendicion);

      const localGastos = await gastosTable
        .where('rendicion_id')
        .equals(remoteRendicion.id)
        .toArray();
      const remoteGastoIds = new Set(remoteGastos.map(({ gasto }) => gasto.id));
      const staleGastoIds = localGastos
        .filter((gasto) => !remoteGastoIds.has(gasto.id))
        .map((gasto) => gasto.id);

      if (staleGastoIds.length > 0) {
        await adjuntosTable.where('gasto_id').anyOf(staleGastoIds).delete();
        await gastosTable.bulkDelete(staleGastoIds);
      }

      for (const { gasto, adjuntos } of remoteGastos) {
        await gastosTable.put(gasto);
        await adjuntosTable.where('gasto_id').equals(gasto.id).delete();

        if (adjuntos.length > 0) {
          await adjuntosTable.bulkPut(adjuntos);
        }
      }
    });
  }
}

export async function getRendicionesStats(
  usuarioId: string,
  currentRendiciones?: Rendicion[],
): Promise<RendicionesStats> {
  const rendiciones = currentRendiciones ?? (await getRendiciones(usuarioId));
  const rendicionIds = rendiciones.map((rendicion) => rendicion.id);
  const gastos =
    rendicionIds.length > 0
      ? await gastosTable.where('rendicion_id').anyOf(rendicionIds).toArray()
      : [];

  return {
    totalRendiciones: rendiciones.length,
    totalBorradores: rendiciones.filter((rendicion) => rendicion.estado === 'BORRADOR').length,
    totalEnviadas: rendiciones.filter((rendicion) => rendicion.estado === 'ENVIADA').length,
    montoTotalAcumulado: gastos.reduce((total, gasto) => total + gasto.monto, 0),
  };
}

async function getTipoRendicionSnapshot(data: RendicionFormData) {
  const tipoRendicion = await getTipoRendicionById(data.tipo_rendicion_id);

  if (!tipoRendicion || !tipoRendicion.activo) {
    throw new Error('Selecciona un tipo de rendicion valido.');
  }

  return {
    tipo_rendicion_id: tipoRendicion.id,
    tipo_rendicion_nombre: formatTipoRendicionNombre(tipoRendicion.id, tipoRendicion.nombre),
    tipo_rendicion_cuenta_contable: tipoRendicion.cuenta_contable,
  };
}

export async function createRendicion(
  data: RendicionFormData,
  usuarioId: string,
  usuarioEmail?: string | null,
  usuarioNombre?: string | null,
): Promise<Rendicion> {
  const normalizedUsuarioId = assertUsuarioId(usuarioId);
  const timestamp = nowIso();
  const tipoRendicion = await getTipoRendicionSnapshot(data);
  const rendicion: Rendicion = {
    id: createId(),
    uid: normalizedUsuarioId,
    usuario_id: normalizedUsuarioId,
    usuario_email: usuarioEmail ?? undefined,
    usuario_nombre: usuarioNombre?.trim() || undefined,
    titulo: data.titulo.trim(),
    glosa_grupo: data.glosa_grupo.trim() || undefined,
    ...tipoRendicion,
    estado: 'BORRADOR',
    sync_status: 'PENDING_CREATE',
    fecha_creacion: timestamp,
    fecha_actualizacion: timestamp,
  };

  await rendicionesTable.add(rendicion);
  return rendicion;
}

export async function updateRendicion(
  current: Rendicion,
  data: RendicionFormData,
  usuarioId: string,
): Promise<Rendicion> {
  assertRendicionBelongsToUser(current, assertUsuarioId(usuarioId));

  if (!isRendicionEditable(current)) {
    throw new Error('Esta rendicion ya fue enviada y esta bloqueada para edicion.');
  }

  const tipoRendicion = await getTipoRendicionSnapshot(data);
  const ownerId = getRendicionOwnerId(current);
  const updated: Rendicion = {
    ...current,
    uid: current.uid || ownerId,
    usuario_id: current.usuario_id || ownerId,
    titulo: data.titulo.trim(),
    glosa_grupo: data.glosa_grupo.trim() || undefined,
    ...tipoRendicion,
    sync_status: getPendingSyncStatus(current.sync_status),
    sync_error: undefined,
    fecha_actualizacion: nowIso(),
  };

  await rendicionesTable.put(updated);
  return updated;
}

export async function deleteRendicion(id: string, usuarioId: string): Promise<void> {
  const normalizedUsuarioId = assertUsuarioId(usuarioId);

  await db.transaction('rw', rendicionesTable, gastosTable, adjuntosTable, async () => {
    const rendicion = await rendicionesTable.get(id);

    if (!rendicion) {
      return;
    }

    assertRendicionBelongsToUser(rendicion, normalizedUsuarioId);

    if (!isRendicionEditable(rendicion)) {
      throw new Error('Esta rendicion ya fue enviada y no se puede eliminar.');
    }

    const gastos = await gastosTable.where('rendicion_id').equals(id).toArray();
    const gastoIds = gastos.map((gasto) => gasto.id);

    if (currentWasBackedUp(rendicion)) {
      if (gastoIds.length > 0) {
        await adjuntosTable.where('gasto_id').anyOf(gastoIds).delete();
        await gastosTable.bulkDelete(gastoIds);
      }

      await rendicionesTable.update(id, {
        sync_status: 'PENDING_DELETE',
        fecha_actualizacion: nowIso(),
        sync_error: undefined,
      });
      return;
    }

    if (gastoIds.length > 0) {
      await adjuntosTable.where('gasto_id').anyOf(gastoIds).delete();
      await gastosTable.bulkDelete(gastoIds);
    }

    await rendicionesTable.delete(id);
  });
}
