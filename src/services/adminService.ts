import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import type {
  AdminAdjunto,
  AdminEstadoFilter,
  AdminGasto,
  AdminRendicion,
  AdminRendicionDetalle,
} from '../types/admin';
import type { RendicionEstado } from '../types/rendicion';
import { nowIso } from '../utils/date';
import { firestoreDb } from './firebase/firebase';

const ADMIN_ESTADOS: RendicionEstado[] = ['ENVIADA', 'APROBADA', 'RECHAZADA'];

interface AdminActor {
  uid: string;
  email?: string | null;
}

function getActorLabel(actor: AdminActor): string {
  return actor.email ? `${actor.email} (${actor.uid})` : actor.uid;
}

function normalizeRendicion(id: string, data: Partial<AdminRendicion>): AdminRendicion {
  return {
    id,
    usuario_id: data.usuario_id ?? '',
    usuario_nombre: data.usuario_nombre,
    usuario_email: data.usuario_email,
    titulo: data.titulo ?? 'Sin titulo',
    glosa_grupo: data.glosa_grupo ?? data.glosa,
    tipo_rendicion_id: data.tipo_rendicion_id ?? '',
    tipo_rendicion_nombre: data.tipo_rendicion_nombre ?? '',
    tipo_rendicion_cuenta_contable: data.tipo_rendicion_cuenta_contable ?? '',
    estado: data.estado ?? 'ENVIADA',
    sync_status: data.sync_status ?? 'SYNCED',
    fecha_creacion: data.fecha_creacion ?? '',
    fecha_actualizacion: data.fecha_actualizacion ?? '',
    fecha_envio: data.fecha_envio,
    fecha_aprobacion: data.fecha_aprobacion,
    usuario_aprobacion: data.usuario_aprobacion,
    fecha_rechazo: data.fecha_rechazo,
    usuario_rechazo: data.usuario_rechazo,
    observacion_rechazo: data.observacion_rechazo,
    sync_error: data.sync_error,
    glosa: data.glosa,
    total_gastos: data.total_gastos,
    monto_total: data.monto_total,
  };
}

function normalizeAdjunto(data: Partial<AdminAdjunto>): AdminAdjunto {
  return {
    id: data.id ?? '',
    nombre: data.nombre ?? 'Adjunto',
    tipo: data.tipo ?? '',
    size: data.size ?? 0,
    storagePath: data.storagePath ?? '',
    downloadURL: data.downloadURL ?? '',
  };
}

function normalizeGasto(id: string, data: Partial<AdminGasto>): AdminGasto {
  return {
    id,
    rendicion_id: data.rendicion_id ?? '',
    fecha: data.fecha ?? '',
    glosa: data.glosa ?? 'Sin glosa',
    centro_negocio_id: data.centro_negocio_id ?? '',
    centro_negocio_nombre: data.centro_negocio_nombre ?? '',
    centro_negocio_codigo: data.centro_negocio_codigo ?? '',
    tipo_documento_id: data.tipo_documento_id ?? '',
    tipo_documento_nombre: data.tipo_documento_nombre ?? '',
    tipo_documento_codigo: data.tipo_documento_codigo ?? '',
    tipo_documento_cuenta_contable: data.tipo_documento_cuenta_contable ?? '',
    numero_documento: data.numero_documento ?? '',
    tipo_gasto_id: data.tipo_gasto_id ?? '',
    tipo_gasto_nombre: data.tipo_gasto_nombre ?? '',
    tipo_gasto_cuenta_contable: data.tipo_gasto_cuenta_contable ?? '',
    monto: data.monto ?? 0,
    adjuntos: Array.isArray(data.adjuntos) ? data.adjuntos.map(normalizeAdjunto) : [],
  };
}

export async function getAdminRendiciones(
  estado: AdminEstadoFilter,
): Promise<AdminRendicion[]> {
  const baseCollection = collection(firestoreDb, 'rendiciones');
  const rendicionesQuery =
    estado === 'TODAS'
      ? query(baseCollection, where('estado', 'in', ADMIN_ESTADOS))
      : query(baseCollection, where('estado', '==', estado));
  const snapshot = await getDocs(rendicionesQuery);

  return snapshot.docs
    .map((documentSnapshot) =>
      normalizeRendicion(documentSnapshot.id, documentSnapshot.data() as Partial<AdminRendicion>),
    )
    .sort(
      (first, second) =>
        new Date(second.fecha_envio ?? second.fecha_actualizacion).getTime() -
        new Date(first.fecha_envio ?? first.fecha_actualizacion).getTime(),
    );
}

export async function getAdminRendicionDetalle(
  rendicionId: string,
): Promise<AdminRendicionDetalle> {
  const rendicionRef = doc(firestoreDb, 'rendiciones', rendicionId);
  const rendicionSnapshot = await getDoc(rendicionRef);

  if (!rendicionSnapshot.exists()) {
    throw new Error('Rendicion no encontrada en Firestore.');
  }

  const gastosSnapshot = await getDocs(collection(rendicionRef, 'gastos'));

  return {
    rendicion: normalizeRendicion(
      rendicionSnapshot.id,
      rendicionSnapshot.data() as Partial<AdminRendicion>,
    ),
    gastos: gastosSnapshot.docs
      .map((documentSnapshot) =>
        normalizeGasto(documentSnapshot.id, documentSnapshot.data() as Partial<AdminGasto>),
      )
      .sort(
        (first, second) => new Date(second.fecha).getTime() - new Date(first.fecha).getTime(),
      ),
  };
}

export async function aprobarRendicionAdmin(
  rendicionId: string,
  actor: AdminActor,
): Promise<void> {
  await updateDoc(doc(firestoreDb, 'rendiciones', rendicionId), {
    estado: 'APROBADA',
    sync_status: 'SYNCED',
    fecha_aprobacion: nowIso(),
    usuario_aprobacion: getActorLabel(actor),
    updated_at_remote: serverTimestamp(),
  });
}

export async function rechazarRendicionAdmin(
  rendicionId: string,
  actor: AdminActor,
  observacion: string,
): Promise<void> {
  const trimmedObservacion = observacion.trim();

  if (!trimmedObservacion) {
    throw new Error('La observacion de rechazo es obligatoria.');
  }

  await updateDoc(doc(firestoreDb, 'rendiciones', rendicionId), {
    estado: 'RECHAZADA',
    sync_status: 'LOCAL',
    fecha_rechazo: nowIso(),
    usuario_rechazo: getActorLabel(actor),
    observacion_rechazo: trimmedObservacion,
    updated_at_remote: serverTimestamp(),
  });
}
