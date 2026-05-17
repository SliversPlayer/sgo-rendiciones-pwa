import { adjuntosTable, db, gastosTable, rendicionesTable } from './db';
import { getTipoRendicionById } from './catalogos';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestoreDb } from './firebase/firebase';
import type { Rendicion, RendicionFormData } from '../types/rendicion';
import { nowIso } from '../utils/date';
import { createId } from '../utils/id';
import { isRendicionEditable } from '../utils/rendicionStatus';

export interface RendicionesStats {
  totalRendiciones: number;
  totalBorradores: number;
  totalEnviadas: number;
  montoTotalAcumulado: number;
}

export async function getRendiciones(): Promise<Rendicion[]> {
  return rendicionesTable.orderBy('fecha_actualizacion').reverse().toArray();
}

export async function getRendicionById(id: string): Promise<Rendicion | undefined> {
  return rendicionesTable.get(id);
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

export async function refreshUserRendicionesFromRemote(usuarioId: string): Promise<void> {
  const remoteQuery = query(
    collection(firestoreDb, 'rendiciones'),
    where('usuario_id', '==', usuarioId),
  );
  const snapshot = await getDocs(remoteQuery);

  await db.transaction('rw', rendicionesTable, async () => {
    for (const documentSnapshot of snapshot.docs) {
      const remote = documentSnapshot.data() as Partial<Rendicion>;
      const local = await rendicionesTable.get(documentSnapshot.id);

      if (!local || !remote.estado) {
        continue;
      }

      if (remote.estado === 'APROBADA') {
        await rendicionesTable.update(local.id, {
          estado: 'APROBADA',
          sync_status: 'SYNCED',
          fecha_actualizacion: nowIso(),
          sync_error: undefined,
          ...getRemoteAdminFields(remote),
        });
        continue;
      }

      if (remote.estado === 'RECHAZADA') {
        await rendicionesTable.update(local.id, {
          estado: 'RECHAZADA',
          sync_status: 'LOCAL',
          fecha_actualizacion: nowIso(),
          sync_error: undefined,
          ...getRemoteAdminFields(remote),
        });
      }
    }
  });
}

export async function getRendicionesStats(): Promise<RendicionesStats> {
  const [rendiciones, gastos] = await Promise.all([
    rendicionesTable.toArray(),
    gastosTable.toArray(),
  ]);

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
    tipo_rendicion_nombre: tipoRendicion.nombre,
    tipo_rendicion_cuenta_contable: tipoRendicion.cuenta_contable,
  };
}

export async function createRendicion(
  data: RendicionFormData,
  usuarioId: string,
  usuarioEmail?: string | null,
): Promise<Rendicion> {
  const timestamp = nowIso();
  const tipoRendicion = await getTipoRendicionSnapshot(data);
  const rendicion: Rendicion = {
    id: createId(),
    usuario_id: usuarioId,
    usuario_email: usuarioEmail ?? undefined,
    titulo: data.titulo.trim(),
    glosa_grupo: data.glosa_grupo.trim() || undefined,
    ...tipoRendicion,
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

  const tipoRendicion = await getTipoRendicionSnapshot(data);
  const updated: Rendicion = {
    ...current,
    titulo: data.titulo.trim(),
    glosa_grupo: data.glosa_grupo.trim() || undefined,
    ...tipoRendicion,
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
