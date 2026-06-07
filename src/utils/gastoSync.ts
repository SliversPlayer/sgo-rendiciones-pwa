import type { Gasto, GastoSyncStatus } from '../types/gasto';

const BLOCKING_SYNC_STATUSES: GastoSyncStatus[] = ['local', 'syncing', 'error'];

export function getGastoSyncStatus(gasto: Pick<Gasto, 'sync_status'>): GastoSyncStatus {
  return gasto.sync_status ?? 'synced';
}

export function isGastoPendingSync(gasto: Pick<Gasto, 'sync_status'>): boolean {
  return BLOCKING_SYNC_STATUSES.includes(getGastoSyncStatus(gasto));
}
