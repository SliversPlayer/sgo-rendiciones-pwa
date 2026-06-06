import { useCallback, useEffect, useState } from 'react';
import {
  ensureCatalogosLoaded,
  getCatalogosLoadWarning,
  getGastoCatalogos,
  getTiposRendicion,
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

export function useCatalogosBootstrap(options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    try {
      setIsLoading(true);
      setError(null);
      setWarning(null);
      await ensureCatalogosLoaded({ force });
      setWarning(getCatalogosLoadWarning());
    } catch (loadError) {
      setError(getCatalogosErrorMessage(loadError));
    } finally {
      setHasLoaded(true);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setHasLoaded(false);
      return;
    }

    void load();
  }, [enabled, load]);

  return {
    isLoading: enabled && !hasLoaded ? true : isLoading,
    error,
    warning,
    reload: () => load(true),
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
