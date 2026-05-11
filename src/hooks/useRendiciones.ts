import { useCallback, useEffect, useState } from 'react';
import {
  createRendicion,
  deleteRendicion,
  getRendiciones,
  updateRendicion,
} from '../services/rendicionesService';
import type { Rendicion, RendicionFormData } from '../types/rendicion';
import { useAuth } from './useAuth';

export function useRendiciones() {
  const { currentUser } = useAuth();
  const [rendiciones, setRendiciones] = useState<Rendicion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRendiciones = useCallback(async () => {
    try {
      setError(null);
      const storedRendiciones = await getRendiciones();
      setRendiciones(storedRendiciones);
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

    const created = await createRendicion(data, currentUser.uid, currentUser.email);
    setRendiciones((current) => [created, ...current]);
  };

  const saveRendicion = async (rendicion: Rendicion, data: RendicionFormData) => {
    try {
      const updated = await updateRendicion(rendicion, data);
      setRendiciones((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo guardar la rendicion.');
      throw error;
    }
  };

  const removeRendicion = async (id: string) => {
    try {
      await deleteRendicion(id);
      setRendiciones((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo eliminar la rendicion.');
    }
  };

  return {
    rendiciones,
    isLoading,
    error,
    addRendicion,
    saveRendicion,
    removeRendicion,
  };
}
