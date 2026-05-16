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

async function buildGasto(
  rendicionId: string,
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

  return {
    id: current?.id ?? createId(),
    rendicion_id: rendicionId,
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
  };
}

function buildAdjuntos(gastoId: string, files: AdjuntoInput[]): Adjunto[] {
  return files.map((file) => ({
    id: createId(),
    gasto_id: gastoId,
    archivo: file.archivo,
    nombre: file.nombre,
    tipo: file.tipo,
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

async function touchRendicion(rendicionId: string): Promise<void> {
  await rendicionesTable.update(rendicionId, {
    fecha_actualizacion: nowIso(),
  });
}

async function assertRendicionEditable(rendicionId: string): Promise<void> {
  const rendicion = await rendicionesTable.get(rendicionId);

  if (!rendicion) {
    throw new Error('Rendicion no encontrada.');
  }

  if (!['BORRADOR', 'ERROR', 'RECHAZADA'].includes(rendicion.estado)) {
    throw new Error('Esta rendicion ya fue enviada y esta bloqueada para edicion.');
  }
}

export async function getGastosByRendicion(rendicionId: string): Promise<Gasto[]> {
  const gastos = await gastosTable.where('rendicion_id').equals(rendicionId).sortBy('fecha');
  return gastos.reverse();
}

export async function getGastoConAdjuntos(gastoId: string): Promise<GastoConAdjuntos | undefined> {
  const gasto = await gastosTable.get(gastoId);

  if (!gasto) {
    return undefined;
  }

  const adjuntos = await adjuntosTable.where('gasto_id').equals(gastoId).toArray();
  return { gasto, adjuntos };
}

export async function getGastosConAdjuntosByRendicion(
  rendicionId: string,
): Promise<GastoConAdjuntos[]> {
  const gastos = await getGastosByRendicion(rendicionId);

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
): Promise<GastoConAdjuntos> {
  await assertRendicionEditable(rendicionId);
  validateAdjuntos(adjuntos);

  const gasto = await buildGasto(rendicionId, data);
  const storedAdjuntos = buildAdjuntos(gasto.id, adjuntos);

  await db.transaction('rw', rendicionesTable, gastosTable, adjuntosTable, async () => {
    await gastosTable.add(gasto);
    await adjuntosTable.bulkAdd(storedAdjuntos);
    await touchRendicion(rendicionId);
  });

  return { gasto, adjuntos: storedAdjuntos };
}

export async function updateGasto(
  gastoId: string,
  data: GastoFormData,
  adjuntos: AdjuntoInput[],
): Promise<GastoConAdjuntos> {
  const current = await gastosTable.get(gastoId);

  if (!current) {
    throw new Error('Gasto no encontrado.');
  }

  await assertRendicionEditable(current.rendicion_id);
  validateAdjuntos(adjuntos);

  const gasto = await buildGasto(current.rendicion_id, data, current);
  const storedAdjuntos = buildAdjuntos(gasto.id, adjuntos);

  await db.transaction('rw', rendicionesTable, gastosTable, adjuntosTable, async () => {
    await gastosTable.put(gasto);
    await adjuntosTable.where('gasto_id').equals(gasto.id).delete();
    await adjuntosTable.bulkAdd(storedAdjuntos);
    await touchRendicion(gasto.rendicion_id);
  });

  return { gasto, adjuntos: storedAdjuntos };
}

export async function deleteGasto(gasto: Gasto): Promise<void> {
  await assertRendicionEditable(gasto.rendicion_id);

  await db.transaction('rw', rendicionesTable, gastosTable, adjuntosTable, async () => {
    await adjuntosTable.where('gasto_id').equals(gasto.id).delete();
    await gastosTable.delete(gasto.id);
    await touchRendicion(gasto.rendicion_id);
  });
}
