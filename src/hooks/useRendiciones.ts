import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createRendicion,
  deleteRendicion,
  getRendiciones,
  getRendicionesStats,
  refreshUserRendicionesFromRemote,
  updateRendicion,
  type RendicionesStats,
} from '../services/rendicionesService';
import { gastosTable } from '../services/db';
import { syncPendingUserData, syncRendicionDraft } from '../services/syncService';
import type { Rendicion, RendicionFormData } from '../types/rendicion';
import { isPositiveFiniteAmount } from '../utils/amount';
import { useAuth } from './useAuth';
import { SYNC_REFRESH_EVENT, useSyncStatus } from './useSyncStatus';

const emptyStats: RendicionesStats = {
  totalRendiciones: 0,
  totalBorradores: 0,
  totalEnviadas: 0,
  totalAprobadas: 0,
  totalRechazadas: 0,
  montoTotalAcumulado: 0,
};

export interface RendicionCardSummary {
  gastosCount: number;
  montoTotal: number;
}

type RendicionCardSummaries = Record<string, RendicionCardSummary>;

async function getRendicionCardSummaries(
  rendiciones: Rendicion[],
): Promise<RendicionCardSummaries> {
  const rendicionIds = rendiciones.map((rendicion) => rendicion.id);

  if (rendicionIds.length === 0) {
    return {};
  }

  const gastos = await gastosTable.where('rendicion_id').anyOf(rendicionIds).toArray();

  return gastos.reduce<RendicionCardSummaries>((summaries, gasto) => {
    const current = summaries[gasto.rendicion_id] ?? {
      gastosCount: 0,
      montoTotal: 0,
    };

    summaries[gasto.rendicion_id] = {
      gastosCount: current.gastosCount + 1,
      montoTotal:
        current.montoTotal + (isPositiveFiniteAmount(gasto.monto) ? gasto.monto : 0),
    };

    return summaries;
  }, {});
}

export function useRendiciones() {
  const { currentUser, userProfile } = useAuth();
  const { trackSyncOperation } = useSyncStatus();
  const [rendiciones, setRendiciones] = useState<Rendicion[]>([]);
  const [cardSummaries, setCardSummaries] = useState<RendicionCardSummaries>({});
  const [stats, setStats] = useState<RendicionesStats>(emptyStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadRequestId = useRef(0);
  const usuarioId = currentUser?.uid ?? null;
  const usuarioNombre = userProfile?.nombre ?? currentUser?.displayName ?? null;

  const loadRendiciones = useCallback(async (syncRemote = true) => {
    const requestId = loadRequestId.current + 1;
    loadRequestId.current = requestId;

    if (!usuarioId) {
      setRendiciones([]);
      setCardSummaries({});
      setStats(emptyStats);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (syncRemote && navigator.onLine && currentUser) {
        await trackSyncOperation(async () => {
          await syncPendingUserData(currentUser, usuarioNombre);
          await refreshUserRendicionesFromRemote(usuarioId);
        }).catch(() => undefined);
      }

      const storedRendiciones = await getRendiciones(usuarioId);
      const storedStats = await getRendicionesStats(usuarioId, storedRendiciones);
      const storedCardSummaries = await getRendicionCardSummaries(storedRendiciones);

      if (loadRequestId.current !== requestId) {
        return;
      }

      setRendiciones(storedRendiciones);
      setCardSummaries(storedCardSummaries);
      setStats(storedStats);
    } catch {
      if (loadRequestId.current === requestId) {
        setError('No se pudieron cargar las rendiciones locales.');
      }
    } finally {
      if (loadRequestId.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [currentUser, trackSyncOperation, usuarioId, usuarioNombre]);

  useEffect(() => {
    loadRequestId.current += 1;
    setRendiciones([]);
    setCardSummaries({});
    setStats(emptyStats);
    setError(null);

    if (!usuarioId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void loadRendiciones();
  }, [loadRendiciones, usuarioId]);

  useEffect(() => {
    function handleSyncRefreshComplete() {
      void loadRendiciones(false);
    }

    window.addEventListener(SYNC_REFRESH_EVENT, handleSyncRefreshComplete);

    return () => {
      window.removeEventListener(SYNC_REFRESH_EVENT, handleSyncRefreshComplete);
    };
  }, [loadRendiciones]);

  const addRendicion = async (data: RendicionFormData) => {
    if (!currentUser || !usuarioId) {
      const message = 'Debes iniciar sesion para crear una rendicion.';
      setError(message);
      throw new Error(message);
    }

    const rendicion = await createRendicion(
      data,
      usuarioId,
      currentUser.email,
      usuarioNombre,
    );

    if (navigator.onLine) {
      await trackSyncOperation(() =>
        syncRendicionDraft(rendicion.id, currentUser, usuarioNombre),
      ).catch(() => undefined);
    }

    await loadRendiciones(false);
    return rendicion;
  };

  const saveRendicion = async (rendicion: Rendicion, data: RendicionFormData) => {
    if (!usuarioId) {
      const message = 'Debes iniciar sesion para guardar una rendicion.';
      setError(message);
      throw new Error(message);
    }

    try {
      await updateRendicion(rendicion, data, usuarioId);
      if (navigator.onLine) {
        await trackSyncOperation(() =>
          syncRendicionDraft(rendicion.id, currentUser, usuarioNombre),
        ).catch(() => undefined);
      }

      await loadRendiciones(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo guardar la rendicion.');
      throw error;
    }
  };

  const removeRendicion = async (id: string) => {
    if (!usuarioId) {
      setError('Debes iniciar sesion para eliminar una rendicion.');
      return;
    }

    try {
      await deleteRendicion(id, usuarioId);
      if (navigator.onLine) {
        await trackSyncOperation(() => syncPendingUserData(currentUser, usuarioNombre)).catch(
          () => undefined,
        );
      }

      await loadRendiciones(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo eliminar la rendicion.');
    }
  };

  return {
    rendiciones,
    cardSummaries,
    stats,
    isLoading,
    error,
    addRendicion,
    saveRendicion,
    removeRendicion,
  };
}
