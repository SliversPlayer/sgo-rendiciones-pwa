import { FirebaseError } from 'firebase/app';
import { collection, deleteField, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type { User } from 'firebase/auth';
import { adjuntosTable, gastosTable, rendicionesTable } from './db';
import { firestoreDb, firebaseStorage } from './firebase/firebase';
import { assertRendicionBelongsToUser } from './rendicionesService';
import type { Adjunto, Gasto } from '../types/gasto';
import type { Rendicion, RendicionSyncStatus } from '../types/rendicion';
import { nowIso } from '../utils/date';

interface UploadedAdjunto {
  id: string;
  nombre: string;
  tipo: string;
  size: number;
  storagePath: string;
  downloadURL: string;
  uploadedAt: string;
}

interface GastoWithAdjuntos {
  gasto: Gasto;
  adjuntos: Adjunto[];
}

interface PersistOptions {
  estado?: Rendicion['estado'];
  fechaEnvio?: string;
}

const PENDING_SYNC_STATUSES: RendicionSyncStatus[] = [
  'LOCAL',
  'PENDING',
  'PENDING_CREATE',
  'PENDING_UPDATE',
  'PENDING_DELETE',
  'SYNC_ERROR',
];

function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'adjunto';
}

function getSyncErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && error.code === 'permission-denied') {
    return 'Firebase rechazo la operacion por permisos. Revisa las reglas de Firestore/Storage.';
  }

  if (error instanceof FirebaseError && error.code === 'storage/unauthorized') {
    return 'Firebase Storage rechazo la subida por permisos.';
  }

  if (error instanceof FirebaseError && error.code === 'unavailable') {
    return 'Firebase no esta disponible temporalmente. Se reintentara al volver la conexion.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'No se pudo sincronizar la rendicion. Intenta nuevamente.';
}

function isSyncPending(status: RendicionSyncStatus): boolean {
  return PENDING_SYNC_STATUSES.includes(status);
}

function getFailedSyncStatus(status?: RendicionSyncStatus): RendicionSyncStatus {
  if (status === 'PENDING_DELETE') {
    return 'PENDING_DELETE';
  }

  if (status === 'LOCAL' || status === 'PENDING_CREATE') {
    return 'PENDING_CREATE';
  }

  if (status === 'PENDING') {
    return 'PENDING_UPDATE';
  }

  return 'SYNC_ERROR';
}

function hasRemoteSnapshot(rendicion: Rendicion): boolean {
  return rendicion.sync_status !== 'LOCAL' && rendicion.sync_status !== 'PENDING_CREATE';
}

