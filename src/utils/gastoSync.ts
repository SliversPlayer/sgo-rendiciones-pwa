import type { Gasto, GastoSyncStatus } from '../types/gasto';

const BLOCKING_SYNC_STATUSES: GastoSyncStatus[] = ['local', 'syncing', 'error'];

export function getGastoSyncStatus(gasto: Pick<Gasto, 'sync_status'>): GastoSyncStatus {
  return gasto.sync_status ?? 'synced';
}

export function isGastoPendingSync(gasto: Pick<Gasto, 'sync_status'>): boolean {
  return BLOCKING_SYNC_STATUSES.includes(getGastoSyncStatus(gasto));
}

export function getGastoSyncLabel(gasto: Pick<Gasto, 'sync_status'>): string {
  const status = getGastoSyncStatus(gasto);

  if (status === 'synced') {
    return 'Sincronizado';
  }

  if (status === 'syncing') {
    return 'Sincronizando';
  }

  if (status === 'error') {
    return 'Error de sincronizacion';
  }

  return 'Pendiente de sincronizar';
}

export function getGastoSyncTone(gasto: Pick<Gasto, 'sync_status'>): 'synced' | 'pending' | 'error' {
  const status = getGastoSyncStatus(gasto);

  if (status === 'synced') {
    return 'synced';
  }

  if (status === 'error') {
    return 'error';
  }

  return 'pending';
}
