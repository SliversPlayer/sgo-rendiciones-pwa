import { useCallback, useEffect, useState } from 'react';
import {
  createRendicion,
  deleteRendicion,
  getRendiciones,
  getRendicionesStats,
  updateRendicion,
  type RendicionesStats,
} from '../services/rendicionesService';
import type { Rendicion, RendicionFormData } from '../types/rendicion';
import { useAuth } from './useAuth';

const emptyStats: RendicionesStats = {
  totalRendiciones: 0,
  totalBorradores: 0,
  totalEnviadas: 0,
  montoTotalAcumulado: 0,
};

export function useRendiciones() {
  const { currentUser } = useAuth();
  const [rendiciones, setRendiciones] = useState<Rendicion[]>([]);
  const [stats, setStats] = useState<RendicionesStats>(emptyStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRendiciones = useCallback(async () => {
    try {
      setError(null);
      const [storedRendiciones, storedStats] = await Promise.all([
        getRendiciones(),
        getRendicionesStats(),
      ]);
      setRendiciones(storedRendiciones);
      setStats(storedStats);
    } catch {
      setError('No se pudieron cargar las rendiciones locales.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRendiciones();
  }, [loadRendiciones]);

  const addRendicion = async (data: RendicionFormData) => {
    if (!currentUser) {
      setError('Debes iniciar sesion para crear una rendicion.');
      return;
    }

    await createRendicion(data, currentUser.uid, currentUser.email);
    await loadRendiciones();
  };

  const saveRendicion = async (rendicion: Rendicion, data: RendicionFormData) => {
    try {
      await updateRendicion(rendicion, data);
      await loadRendiciones();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo guardar la rendicion.');
      throw error;
    }
  };

  const removeRendicion = async (id: string) => {
    try {
      await deleteRendicion(id);
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
