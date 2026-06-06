import { useCallback, useEffect, useState } from 'react';
import { createGasto, getGastoConAdjuntos, updateGasto } from '../services/gastosService';
import { getRendicionById } from '../services/rendicionesService';
import { syncGastoDraft } from '../services/syncService';
import type { AdjuntoInput, GastoConAdjuntos, GastoFormData } from '../types/gasto';
import type { Rendicion } from '../types/rendicion';
import { isRendicionEditable } from '../utils/rendicionStatus';
import { useAuth } from './useAuth';

export function useGastoEditor(rendicionId: string, gastoId?: string) {
  const { currentUser, userProfile } = useAuth();
  const [rendicion, setRendicion] = useState<Rendicion | null>(null);
  const [initialGasto, setInitialGasto] = useState<GastoConAdjuntos | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const usuarioId = currentUser?.uid ?? null;

  const isEditing = Boolean(gastoId);

  const loadEditor = useCallback(async () => {
    if (!usuarioId) {
      setRendicion(null);
      setInitialGasto(undefined);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const storedRendicion = await getRendicionById(rendicionId, usuarioId);

      if (!storedRendicion) {
        setRendicion(null);
        setInitialGasto(undefined);
        setError('No se encontro la informacion local solicitada.');
        return;
      }

      const storedGasto = gastoId ? await getGastoConAdjuntos(gastoId, usuarioId) : undefined;
      const belongsToRendicion = !storedGasto || storedGasto.gasto.rendicion_id === rendicionId;

      setRendicion(storedRendicion);
      setInitialGasto(belongsToRendicion ? storedGasto : undefined);

      if (gastoId && (!storedGasto || !belongsToRendicion)) {
        setError('No se encontro la informacion local solicitada.');
      } else if (!isRendicionEditable(storedRendicion)) {
        setError('Esta rendicion ya fue enviada y esta bloqueada para edicion.');
      }
    } catch {
      setError('No se pudo cargar el formulario de gasto.');
    } finally {
      setIsLoading(false);
    }
  }, [gastoId, rendicionId, usuarioId]);

  useEffect(() => {
    setRendicion(null);
    setInitialGasto(undefined);
    setError(null);
    setIsLoading(true);
    void loadEditor();
  }, [loadEditor]);

  const saveGasto = async (data: GastoFormData, adjuntos: AdjuntoInput[], localId?: string) => {
    if (!usuarioId) {
      throw new Error('Debes iniciar sesion para guardar gastos.');
    }

    if (!rendicion || !isRendicionEditable(rendicion)) {
      throw new Error('Esta rendicion ya fue enviada y esta bloqueada para edicion.');
    }

    const usuarioNombre = userProfile?.nombre ?? currentUser?.displayName;

    if (gastoId) {
      const storedGasto = await updateGasto(gastoId, data, adjuntos, usuarioId);

      void syncGastoDraft(
        rendicionId,
        storedGasto.gasto.id,
        currentUser,
        usuarioNombre,
      );
      return;
    }

    const storedGasto = await createGasto(rendicionId, data, adjuntos, usuarioId, localId);

    void syncGastoDraft(
      rendicionId,
      storedGasto.gasto.id,
      currentUser,
      usuarioNombre,
    );
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
