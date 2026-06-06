import { useCallback, useEffect, useState } from 'react';
import {
  getManagedCatalogItems,
  saveManagedCatalogItem,
  updateManagedCatalogItemActive,
} from '../services/superAdminService';
import type {
  CatalogoKey,
  ManagedCatalogInput,
  ManagedCatalogItem,
} from '../types/superadmin';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la operacion.';
}

export function useSuperAdminCatalogos(catalogo: CatalogoKey) {
  const [items, setItems] = useState<ManagedCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const reload = useCallback(async (force = false) => {
    try {
      setIsLoading(true);
      setError(null);
      setItems(await getManagedCatalogItems(catalogo, { force }));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [catalogo]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveItem = async (input: ManagedCatalogInput, itemId?: string) => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);
      await saveManagedCatalogItem(catalogo, input, itemId);
      setSuccessMessage(itemId ? 'Catalogo actualizado correctamente.' : 'Catalogo creado correctamente.');
      await reload(false);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  };

  const changeItemActive = async (itemId: string, activo: boolean) => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);
      await updateManagedCatalogItemActive(catalogo, itemId, activo);
      setSuccessMessage(activo ? 'Catalogo activado correctamente.' : 'Catalogo desactivado correctamente.');
      await reload(false);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    items,
    isLoading,
    isSaving,
    error,
    successMessage,
    reload,
    saveItem,
    changeItemActive,
  };
}
