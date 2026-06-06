import type { RendicionEstado, RendicionSyncStatus } from '../types/rendicion';
import { getEstadoLabel } from '../utils/rendicionStatus';

interface RendicionStatusBadgeProps {
  estado: RendicionEstado;
}

interface SyncStatusBadgeProps {
  status?: RendicionSyncStatus;
}

function getSyncLabel(status: RendicionSyncStatus): string {
  if (status === 'SYNCED') {
    return 'Respaldado';
  }

  if (status === 'SYNC_ERROR') {
    return 'Error de sincronizacion';
  }

  if (status === 'PENDING_DELETE') {
    return 'Pendiente de eliminar';
  }

  if (status === 'LOCAL' || status === 'PENDING' || status === 'PENDING_CREATE' || status === 'PENDING_UPDATE') {
    return 'Pendiente de sincronizar';
  }

  return 'Sincronizando';
}

function getSyncTone(status: RendicionSyncStatus): string {
  if (status === 'SYNCED') {
    return 'synced';
  }

  if (status === 'SYNC_ERROR') {
    return 'error';
  }

  return 'pending';
}

export function RendicionStatusBadge({ estado }: RendicionStatusBadgeProps) {
  return (
    <span className={`status-badge status-${estado.toLowerCase()}`}>
      <span className="status-badge-dot" aria-hidden="true" />
      {getEstadoLabel(estado)}
    </span>
  );
}

export function SyncStatusBadge({ status = 'LOCAL' }: SyncStatusBadgeProps) {
  return (
    <span className={`sync-badge sync-${getSyncTone(status)}`}>
      <span className="sync-badge-dot" aria-hidden="true" />
      {getSyncLabel(status)}
    </span>
  );
}
