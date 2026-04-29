import { useCallback, useEffect, useState } from 'react';
import {
  createRendicion,
  deleteRendicion,
  getRendiciones,
  updateRendicion,
} from '../services/rendicionesService';
import type { Rendicion, RendicionFormData } from '../types/rendicion';

export function useRendiciones() {
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
    const created = await createRendicion(data);
    setRendiciones((current) => [created, ...current]);
  };

  const saveRendicion = async (rendicion: Rendicion, data: RendicionFormData) => {
    const updated = await updateRendicion(rendicion, data);
    setRendiciones((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  };

  const removeRendicion = async (id: string) => {
    await deleteRendicion(id);
    setRendiciones((current) => current.filter((item) => item.id !== id));
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
