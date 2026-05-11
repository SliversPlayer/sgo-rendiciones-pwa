import { FirebaseError } from 'firebase/app';
import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type { User } from 'firebase/auth';
import { centrosCosto, findCatalogoItem, tiposDocumento, tiposGasto } from './catalogos';
import { adjuntosTable, gastosTable, rendicionesTable } from './db';
import { firestoreDb, firebaseStorage } from './firebase/firebase';
import { updateRendicionSyncState } from './rendicionesService';
import type { Adjunto, Gasto } from '../types/gasto';
import type { Rendicion } from '../types/rendicion';
import { nowIso } from '../utils/date';

interface UploadedAdjunto {
  id: string;
  nombre: string;
  tipo: string;
  size: number;
  storagePath: string;
  downloadURL: string;
}

interface GastoWithAdjuntos {
  gasto: Gasto;
  adjuntos: Adjunto[];
}

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

  if (error instanceof Error) {
    return error.message;
  }

  return 'No se pudo enviar la rendicion. Intenta nuevamente.';
}

function validateGasto(gasto: Gasto, adjuntos: Adjunto[]): string | null {
  if (!gasto.fecha || Number.isNaN(new Date(gasto.fecha).getTime())) {
    return `El gasto "${gasto.glosa || gasto.id}" no tiene una fecha valida.`;
  }

  if (!gasto.glosa?.trim()) {
    return 'Hay un gasto sin glosa.';
  }

  if (!gasto.centro_costo_id || !gasto.centro_costo_nombre) {
    return `El gasto "${gasto.glosa}" no tiene centro de costo.`;
  }

  if (!gasto.tipo_documento_id || !gasto.tipo_documento_nombre) {
    return `El gasto "${gasto.glosa}" no tiene tipo de documento.`;
  }

  if (!gasto.numero_documento?.trim()) {
    return `El gasto "${gasto.glosa}" no tiene numero de documento.`;
  }

  if (!gasto.tipo_gasto_id || !gasto.tipo_gasto_nombre) {
    return `El gasto "${gasto.glosa}" no tiene tipo de gasto.`;
  }

  if (!gasto.monto || gasto.monto <= 0) {
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

function validateRendicion(rendicion: Rendicion | undefined, gastos: GastoWithAdjuntos[]): Rendicion {
  if (!rendicion) {
    throw new Error('La rendicion no existe localmente.');
  }

  if (rendicion.estado === 'ENVIADA' || rendicion.sync_status === 'SYNCED') {
    throw new Error('Esta rendicion ya fue enviada.');
  }

  if (rendicion.estado === 'APROBADA') {
    throw new Error('Esta rendicion ya fue aprobada y no puede reenviarse.');
  }

  if (rendicion.estado === 'ENVIANDO') {
    throw new Error('Esta rendicion ya esta en proceso de envio.');
  }

  if (gastos.length === 0) {
    throw new Error('La rendicion debe tener al menos 1 gasto para enviarse.');
  }

  const invalidGasto = gastos
    .map(({ gasto, adjuntos }) => validateGasto(gasto, adjuntos))
    .find(Boolean);

  if (invalidGasto) {
    throw new Error(invalidGasto);
  }

  return rendicion;
}

async function uploadAdjuntos(
  rendicionId: string,
  gastoId: string,
  adjuntos: Adjunto[],
): Promise<UploadedAdjunto[]> {
  return Promise.all(
    adjuntos.map(async (adjunto) => {
      const fileName = `${adjunto.id}-${sanitizeFileName(adjunto.nombre)}`;
      const storageRef = ref(firebaseStorage, `adjuntos/${rendicionId}/${gastoId}/${fileName}`);

      await uploadBytes(storageRef, adjunto.archivo, {
        contentType: adjunto.tipo,
      });

      return {
        id: adjunto.id,
        nombre: adjunto.nombre,
        tipo: adjunto.tipo,
        size: adjunto.archivo.size,
        storagePath: storageRef.fullPath,
        downloadURL: await getDownloadURL(storageRef),
      };
    }),
  );
}

function withCatalogCodes(gasto: Gasto): Gasto {
  const centroCosto = findCatalogoItem(centrosCosto, gasto.centro_costo_id);
  const tipoDocumento = findCatalogoItem(tiposDocumento, gasto.tipo_documento_id);
  const tipoGasto = findCatalogoItem(tiposGasto, gasto.tipo_gasto_id);

  return {
    ...gasto,
    centro_costo_codigo: gasto.centro_costo_codigo ?? centroCosto?.codigo ?? '',
    tipo_documento_codigo: gasto.tipo_documento_codigo ?? tipoDocumento?.codigo ?? '',
    tipo_gasto_codigo: gasto.tipo_gasto_codigo ?? tipoGasto?.codigo ?? '',
  };
}

export async function sendRendicion(rendicionId: string, user: User | null): Promise<void> {
  if (!user) {
    throw new Error('Debes iniciar sesion para enviar una rendicion.');
  }

  if (!navigator.onLine) {
    throw new Error('No hay conexion. El envio requiere estar online.');
  }

  const [storedRendicion, gastos] = await Promise.all([
    rendicionesTable.get(rendicionId),
    getGastosWithAdjuntos(rendicionId),
  ]);
  const rendicion = validateRendicion(storedRendicion, gastos);

  try {
    await updateRendicionSyncState(rendicion.id, {
      estado: 'ENVIANDO',
      sync_status: 'PENDING',
      sync_error: undefined,
    });

    const uploadedByGasto = new Map<string, UploadedAdjunto[]>();

    for (const { gasto, adjuntos } of gastos) {
      uploadedByGasto.set(
        gasto.id,
        await uploadAdjuntos(rendicion.id, gasto.id, adjuntos),
      );
    }

    const totalGastos = gastos.length;
    const montoTotal = gastos.reduce((sum, item) => sum + item.gasto.monto, 0);
    const fechaEnvio = nowIso();
    const batch = writeBatch(firestoreDb);
    const rendicionRef = doc(firestoreDb, 'rendiciones', rendicion.id);

    batch.set(rendicionRef, {
      id: rendicion.id,
      usuario_id: user.uid,
      usuario_email: user.email ?? rendicion.usuario_email ?? '',
      titulo: rendicion.titulo,
      glosa: rendicion.glosa_grupo ?? '',
      estado: 'ENVIADA',
      sync_status: 'SYNCED',
      fecha_creacion: rendicion.fecha_creacion,
      fecha_actualizacion: rendicion.fecha_actualizacion,
      fecha_envio: fechaEnvio,
      total_gastos: totalGastos,
      monto_total: montoTotal,
      created_at_remote: serverTimestamp(),
      updated_at_remote: serverTimestamp(),
    });

    for (const { gasto } of gastos) {
      const remoteGasto = withCatalogCodes(gasto);
      const gastoRef = doc(firestoreDb, 'rendiciones', rendicion.id, 'gastos', gasto.id);

      batch.set(gastoRef, {
        id: remoteGasto.id,
        rendicion_id: remoteGasto.rendicion_id,
        fecha: remoteGasto.fecha,
        glosa: remoteGasto.glosa,
        centro_costo_id: remoteGasto.centro_costo_id,
        centro_costo_nombre: remoteGasto.centro_costo_nombre,
        centro_costo_codigo: remoteGasto.centro_costo_codigo,
        tipo_documento_id: remoteGasto.tipo_documento_id,
        tipo_documento_nombre: remoteGasto.tipo_documento_nombre,
        tipo_documento_codigo: remoteGasto.tipo_documento_codigo,
        numero_documento: remoteGasto.numero_documento,
        tipo_gasto_id: remoteGasto.tipo_gasto_id,
        tipo_gasto_nombre: remoteGasto.tipo_gasto_nombre,
        tipo_gasto_codigo: remoteGasto.tipo_gasto_codigo,
        monto: remoteGasto.monto,
        adjuntos: uploadedByGasto.get(remoteGasto.id) ?? [],
      });
    }

    await batch.commit();
    await updateRendicionSyncState(rendicion.id, {
      estado: 'ENVIADA',
      sync_status: 'SYNCED',
      fecha_envio: fechaEnvio,
      sync_error: undefined,
    });
  } catch (error) {
    await updateRendicionSyncState(rendicion.id, {
      estado: 'ERROR',
      sync_status: 'ERROR',
      sync_error: getSyncErrorMessage(error),
    });

    throw new Error(getSyncErrorMessage(error));
  }
}
