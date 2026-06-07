import { useEffect } from 'react';
import { refreshUserRendicionesFromRemote } from '../services/rendicionesService';
import { syncPendingUserData } from '../services/syncService';
import { useAuth } from './useAuth';
import { useSyncStatus } from './useSyncStatus';

export function useAutoSync() {
  const { currentUser, userProfile } = useAuth();
  const { trackSyncOperation } = useSyncStatus();
  const usuarioNombre = userProfile?.nombre ?? currentUser?.displayName ?? null;

  useEffect(() => {
    if (!currentUser || userProfile?.mustChangePassword || userProfile?.activo === false) {
      return undefined;
    }

    let isActive = true;

    async function syncNow() {
      if (!navigator.onLine || !currentUser || !isActive) {
        return;
      }

      await trackSyncOperation(async () => {
        await syncPendingUserData(currentUser, usuarioNombre);

        if (isActive) {
          await refreshUserRendicionesFromRemote(currentUser.uid);
        }
      }).catch(() => undefined);
    }

    void syncNow();
    window.addEventListener('online', syncNow);

    return () => {
      isActive = false;
      window.removeEventListener('online', syncNow);
    };
  }, [
    currentUser,
    trackSyncOperation,
    userProfile?.activo,
    userProfile?.mustChangePassword,
    usuarioNombre,
  ]);
}