function isValidDownloadURL(value?: string): value is string {
  if (!value?.trim()) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function validateGasto(gasto: Gasto, adjuntos: Adjunto[]): string | null {
  const centroNegocioId = gasto.centro_negocio_id ?? gasto.centro_costo_id;
  const centroNegocioNombre = gasto.centro_negocio_nombre ?? gasto.centro_costo_nombre;
  const centroNegocioCodigo = gasto.centro_negocio_codigo ?? gasto.centro_costo_codigo;

  if (!gasto.fecha || Number.isNaN(new Date(gasto.fecha).getTime())) {
    return `El gasto "${gasto.glosa || gasto.id}" no tiene una fecha valida.`;
  }

  if (!gasto.glosa?.trim()) {
    return 'Hay un gasto sin glosa.';
  }

  if (!centroNegocioId || !centroNegocioNombre || !centroNegocioCodigo) {
    return `El gasto "${gasto.glosa}" no tiene centro de negocio completo.`;
  }

  if (
    !gasto.tipo_documento_id ||
    !gasto.tipo_documento_nombre ||
    !gasto.tipo_documento_codigo ||
    !gasto.tipo_documento_cuenta_contable
  ) {
    return `El gasto "${gasto.glosa}" no tiene tipo de documento completo.`;
  }

  if (!gasto.numero_documento?.trim()) {
    return `El gasto "${gasto.glosa}" no tiene numero de documento.`;
  }

  if (!gasto.tipo_gasto_id || !gasto.tipo_gasto_nombre || !gasto.tipo_gasto_cuenta_contable) {
    return `El gasto "${gasto.glosa}" no tiene tipo de gasto completo.`;
  }

  if (!Number.isFinite(gasto.monto) || gasto.monto <= 0) {
    return `El gasto "${gasto.glosa}" debe tener monto mayor a 0.`;
  }

  if (adjuntos.length < 1) {
    return `El gasto "${gasto.glosa}" debe tener al menos 1 adjunto.`;
  }

  return null;
}

async function getGastosWithAdjuntos(rendicionId: string): Promise<GastoWithAdjuntos[]> {
  const gastos = await gastosTable.where('rendicion_id').equals(rendicionId).toArray();

  return Promise.all(
    gastos.map(async (gasto) => ({
      gasto,
      adjuntos: await adjuntosTable.where('gasto_id').equals(gasto.id).toArray(),
    })),
  );
}

function validateRendicionForSend(
  rendicion: Rendicion | undefined,
  gastos: GastoWithAdjuntos[],
): Rendicion {
  if (!rendicion) {
    throw new Error('La rendicion no existe localmente.');
  }

  if (rendicion.estado === 'ENVIADA') {
    throw new Error('Esta rendicion ya fue enviada.');
  }

  if (rendicion.estado === 'APROBADA') {
    throw new Error('Esta rendicion ya fue aprobada y no puede reenviarse.');
  }

  if (gastos.length === 0) {
    throw new Error('La rendicion debe tener al menos 1 gasto para enviarse.');
  }

  if (
    !rendicion.tipo_rendicion_id ||
    !rendicion.tipo_rendicion_nombre ||
    !rendicion.tipo_rendicion_cuenta_contable
  ) {
    throw new Error('Selecciona un tipo de rendicion antes de enviar.');
  }

  const invalidGasto = gastos
    .map(({ gasto, adjuntos }) => validateGasto(gasto, adjuntos))
    .find(Boolean);

  if (invalidGasto) {
    throw new Error(invalidGasto);
  }

  return rendicion;
}

function withNormalizedSnapshots(gasto: Gasto): Gasto {
  return {
    ...gasto,
    centro_negocio_id: gasto.centro_negocio_id ?? gasto.centro_costo_id ?? '',
    centro_negocio_nombre: gasto.centro_negocio_nombre ?? gasto.centro_costo_nombre ?? '',
    centro_negocio_codigo: gasto.centro_negocio_codigo ?? gasto.centro_costo_codigo ?? '',
    tipo_documento_codigo: gasto.tipo_documento_codigo ?? '',
    tipo_documento_cuenta_contable: gasto.tipo_documento_cuenta_contable ?? '',
    tipo_gasto_cuenta_contable: gasto.tipo_gasto_cuenta_contable ?? gasto.tipo_gasto_codigo ?? '',
  };
}

async function uploadAdjuntos(
  rendicionId: string,
  gastoId: string,
  adjuntos: Adjunto[],
  user: User,
): Promise<UploadedAdjunto[]> {
  return Promise.all(
    adjuntos.map(async (adjunto) => {
      if (adjunto.storagePath) {
        if (!isValidDownloadURL(adjunto.downloadURL)) {
          throw new Error(`El adjunto "${adjunto.nombre}" no tiene una URL de descarga valida.`);
        }

        return {
          id: adjunto.id,
          nombre: adjunto.nombre,
          tipo: adjunto.tipo,
          size: adjunto.size ?? adjunto.archivo.size,
          storagePath: adjunto.storagePath,
          downloadURL: adjunto.downloadURL,
          uploadedAt: adjunto.uploadedAt ?? nowIso(),
        };
      }

      const fileName = `${adjunto.id}-${sanitizeFileName(adjunto.nombre)}`;
      const storageRef = ref(firebaseStorage, `adjuntos/${rendicionId}/${gastoId}/${fileName}`);
      const uploadedAt = nowIso();

      await uploadBytes(storageRef, adjunto.archivo, {
        contentType: adjunto.tipo,
        customMetadata: {
          ownerUid: user.uid,
          rendicionId,
          gastoId,
          adjuntoId: adjunto.id,
        },
      });

      return {
        id: adjunto.id,
        nombre: adjunto.nombre,
        tipo: adjunto.tipo,
        size: adjunto.size ?? adjunto.archivo.size,
        storagePath: storageRef.fullPath,
        downloadURL: await getDownloadURL(storageRef),
        uploadedAt,
      };
    }),
  );
}

async function updateLocalAdjuntosMetadata(uploadedByGasto: Map<string, UploadedAdjunto[]>) {
  for (const uploadedAdjuntos of uploadedByGasto.values()) {
    for (const adjunto of uploadedAdjuntos) {
      await adjuntosTable.update(adjunto.id, {
        size: adjunto.size,
        storagePath: adjunto.storagePath,
        downloadURL: adjunto.downloadURL,
        uploadedAt: adjunto.uploadedAt,
      });
    }
  }
}

function buildRemoteRendicionPayload(
  rendicion: Rendicion,
  user: User,
  usuarioNombre: string | null | undefined,
  gastos: GastoWithAdjuntos[],
  estado: Rendicion['estado'],
  fechaEnvio: string | undefined,
) {
  const montoTotal = gastos.reduce((sum, item) => sum + item.gasto.monto, 0);
  const usuarioEmail = user.email ?? rendicion.usuario_email ?? '';
  const ownerName = usuarioNombre?.trim() || rendicion.usuario_nombre || '';

  const payload = {
    id: rendicion.id,
    uid: user.uid,
    usuario_id: user.uid,
    ownerUid: user.uid,
    usuario_email: usuarioEmail,
    ownerEmail: usuarioEmail,
    usuario_nombre: ownerName,
    titulo: rendicion.titulo,
    glosa: rendicion.glosa_grupo ?? '',
    glosa_grupo: rendicion.glosa_grupo ?? '',
    tipo_rendicion_id: rendicion.tipo_rendicion_id,
    tipo_rendicion_nombre: rendicion.tipo_rendicion_nombre,
    tipo_rendicion_cuenta_contable: rendicion.tipo_rendicion_cuenta_contable,
    estado,
    sync_status: 'SYNCED',
    fecha_creacion: rendicion.fecha_creacion,
    fecha_actualizacion: rendicion.fecha_actualizacion,
    total_gastos: gastos.length,
    monto_total: montoTotal,
    last_synced_at: nowIso(),
    createdAt: rendicion.fecha_creacion,
    updatedAt: rendicion.fecha_actualizacion,
    lastSyncedAt: serverTimestamp(),
    created_at_remote: serverTimestamp(),
    updated_at_remote: serverTimestamp(),
  };

  const payloadWithSendDate = fechaEnvio ? { ...payload, fecha_envio: fechaEnvio } : payload;

  if (estado === 'ENVIADA') {
    return {
      ...payloadWithSendDate,
      fecha_rechazo: deleteField(),
      usuario_rechazo: deleteField(),
      observacion_rechazo: deleteField(),
    };
  }

  return payloadWithSendDate;
}

function buildRemoteGastoPayload(
  gasto: Gasto,
  user: User,
  userEmail: string,
  adjuntos: UploadedAdjunto[],
) {
  const remoteGasto = withNormalizedSnapshots(gasto);

  return {
    id: remoteGasto.id,
    rendicion_id: remoteGasto.rendicion_id,
    uid: user.uid,
    usuario_id: user.uid,
    ownerUid: user.uid,
    usuario_email: userEmail,
    ownerEmail: userEmail,
    fecha: remoteGasto.fecha,
    glosa: remoteGasto.glosa,
    centro_negocio_id: remoteGasto.centro_negocio_id,
    centro_negocio_nombre: remoteGasto.centro_negocio_nombre,
    centro_negocio_codigo: remoteGasto.centro_negocio_codigo,
    centro_costo_id: remoteGasto.centro_negocio_id,
    centro_costo_nombre: remoteGasto.centro_negocio_nombre,
    centro_costo_codigo: remoteGasto.centro_negocio_codigo,
    tipo_documento_id: remoteGasto.tipo_documento_id,
    tipo_documento_nombre: remoteGasto.tipo_documento_nombre,
    tipo_documento_codigo: remoteGasto.tipo_documento_codigo,
    tipo_documento_cuenta_contable: remoteGasto.tipo_documento_cuenta_contable,
    numero_documento: remoteGasto.numero_documento,
    tipo_gasto_id: remoteGasto.tipo_gasto_id,
    tipo_gasto_nombre: remoteGasto.tipo_gasto_nombre,
    tipo_gasto_cuenta_contable: remoteGasto.tipo_gasto_cuenta_contable,
    monto: remoteGasto.monto,
    fecha_creacion: remoteGasto.fecha_creacion ?? remoteGasto.fecha,
    fecha_actualizacion: remoteGasto.fecha_actualizacion ?? remoteGasto.fecha,
    adjuntos,
    updated_at_remote: serverTimestamp(),
  };
}

async function markRendicionSyncError(rendicionId: string, error: unknown): Promise<void> {
  const current = await rendicionesTable.get(rendicionId);

  await rendicionesTable.update(rendicionId, {
    sync_status: getFailedSyncStatus(current?.sync_status),
    sync_error: getSyncErrorMessage(error),
  });
}

async function markRendicionSynced(
  rendicionId: string,
  estado: Rendicion['estado'],
  fechaEnvio?: string,
): Promise<void> {
  const updates: Partial<Rendicion> = {
    estado,
    sync_status: 'SYNCED',
    last_synced_at: nowIso(),
    sync_error: undefined,
  };

  if (fechaEnvio !== undefined) {
    updates.fecha_envio = fechaEnvio;
  }

  if (estado === 'ENVIADA') {
    updates.fecha_rechazo = undefined;
    updates.usuario_rechazo = undefined;
    updates.observacion_rechazo = undefined;
  }

  await rendicionesTable.update(rendicionId, updates);
}

async function deleteRemoteRendicion(rendicion: Rendicion): Promise<void> {
  const rendicionRef = doc(firestoreDb, 'rendiciones', rendicion.id);
  const gastosSnapshot = await getDocs(collection(firestoreDb, 'rendiciones', rendicion.id, 'gastos'));
  const storagePaths = gastosSnapshot.docs.flatMap((gastoSnapshot) => {
    const adjuntos = gastoSnapshot.data().adjuntos;

    return Array.isArray(adjuntos)
      ? adjuntos
          .map((adjunto) => adjunto?.storagePath)
          .filter((storagePath): storagePath is string => typeof storagePath === 'string')
      : [];
  });

  await Promise.all(
    storagePaths.map((storagePath) =>
      deleteObject(ref(firebaseStorage, storagePath)).catch(() => undefined),
    ),
  );

  const batch = writeBatch(firestoreDb);

  gastosSnapshot.docs.forEach((gastoSnapshot) => {
    batch.delete(gastoSnapshot.ref);
  });
  batch.delete(rendicionRef);

  await batch.commit();
  await rendicionesTable.delete(rendicion.id);
}

async function persistRendicionSnapshot(
  rendicionId: string,
  user: User,
  usuarioNombre?: string | null,
  options: PersistOptions = {},
): Promise<void> {
  if (!navigator.onLine) {
    throw new Error('No hay conexion disponible para sincronizar.');
  }

  const rendicion = await rendicionesTable.get(rendicionId);

  if (!rendicion) {
    return;
  }

  assertRendicionBelongsToUser(rendicion, user.uid);

  if (rendicion.sync_status === 'PENDING_DELETE') {
    await deleteRemoteRendicion(rendicion);
    return;
  }

  const gastos = await getGastosWithAdjuntos(rendicion.id);
  const estado = options.estado ?? rendicion.estado;
  const fechaEnvio = options.fechaEnvio ?? rendicion.fecha_envio;
  const uploadedByGasto = new Map<string, UploadedAdjunto[]>();
  const rendicionRef = doc(firestoreDb, 'rendiciones', rendicion.id);

  for (const { gasto, adjuntos } of gastos) {
    uploadedByGasto.set(
      gasto.id,
      await uploadAdjuntos(rendicion.id, gasto.id, adjuntos, user),
    );
  }

  const existingGastosSnapshot = hasRemoteSnapshot(rendicion)
    ? await getDocs(collection(firestoreDb, 'rendiciones', rendicion.id, 'gastos'))
    : null;
  const localGastoIds = new Set(gastos.map(({ gasto }) => gasto.id));
  const batch = writeBatch(firestoreDb);
  const userEmail = user.email ?? rendicion.usuario_email ?? '';

  batch.set(
    rendicionRef,
    buildRemoteRendicionPayload(rendicion, user, usuarioNombre, gastos, estado, fechaEnvio),
    { merge: true },
  );

  existingGastosSnapshot?.docs.forEach((gastoSnapshot) => {
    if (!localGastoIds.has(gastoSnapshot.id)) {
      batch.delete(gastoSnapshot.ref);
    }
  });

  for (const { gasto } of gastos) {
    const gastoRef = doc(firestoreDb, 'rendiciones', rendicion.id, 'gastos', gasto.id);

    batch.set(
      gastoRef,
      buildRemoteGastoPayload(gasto, user, userEmail, uploadedByGasto.get(gasto.id) ?? []),
      { merge: true },
    );
  }

  await batch.commit();
  await updateLocalAdjuntosMetadata(uploadedByGasto);
  await markRendicionSynced(rendicion.id, estado, fechaEnvio);
}

async function getPendingUserRendiciones(user: User): Promise<Rendicion[]> {
  const [byUsuarioId, byUid] = await Promise.all([
    rendicionesTable.where('usuario_id').equals(user.uid).toArray(),
    rendicionesTable.where('uid').equals(user.uid).toArray(),
  ]);
  const uniqueById = new Map<string, Rendicion>();

  [...byUsuarioId, ...byUid].forEach((rendicion) => {
    if (isSyncPending(rendicion.sync_status)) {
      uniqueById.set(rendicion.id, rendicion);
    }
  });

  return Array.from(uniqueById.values()).sort(
    (first, second) =>
      new Date(first.fecha_actualizacion).getTime() -
      new Date(second.fecha_actualizacion).getTime(),
  );
}

export async function syncRendicionDraft(
  rendicionId: string,
  user: User | null,
  usuarioNombre?: string | null,
): Promise<void> {
  if (!user || !navigator.onLine) {
    return;
  }

  try {
    await persistRendicionSnapshot(rendicionId, user, usuarioNombre);
  } catch (error) {
    await markRendicionSyncError(rendicionId, error);
  }
}

export async function syncPendingUserData(
  user: User | null,
  usuarioNombre?: string | null,
): Promise<void> {
  if (!user || !navigator.onLine) {
    return;
  }

  const pendingRendiciones = await getPendingUserRendiciones(user);

  for (const rendicion of pendingRendiciones) {
    try {
      await persistRendicionSnapshot(rendicion.id, user, usuarioNombre);
    } catch (error) {
      await markRendicionSyncError(rendicion.id, error);
    }
  }
}

export async function sendRendicion(
  rendicionId: string,
  user: User | null,
  usuarioNombre?: string | null,
): Promise<void> {
  if (!user) {
    throw new Error('Debes iniciar sesion para enviar una rendicion.');
  }

  if (!navigator.onLine) {
    throw new Error('No hay conexion. El envio requiere estar online.');
  }

  const storedRendicion = await rendicionesTable.get(rendicionId);

  if (!storedRendicion) {
    throw new Error('La rendicion no existe localmente.');
  }

  assertRendicionBelongsToUser(storedRendicion, user.uid);

  const gastos = await getGastosWithAdjuntos(rendicionId);
  const rendicion = validateRendicionForSend(storedRendicion, gastos);
  const fechaEnvio = nowIso();

  try {
    await persistRendicionSnapshot(rendicion.id, user, usuarioNombre, {
      estado: 'ENVIADA',
      fechaEnvio,
    });
  } catch (error) {
    await rendicionesTable.update(rendicion.id, {
      sync_status: getFailedSyncStatus(rendicion.sync_status),
      sync_error: getSyncErrorMessage(error),
    });

    throw new Error(getSyncErrorMessage(error));
  }
}
