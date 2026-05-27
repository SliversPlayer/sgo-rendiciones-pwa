import {
  getCentroNegocioById,
  getTipoDocumentoById,
  getTipoGastoById,
} from './catalogos';
import { adjuntosTable, db, gastosTable, rendicionesTable } from './db';
import type {
  Adjunto,
  AdjuntoInput,
  Gasto,
  GastoConAdjuntos,
  GastoFormData,
} from '../types/gasto';
import {
  MAX_ADJUNTOS_PER_GASTO,
  PDF_MIME_TYPE,
  validatePdfSize,
} from '../utils/attachmentValidation';
import { nowIso } from '../utils/date';
import { createId } from '../utils/id';
import { assertRendicionBelongsToUser } from './rendicionesService';
import type { Rendicion, RendicionSyncStatus } from '../types/rendicion';

async function buildGasto(
  rendicion: Rendicion,
  data: GastoFormData,
  current?: Gasto,
): Promise<Gasto> {
  const [centroNegocio, tipoDocumento, tipoGasto] = await Promise.all([
    getCentroNegocioById(data.centro_negocio_id),
    getTipoDocumentoById(data.tipo_documento_id),
    getTipoGastoById(data.tipo_gasto_id),
  ]);

  if (
    !centroNegocio ||
    !centroNegocio.activo ||
    !tipoDocumento ||
    !tipoDocumento.activo ||
    !tipoGasto ||
    !tipoGasto.activo
  ) {
    throw new Error('Catalogo invalido.');
  }

  const timestamp = nowIso();
  const ownerId = rendicion.usuario_id || rendicion.uid;

  return {
    id: current?.id ?? createId(),
    rendicion_id: rendicion.id,
    uid: ownerId,
    usuario_id: ownerId,
    usuario_email: rendicion.usuario_email,
    fecha: new Date(data.fecha).toISOString(),
    glosa: data.glosa.trim(),
    centro_negocio_id: centroNegocio.id,
    centro_negocio_nombre: centroNegocio.nombre,
    centro_negocio_codigo: centroNegocio.codigo,
    tipo_documento_id: tipoDocumento.id,
    tipo_documento_nombre: tipoDocumento.nombre,
    tipo_documento_codigo: tipoDocumento.codigo,
    tipo_documento_cuenta_contable: tipoDocumento.cuenta_contable,
    numero_documento: data.numero_documento.trim(),
    tipo_gasto_id: tipoGasto.id,
    tipo_gasto_nombre: tipoGasto.nombre,
    tipo_gasto_cuenta_contable: tipoGasto.cuenta_contable,
    monto: Number(data.monto),
    fecha_creacion: current?.fecha_creacion ?? timestamp,
    fecha_actualizacion: timestamp,
  };
}

function buildAdjuntos(gastoId: string, files: AdjuntoInput[]): Adjunto[] {
  return files.map((file) => ({
    id: file.id ?? createId(),
    gasto_id: gastoId,
    archivo: file.archivo,
    nombre: file.nombre,
    tipo: file.tipo,
    size: file.size ?? file.archivo.size,
    storagePath: file.storagePath,
    downloadURL: file.downloadURL,
    uploadedAt: file.uploadedAt,
  }));
}

function validateAdjuntos(files: AdjuntoInput[]): void {
  if (files.length > MAX_ADJUNTOS_PER_GASTO) {
    throw new Error('Cada gasto puede tener maximo 2 adjuntos.');
  }

  files.forEach((file) => {
    if (file.tipo === PDF_MIME_TYPE || file.archivo.type === PDF_MIME_TYPE) {
      validatePdfSize(file.archivo, file.nombre);
    }
  });
}

function getPendingSyncStatus(status: RendicionSyncStatus): RendicionSyncStatus {
  if (status === 'LOCAL' || status === 'PENDING_CREATE') {
    return 'PENDING_CREATE';
  }

  return 'PENDING_UPDATE';
}

async function markRendicionChanged(rendicion: Rendicion): Promise<void> {
  await rendicionesTable.update(rendicion.id, {
    sync_status: getPendingSyncStatus(rendicion.sync_status),
    fecha_actualizacion: nowIso(),
    sync_error: undefined,
  });
}

