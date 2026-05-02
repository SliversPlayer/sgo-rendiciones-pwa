import { adjuntosTable, db, gastosTable, rendicionesTable } from './db';
import type { Rendicion, RendicionFormData } from '../types/rendicion';
import { DEMO_USER } from '../utils/demoUser';
import { nowIso } from '../utils/date';
import { createId } from '../utils/id';

export async function getRendiciones(): Promise<Rendicion[]> {
  return rendicionesTable.orderBy('fecha_creacion').reverse().toArray();
}

export async function getRendicionById(id: string): Promise<Rendicion | undefined> {
  return rendicionesTable.get(id);
}

export async function createRendicion(data: RendicionFormData): Promise<Rendicion> {
  const timestamp = nowIso();
  const rendicion: Rendicion = {
    id: createId(),
    usuario_id: DEMO_USER.usuario_id,
    titulo: data.titulo.trim(),
    glosa_grupo: data.glosa_grupo.trim() || undefined,
    estado: 'BORRADOR',
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
    const gastos = await gastosTable.where('rendicion_id').equals(id).toArray();
    const gastoIds = gastos.map((gasto) => gasto.id);

    if (gastoIds.length > 0) {
      await adjuntosTable.where('gasto_id').anyOf(gastoIds).delete();
      await gastosTable.bulkDelete(gastoIds);
    }

    await rendicionesTable.delete(id);
  });
}
