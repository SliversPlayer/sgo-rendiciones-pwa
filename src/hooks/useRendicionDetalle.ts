import { useCallback, useEffect, useState } from 'react';
import { deleteGasto, getGastosByRendicion } from '../services/gastosService';
import { getRendicionById } from '../services/rendicionesService';
import type { Gasto } from '../types/gasto';
import type { Rendicion } from '../types/rendicion';
import { isRendicionEditable } from '../utils/rendicionStatus';

export function useRendicionDetalle(rendicionId: string) {
  const [rendicion, setRendicion] = useState<Rendicion | null>(null);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetalle = useCallback(async () => {
    try {
      setError(null);
      const [storedRendicion, storedGastos] = await Promise.all([
        getRendicionById(rendicionId),
        getGastosByRendicion(rendicionId),
      ]);

      setRendicion(storedRendicion ?? null);
      setGastos(storedGastos);
    } catch {
      setError('No se pudo cargar la rendicion local.');
    } finally {
      setIsLoading(false);
    }
  }, [rendicionId]);

  useEffect(() => {
    setIsLoading(true);
    void loadDetalle();
  }, [loadDetalle]);

  const removeGasto = async (gasto: Gasto) => {
    try {
      setError(null);
      await deleteGasto(gasto);
      setGastos((current) => current.filter((item) => item.id !== gasto.id));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo eliminar el gasto.');
    }
  };

  return {
    rendicion,
    gastos,
    isLoading,
    error,
    isRendicionValida:
      gastos.length > 0 &&
      Boolean(
        rendicion?.tipo_rendicion_id &&
          rendicion.tipo_rendicion_nombre &&
          rendicion.tipo_rendicion_cuenta_contable,
      ),
    isEditable: isRendicionEditable(rendicion),
    removeGasto,
    reload: loadDetalle,
  };
}