async function getOwnedRendicionOrThrow(rendicionId: string, usuarioId: string) {
  const rendicion = await rendicionesTable.get(rendicionId);

  if (!rendicion) {
    throw new Error('Rendicion no encontrada.');
  }

  assertRendicionBelongsToUser(rendicion, usuarioId);

  return rendicion;
}

async function assertRendicionEditable(
  rendicionId: string,
  usuarioId: string,
): Promise<Rendicion> {
  const rendicion = await getOwnedRendicionOrThrow(rendicionId, usuarioId);

  if (!['BORRADOR', 'ERROR', 'RECHAZADA'].includes(rendicion.estado)) {
    throw new Error('Esta rendicion ya fue enviada y esta bloqueada para edicion.');
  }

  return rendicion;
}

export async function getGastosByRendicion(
  rendicionId: string,
  usuarioId: string,
): Promise<Gasto[]> {
  await getOwnedRendicionOrThrow(rendicionId, usuarioId);

  const gastos = await gastosTable.where('rendicion_id').equals(rendicionId).sortBy('fecha');
  return gastos.reverse();
}

export async function getGastoConAdjuntos(
  gastoId: string,
  usuarioId: string,
): Promise<GastoConAdjuntos | undefined> {
  const gasto = await gastosTable.get(gastoId);

  if (!gasto) {
    return undefined;
  }

  await getOwnedRendicionOrThrow(gasto.rendicion_id, usuarioId);

  const adjuntos = await adjuntosTable.where('gasto_id').equals(gastoId).toArray();
  return { gasto, adjuntos };
}

export async function getGastosConAdjuntosByRendicion(
  rendicionId: string,
  usuarioId: string,
): Promise<GastoConAdjuntos[]> {
  const gastos = await getGastosByRendicion(rendicionId, usuarioId);

  return Promise.all(
    gastos.map(async (gasto) => ({
      gasto,
      adjuntos: await adjuntosTable.where('gasto_id').equals(gasto.id).toArray(),
    })),
  );
}

export async function createGasto(
  rendicionId: string,
  data: GastoFormData,
  adjuntos: AdjuntoInput[],
  usuarioId: string,
): Promise<GastoConAdjuntos> {
  const rendicion = await assertRendicionEditable(rendicionId, usuarioId);
  validateAdjuntos(adjuntos);

  const gasto = await buildGasto(rendicion, data);
  const storedAdjuntos = buildAdjuntos(gasto.id, adjuntos);

  await db.transaction('rw', rendicionesTable, gastosTable, adjuntosTable, async () => {
    await gastosTable.add(gasto);
    if (storedAdjuntos.length > 0) {
      await adjuntosTable.bulkAdd(storedAdjuntos);
    }
    await markRendicionChanged(rendicion);
  });

  return { gasto, adjuntos: storedAdjuntos };
}

export async function updateGasto(
  gastoId: string,
  data: GastoFormData,
  adjuntos: AdjuntoInput[],
  usuarioId: string,
): Promise<GastoConAdjuntos> {
  const current = await gastosTable.get(gastoId);

  if (!current) {
    throw new Error('Gasto no encontrado.');
  }

  const rendicion = await assertRendicionEditable(current.rendicion_id, usuarioId);
  validateAdjuntos(adjuntos);

  const gasto = await buildGasto(rendicion, data, current);
  const storedAdjuntos = buildAdjuntos(gasto.id, adjuntos);

  await db.transaction('rw', rendicionesTable, gastosTable, adjuntosTable, async () => {
    await gastosTable.put(gasto);
    await adjuntosTable.where('gasto_id').equals(gasto.id).delete();
    if (storedAdjuntos.length > 0) {
      await adjuntosTable.bulkAdd(storedAdjuntos);
    }
    await markRendicionChanged(rendicion);
  });

  return { gasto, adjuntos: storedAdjuntos };
}

export async function deleteGasto(gasto: Gasto, usuarioId: string): Promise<void> {
  const rendicion = await assertRendicionEditable(gasto.rendicion_id, usuarioId);

  await db.transaction('rw', rendicionesTable, gastosTable, adjuntosTable, async () => {
    await adjuntosTable.where('gasto_id').equals(gasto.id).delete();
    await gastosTable.delete(gasto.id);
    await markRendicionChanged(rendicion);
  });
}
