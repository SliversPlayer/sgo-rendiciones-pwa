import {
  centrosCosto,
  findCatalogoItem,
  tiposDocumento,
  tiposGasto,
} from './catalogos';
import { adjuntosTable, db, gastosTable, rendicionesTable } from './db';
import type {
  Adjunto,
  AdjuntoInput,
  Gasto,
  GastoConAdjuntos,
  GastoFormData,
} from '../types/gasto';
import { nowIso } from '../utils/date';
import { createId } from '../utils/id';

function buildGasto(
  rendicionId: string,
  data: GastoFormData,
  current?: Gasto,
): Gasto {
  const centroCosto = findCatalogoItem(centrosCosto, data.centro_costo_id);
  const tipoDocumento = findCatalogoItem(tiposDocumento, data.tipo_documento_id);
  const tipoGasto = findCatalogoItem(tiposGasto, data.tipo_gasto_id);

  if (!centroCosto || !tipoDocumento || !tipoGasto) {
    throw new Error('Catalogo invalido.');
  }

  return {
    id: current?.id ?? createId(),
    rendicion_id: rendicionId,
    fecha: new Date(data.fecha).toISOString(),
    glosa: data.glosa.trim(),
    centro_costo_id: centroCosto.id,
    centro_costo_nombre: centroCosto.nombre,
    tipo_documento_id: tipoDocumento.id,
    tipo_documento_nombre: tipoDocumento.nombre,
    numero_documento: data.numero_documento.trim(),
    tipo_gasto_id: tipoGasto.id,
    tipo_gasto_nombre: tipoGasto.nombre,
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

async function touchRendicion(rendicionId: string): Promise<void> {
  await rendicionesTable.update(rendicionId, {
    fecha_actualizacion: nowIso(),
  });
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

export async function createGasto(
  rendicionId: string,
  data: GastoFormData,
  adjuntos: AdjuntoInput[],
): Promise<GastoConAdjuntos> {
  const gasto = buildGasto(rendicionId, data);
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

  const gasto = buildGasto(current.rendicion_id, data, current);
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
  await db.transaction('rw', rendicionesTable, gastosTable, adjuntosTable, async () => {
    await adjuntosTable.where('gasto_id').equals(gasto.id).delete();
    await gastosTable.delete(gasto.id);
    await touchRendicion(gasto.rendicion_id);
  });
}
