import { liveQuery } from 'dexie';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { gastosTable, rendicionesTable } from '../services/db';
import { refreshUserRendicionesFromRemote } from '../services/rendicionesService';
import { syncPendingUserData } from '../services/syncService';
import type { Gasto } from '../types/gasto';
import type { Rendicion } from '../types/rendicion';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';

export type SyncStatusMode = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

interface LocalSyncSnapshot {
  pendingCount: number;
  syncingCount: number;
  errorCount: number;
}

interface SyncStatusContextValue {
  status: SyncStatusMode;
  pendingCount: number;
  errorCount: number;
  syncNow: () => Promise<void>;
  trackSyncOperation: (operation: () => Promise<void>) => Promise<void>;
}

const emptySnapshot: LocalSyncSnapshot = {
  pendingCount: 0,
  syncingCount: 0,
  errorCount: 0,
};

const SYNC_SUCCESS_VISIBLE_MS = 2500;
const SYNC_REFRESH_EVENT = 'sgo:sync-refresh-complete';
const SyncStatusContext = createContext<SyncStatusContextValue | undefined>(undefined);

function isRendicionOwnedByUser(rendicion: Rendicion, usuarioId: string): boolean {
  return rendicion.usuario_id === usuarioId || rendicion.uid === usuarioId;
}

function isGastoOwnedByUser(
  gasto: Gasto,
  usuarioId: string,
  rendicionIds: Set<string>,
): boolean {
  return (
    gasto.usuario_id === usuarioId ||
    gasto.uid === usuarioId ||
    rendicionIds.has(gasto.rendicion_id)
  );
}

async function getLocalSyncSnapshot(usuarioId: string): Promise<LocalSyncSnapshot> {
  const [rendiciones, gastos] = await Promise.all([
    rendicionesTable.toArray(),
    gastosTable.toArray(),
  ]);

  const userRendiciones = rendiciones.filter((rendicion) =>
    isRendicionOwnedByUser(rendicion, usuarioId),
  );
  const userRendicionIds = new Set(userRendiciones.map((rendicion) => rendicion.id));
  const userGastos = gastos.filter((gasto) =>
    isGastoOwnedByUser(gasto, usuarioId, userRendicionIds),
  );

  const rendicionErrors = userRendiciones.filter(
    (rendicion) => rendicion.sync_status === 'SYNC_ERROR' || Boolean(rendicion.sync_error),
  ).length;
  const gastoErrors = userGastos.filter(
    (gasto) => gasto.sync_status === 'error' || Boolean(gasto.sync_error),
  ).length;
  const pendingRendiciones = userRendiciones.filter(
    (rendicion) =>
      rendicion.sync_status !== 'SYNCED' && rendicion.sync_status !== 'SYNC_ERROR',
  ).length;
  const pendingGastos = userGastos.filter((gasto) => {
    const status = gasto.sync_status ?? 'synced';

    return status !== 'synced' && status !== 'error' && status !== 'syncing';
  }).length;
  const syncingGastos = userGastos.filter((gasto) => gasto.sync_status === 'syncing').length;

  return {
    pendingCount: pendingRendiciones + pendingGastos,
    syncingCount: syncingGastos,
    errorCount: rendicionErrors + gastoErrors,
  };
}

export function SyncStatusProvider({ children }: { children: ReactNode }) {
  const { currentUser, userProfile } = useAuth();
  const isOnline = useOnlineStatus();
  const [localSnapshot, setLocalSnapshot] = useState<LocalSyncSnapshot>(emptySnapshot);
  const [activeSyncCount, setActiveSyncCount] = useState(0);
  const [hasSyncError, setHasSyncError] = useState(false);
  const [showRecentSuccess, setShowRecentSuccess] = useState(false);
  const successTimerRef = useRef<number | null>(null);
  const usuarioNombre = userProfile?.nombre ?? currentUser?.displayName ?? null;

  const clearSuccessTimer = useCallback(() => {
    if (successTimerRef.current !== null) {
      window.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  }, []);

  const markSyncSuccess = useCallback(() => {
    clearSuccessTimer();
    setHasSyncError(false);
    setShowRecentSuccess(true);
    successTimerRef.current = window.setTimeout(() => {
      setShowRecentSuccess(false);
      successTimerRef.current = null;
    }, SYNC_SUCCESS_VISIBLE_MS);
  }, [clearSuccessTimer]);

  useEffect(() => {
    return () => {
      clearSuccessTimer();
    };
  }, [clearSuccessTimer]);

  useEffect(() => {
    if (!currentUser) {
      setLocalSnapshot(emptySnapshot);
      setHasSyncError(false);
      setShowRecentSuccess(false);
      return undefined;
    }

    const subscription = liveQuery(() => getLocalSyncSnapshot(currentUser.uid)).subscribe({
      next: (snapshot) => {
        setLocalSnapshot(snapshot);

        if (snapshot.errorCount > 0) {
          setHasSyncError(true);
        }
      },
      error: () => {
        setHasSyncError(true);
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser]);

  const trackSyncOperation = useCallback(
    async (operation: () => Promise<void>) => {
      if (!currentUser) {
        throw new Error('Debes iniciar sesion para sincronizar.');
      }

      if (!isOnline) {
        throw new Error('No hay conexion disponible para sincronizar.');
      }

      clearSuccessTimer();
      setShowRecentSuccess(false);
      setActiveSyncCount((current) => current + 1);

      try {
        await operation();
        const nextSnapshot = await getLocalSyncSnapshot(currentUser.uid);

        setLocalSnapshot(nextSnapshot);

        if (nextSnapshot.errorCount > 0) {
          setHasSyncError(true);
          return;
        }

        markSyncSuccess();
        window.dispatchEvent(new CustomEvent(SYNC_REFRESH_EVENT));
      } catch (error) {
        setHasSyncError(true);
        throw error;
      } finally {
        setActiveSyncCount((current) => Math.max(0, current - 1));
      }
    },
    [clearSuccessTimer, currentUser, isOnline, markSyncSuccess],
  );

  const syncNow = useCallback(async () => {
    if (!currentUser || !isOnline) {
      return;
    }

    await trackSyncOperation(async () => {
      await syncPendingUserData(currentUser, usuarioNombre);
      await refreshUserRendicionesFromRemote(currentUser.uid);
    });
  }, [currentUser, isOnline, trackSyncOperation, usuarioNombre]);

  const status = useMemo<SyncStatusMode>(() => {
    if (!isOnline) {
      return 'offline';
    }

    if (activeSyncCount > 0 || localSnapshot.syncingCount > 0) {
      return 'syncing';
    }

    if (showRecentSuccess) {
      return 'synced';
    }

    if (hasSyncError || localSnapshot.errorCount > 0) {
      return 'error';
    }

    return 'idle';
  }, [activeSyncCount, hasSyncError, isOnline, localSnapshot, showRecentSuccess]);

  const value = useMemo(
    () => ({
      status,
      pendingCount: localSnapshot.pendingCount,
      errorCount: localSnapshot.errorCount,
      syncNow,
      trackSyncOperation,
    }),
    [localSnapshot.errorCount, localSnapshot.pendingCount, status, syncNow, trackSyncOperation],
  );

  return <SyncStatusContext.Provider value={value}>{children}</SyncStatusContext.Provider>;
}

export function useSyncStatus() {
  const context = useContext(SyncStatusContext);

  if (!context) {
    throw new Error('useSyncStatus debe usarse dentro de SyncStatusProvider.');
  }

  return context;
}

export { SYNC_REFRESH_EVENT };
