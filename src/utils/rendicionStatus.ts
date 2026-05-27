import type { Rendicion, RendicionEstado, RendicionSyncStatus } from '../types/rendicion';

const EDITABLE_ESTADOS: RendicionEstado[] = ['BORRADOR', 'ERROR', 'RECHAZADA'];

export function isRendicionEditable(rendicion?: Pick<Rendicion, 'estado'> | null): boolean {
  return Boolean(rendicion && EDITABLE_ESTADOS.includes(rendicion.estado));
}

export function getInitialSyncStatus(status?: RendicionSyncStatus): RendicionSyncStatus {
  return status ?? 'LOCAL';
}

export function getEstadoLabel(estado: RendicionEstado): string {
  const labels: Record<RendicionEstado, string> = {
    BORRADOR: 'Borrador',
    PENDIENTE_ENVIO: 'Pendiente',
    ENVIANDO: 'Enviando',
    ENVIADA: 'Enviada',
    APROBADA: 'Aprobada',
    RECHAZADA: 'Rechazada',
    ERROR: 'Error',
  };

  return labels[estado];
}

export function getSyncStatusLabel(status: RendicionSyncStatus): string {
  const labels: Record<RendicionSyncStatus, string> = {
    LOCAL: 'Local',
    PENDING: 'Pendiente',
    SYNCED: 'Sincronizada',
    ERROR: 'Error',
    PENDING_CREATE: 'Pendiente de crear',
    PENDING_UPDATE: 'Pendiente de actualizar',
    PENDING_DELETE: 'Pendiente de eliminar',
    SYNC_ERROR: 'Error de sync',
  };

  return labels[status];
}
