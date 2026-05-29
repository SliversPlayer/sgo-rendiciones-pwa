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

type AdminRendicionEstado = Extract<RendicionEstado, 'ENVIADA' | 'APROBADA' | 'RECHAZADA'>;
const RENDICION_ESTADOS: RendicionEstado[] = [
  'BORRADOR',
  'PENDIENTE_ENVIO',
  'ENVIANDO',
  'ENVIADA',
  'APROBADA',
  'RECHAZADA',
  'ERROR',
];
const ADMIN_ESTADOS: AdminRendicionEstado[] = ['ENVIADA', 'APROBADA', 'RECHAZADA'];
const ADMIN_ESTADO_VARIANT_BY_ESTADO: Record<AdminRendicionEstado, string[]> = {
  ENVIADA: ['ENVIADA', 'enviada', 'Enviada'],
  APROBADA: ['APROBADA', 'aprobada', 'Aprobada'],
  RECHAZADA: ['RECHAZADA', 'rechazada', 'Rechazada'],
};
const ADMIN_ESTADO_VARIANTS: Record<AdminEstadoFilter, string[]> = {
  TODAS: ADMIN_ESTADOS.flatMap((estado) => ADMIN_ESTADO_VARIANT_BY_ESTADO[estado]),
  ENVIADA: ADMIN_ESTADO_VARIANT_BY_ESTADO.ENVIADA,
  APROBADA: ADMIN_ESTADO_VARIANT_BY_ESTADO.APROBADA,
  RECHAZADA: ADMIN_ESTADO_VARIANT_BY_ESTADO.RECHAZADA,
};

interface AdminActor {
  uid: string;
  email?: string | null;
}

function getActorLabel(actor: AdminActor): string {
  return actor.email ? `${actor.email} (${actor.uid})` : actor.uid;
}

function isAdminEstado(value: unknown): value is AdminRendicionEstado {
  return ADMIN_ESTADOS.includes(value as AdminRendicionEstado);
}

function isRendicionEstado(value: unknown): value is RendicionEstado {
  return RENDICION_ESTADOS.includes(value as RendicionEstado);
}

function normalizeAdminEstado(value?: string): RendicionEstado {
  const normalizedValue = value?.trim().toUpperCase();

  return isRendicionEstado(normalizedValue) ? normalizedValue : 'ERROR';
}

function normalizeRendicion(id: string, data: Partial<AdminRendicion>): AdminRendicion {
  return {
    id,
    uid: data.uid ?? data.usuario_id,
    usuario_id: data.usuario_id ?? data.uid ?? '',
    usuario_nombre: data.usuario_nombre,
    usuario_email: data.usuario_email,
    titulo: data.titulo ?? 'Sin titulo',
    glosa_grupo: data.glosa_grupo ?? data.glosa,
    tipo_rendicion_id: data.tipo_rendicion_id ?? '',
    tipo_rendicion_nombre: data.tipo_rendicion_nombre ?? '',
    tipo_rendicion_cuenta_contable: data.tipo_rendicion_cuenta_contable ?? '',
    estado: normalizeAdminEstado(data.estado),
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
  const estadoVariants = ADMIN_ESTADO_VARIANTS[estado];
  const snapshots = await Promise.all(
    estadoVariants.map((estadoValue) =>
      getDocs(query(baseCollection, where('estado', '==', estadoValue))),
    ),
  );
  const documentsById = snapshots.reduce((itemsById, snapshot) => {
    snapshot.docs.forEach((documentSnapshot) => {
      itemsById.set(documentSnapshot.id, documentSnapshot);
    });

    return itemsById;
  }, new Map<string, (typeof snapshots)[number]['docs'][number]>());

  return Array.from(documentsById.values())
    .map((documentSnapshot) =>
      normalizeRendicion(documentSnapshot.id, documentSnapshot.data() as Partial<AdminRendicion>),
    )
    .filter((rendicion) => isAdminEstado(rendicion.estado))
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

  const rendicion = normalizeRendicion(
    rendicionSnapshot.id,
    rendicionSnapshot.data() as Partial<AdminRendicion>,
  );

  if (!isAdminEstado(rendicion.estado)) {
    throw new Error('La rendicion no pertenece al flujo administrativo.');
  }

  const gastosSnapshot = await getDocs(collection(rendicionRef, 'gastos'));

  return {
    rendicion,
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
    sync_status: 'SYNCED',
    fecha_rechazo: nowIso(),
    usuario_rechazo: getActorLabel(actor),
    observacion_rechazo: trimmedObservacion,
    updated_at_remote: serverTimestamp(),
  });
}
