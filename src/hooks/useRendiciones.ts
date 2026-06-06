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
import { syncPendingUserData, syncRendicionDraft } from '../services/syncService';
import type { Rendicion, RendicionFormData } from '../types/rendicion';
import { useAuth } from './useAuth';

const emptyStats: RendicionesStats = {
  totalRendiciones: 0,
  totalBorradores: 0,
  totalEnviadas: 0,
  totalAprobadas: 0,
  totalRechazadas: 0,
  montoTotalAcumulado: 0,
};

export function useRendiciones() {
  const { currentUser, userProfile } = useAuth();
  const [rendiciones, setRendiciones] = useState<Rendicion[]>([]);
  const [stats, setStats] = useState<RendicionesStats>(emptyStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadRequestId = useRef(0);
  const usuarioId = currentUser?.uid ?? null;
  const usuarioNombre = userProfile?.nombre ?? currentUser?.displayName ?? null;

  const loadRendiciones = useCallback(async () => {
    const requestId = loadRequestId.current + 1;
    loadRequestId.current = requestId;

    if (!usuarioId) {
      setRendiciones([]);
      setStats(emptyStats);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (navigator.onLine && currentUser) {
        await syncPendingUserData(currentUser, usuarioNombre).catch(() => undefined);
        await refreshUserRendicionesFromRemote(usuarioId).catch(() => undefined);
      }

      const storedRendiciones = await getRendiciones(usuarioId);
      const storedStats = await getRendicionesStats(usuarioId, storedRendiciones);

      if (loadRequestId.current !== requestId) {
        return;
      }

      setRendiciones(storedRendiciones);
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
  }, [currentUser, usuarioId, usuarioNombre]);

  useEffect(() => {
    loadRequestId.current += 1;
    setRendiciones([]);
    setStats(emptyStats);
    setError(null);

    if (!usuarioId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void loadRendiciones();
  }, [loadRendiciones, usuarioId]);

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

    await syncRendicionDraft(rendicion.id, currentUser, usuarioNombre);
    await loadRendiciones();
  };

  const saveRendicion = async (rendicion: Rendicion, data: RendicionFormData) => {
    if (!usuarioId) {
      const message = 'Debes iniciar sesion para guardar una rendicion.';
      setError(message);
      throw new Error(message);
    }

    try {
      await updateRendicion(rendicion, data, usuarioId);
      await syncRendicionDraft(rendicion.id, currentUser, usuarioNombre);
      await loadRendiciones();
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
      await syncPendingUserData(currentUser, usuarioNombre).catch(() => undefined);
      await loadRendiciones();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo eliminar la rendicion.');
    }
  };

  return {
    rendiciones,
    stats,
    isLoading,
    error,
    addRendicion,
    saveRendicion,
    removeRendicion,
  };
}
