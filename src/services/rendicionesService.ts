import { adjuntosTable, db, gastosTable, rendicionesTable } from './db';
import type { Rendicion, RendicionFormData } from '../types/rendicion';
import { nowIso } from '../utils/date';
import { createId } from '../utils/id';
import { isRendicionEditable } from '../utils/rendicionStatus';

export async function getRendiciones(): Promise<Rendicion[]> {
  return rendicionesTable.orderBy('fecha_creacion').reverse().toArray();
}

export async function getRendicionById(id: string): Promise<Rendicion | undefined> {
  return rendicionesTable.get(id);
}

export async function createRendicion(
  data: RendicionFormData,
  usuarioId: string,
  usuarioEmail?: string | null,
): Promise<Rendicion> {
  const timestamp = nowIso();
  const rendicion: Rendicion = {
    id: createId(),
    usuario_id: usuarioId,
    usuario_email: usuarioEmail ?? undefined,
    titulo: data.titulo.trim(),
    glosa_grupo: data.glosa_grupo.trim() || undefined,
    estado: 'BORRADOR',
    sync_status: 'LOCAL',
    fecha_creacion: timestamp,
    fecha_actualizacion: timestamp,
  };

  await rendicionesTable.add(rendicion);
  return rendicion;
}

export async function updateRendicion(
  current: Rendicion,
  data: RendicionFormData,
): Promise<Rendicion> {
  if (!isRendicionEditable(current)) {
    throw new Error('Esta rendicion ya fue enviada y esta bloqueada para edicion.');
  }

  const updated: Rendicion = {
    ...current,
    titulo: data.titulo.trim(),
    glosa_grupo: data.glosa_grupo.trim() || undefined,
    fecha_actualizacion: nowIso(),
  };

  await rendicionesTable.put(updated);
  return updated;
}

export async function deleteRendicion(id: string): Promise<void> {
  await db.transaction('rw', rendicionesTable, gastosTable, adjuntosTable, async () => {
    const rendicion = await rendicionesTable.get(id);

    if (!rendicion) {
      return;
    }

    if (!isRendicionEditable(rendicion)) {
      throw new Error('Esta rendicion ya fue enviada y no se puede eliminar.');
    }

    const gastos = await gastosTable.where('rendicion_id').equals(id).toArray();
    const gastoIds = gastos.map((gasto) => gasto.id);

    if (gastoIds.length > 0) {
      await adjuntosTable.where('gasto_id').anyOf(gastoIds).delete();
      await gastosTable.bulkDelete(gastoIds);
    }

    await rendicionesTable.delete(id);
  });
}

export async function updateRendicionSyncState(
  id: string,
  updates: Pick<Rendicion, 'estado' | 'sync_status'> &
    Partial<Pick<Rendicion, 'fecha_envio' | 'sync_error'>>,
): Promise<void> {
  await rendicionesTable.update(id, {
    ...updates,
    fecha_actualizacion: nowIso(),
  });
}
