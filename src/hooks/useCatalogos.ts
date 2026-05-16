import { useCallback, useEffect, useState } from 'react';
import {
  getGastoCatalogos,
  getTiposRendicion,
  seedCatalogosIfNeeded,
} from '../services/catalogos';
import type { GastoCatalogos, TipoRendicion } from '../types/catalogo';

const emptyGastoCatalogos: GastoCatalogos = {
  centrosNegocio: [],
  tiposDocumento: [],
  tiposGasto: [],
};

function getCatalogosErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'No se pudieron cargar los catalogos locales.';
}

export function useCatalogosBootstrap() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await seedCatalogosIfNeeded();
    } catch (loadError) {
      setError(getCatalogosErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    isLoading,
    error,
    reload: load,
  };
}

export function useTiposRendicion() {
  const [tiposRendicion, setTiposRendicion] = useState<TipoRendicion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        const items = await getTiposRendicion();

        if (isActive) {
          setTiposRendicion(items);
        }
      } catch (loadError) {
        if (isActive) {
          setError(getCatalogosErrorMessage(loadError));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isActive = false;
    };
  }, []);

  return {
    tiposRendicion,
    isLoading,
    error,
  };
}

export function useGastoCatalogos() {
  const [catalogos, setCatalogos] = useState<GastoCatalogos>(emptyGastoCatalogos);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        const items = await getGastoCatalogos();

        if (isActive) {
          setCatalogos(items);
        }
      } catch (loadError) {
        if (isActive) {
          setError(getCatalogosErrorMessage(loadError));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isActive = false;
    };
  }, []);

  return {
    catalogos,
    isLoading,
    error,
  };
}
