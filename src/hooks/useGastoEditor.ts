import { useCallback, useEffect, useState } from 'react';
import { createGasto, getGastoConAdjuntos, updateGasto } from '../services/gastosService';
import { getRendicionById } from '../services/rendicionesService';
import type { AdjuntoInput, GastoConAdjuntos, GastoFormData } from '../types/gasto';
import type { Rendicion } from '../types/rendicion';
import { isRendicionEditable } from '../utils/rendicionStatus';

export function useGastoEditor(rendicionId: string, gastoId?: string) {
  const [rendicion, setRendicion] = useState<Rendicion | null>(null);
  const [initialGasto, setInitialGasto] = useState<GastoConAdjuntos | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(gastoId);

  const loadEditor = useCallback(async () => {
    try {
      setError(null);
      const storedRendicion = await getRendicionById(rendicionId);
      const storedGasto = gastoId ? await getGastoConAdjuntos(gastoId) : undefined;
      const belongsToRendicion = !storedGasto || storedGasto.gasto.rendicion_id === rendicionId;

      setRendicion(storedRendicion ?? null);
      setInitialGasto(belongsToRendicion ? storedGasto : undefined);

      if (!storedRendicion || (gastoId && (!storedGasto || !belongsToRendicion))) {
        setError('No se encontro la informacion local solicitada.');
      } else if (!isRendicionEditable(storedRendicion)) {
        setError('Esta rendicion ya fue enviada y esta bloqueada para edicion.');
      }
    } catch {
      setError('No se pudo cargar el formulario de gasto.');
    } finally {
      setIsLoading(false);
    }
  }, [gastoId, rendicionId]);

  useEffect(() => {
    setIsLoading(true);
    void loadEditor();
  }, [loadEditor]);

  const saveGasto = async (data: GastoFormData, adjuntos: AdjuntoInput[]) => {
    if (!rendicion || !isRendicionEditable(rendicion)) {
      throw new Error('Esta rendicion ya fue enviada y esta bloqueada para edicion.');
    }

    if (gastoId) {
      await updateGasto(gastoId, data, adjuntos);
      return;
    }

    await createGasto(rendicionId, data, adjuntos);
  };

  return {
    rendicion,
    initialGasto,
    isEditing,
    isLoading,
    error,
    isEditable: isRendicionEditable(rendicion),
    saveGasto,
  };
}
