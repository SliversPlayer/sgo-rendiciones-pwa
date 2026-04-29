import { rendicionesTable } from './db';
import type { Rendicion, RendicionFormData } from '../types/rendicion';
import { DEMO_USER } from '../utils/demoUser';
import { nowIso } from '../utils/date';
import { createId } from '../utils/id';

export async function getRendiciones(): Promise<Rendicion[]> {
  return rendicionesTable.orderBy('fecha_creacion').reverse().toArray();
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
  await rendicionesTable.delete(id);
}
