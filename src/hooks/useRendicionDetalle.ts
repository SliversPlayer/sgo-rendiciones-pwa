import { useCallback, useEffect, useState } from 'react';
import { deleteGasto, getGastosConAdjuntosByRendicion } from '../services/gastosService';
import { getRendicionById } from '../services/rendicionesService';
import { syncGastoDraft, syncRendicionDraft } from '../services/syncService';
import type { Gasto, GastoConAdjuntos } from '../types/gasto';
import type { Rendicion } from '../types/rendicion';
import { isPositiveFiniteAmount } from '../utils/amount';
import { isGastoPendingSync } from '../utils/gastoSync';
import { isRendicionEditable } from '../utils/rendicionStatus';
import { useAuth } from './useAuth';

function isGastoValidoParaEnvio({ gasto, adjuntos }: GastoConAdjuntos): boolean {
  const centroNegocioId = gasto.centro_negocio_id ?? gasto.centro_costo_id;
  const centroNegocioNombre = gasto.centro_negocio_nombre ?? gasto.centro_costo_nombre;
  const centroNegocioCodigo = gasto.centro_negocio_codigo ?? gasto.centro_costo_codigo;

  return Boolean(
    gasto.fecha &&
      !Number.isNaN(new Date(gasto.fecha).getTime()) &&
      gasto.glosa.trim() &&
      centroNegocioId &&
      centroNegocioNombre &&
      centroNegocioCodigo &&
      gasto.tipo_documento_id &&
      gasto.tipo_documento_nombre &&
      gasto.tipo_documento_codigo &&
      gasto.tipo_documento_cuenta_contable &&
      gasto.numero_documento.trim() &&
      gasto.tipo_gasto_id &&
      gasto.tipo_gasto_nombre &&
      gasto.tipo_gasto_cuenta_contable &&
      isPositiveFiniteAmount(gasto.monto) &&
      !isGastoPendingSync(gasto) &&
      adjuntos.length >= 1,
  );
}

function isRendicionValidaParaEnvio(
  rendicion: Rendicion | null,
  gastosConAdjuntos: GastoConAdjuntos[],
): boolean {
  return Boolean(
    rendicion?.tipo_rendicion_id &&
      rendicion.tipo_rendicion_nombre &&
      rendicion.tipo_rendicion_cuenta_contable &&
      gastosConAdjuntos.length > 0 &&
      gastosConAdjuntos.every(isGastoValidoParaEnvio),
  );
}

export function useRendicionDetalle(rendicionId: string) {
  const { currentUser, userProfile } = useAuth();
  const [rendicion, setRendicion] = useState<Rendicion | null>(null);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [isRendicionValida, setIsRendicionValida] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const usuarioId = currentUser?.uid ?? null;
  const pendingSyncCount = gastos.filter(isGastoPendingSync).length;

  const loadDetalle = useCallback(async () => {
    if (!usuarioId) {
      setRendicion(null);
      setGastos([]);
      setIsRendicionValida(false);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const storedRendicion = await getRendicionById(rendicionId, usuarioId);

      if (!storedRendicion) {
        setRendicion(null);
        setGastos([]);
        setIsRendicionValida(false);
        return;
      }

      const storedGastosConAdjuntos = await getGastosConAdjuntosByRendicion(
        rendicionId,
        usuarioId,
      );
      const nextRendicion = storedRendicion ?? null;

      setRendicion(nextRendicion);
      setGastos(storedGastosConAdjuntos.map(({ gasto }) => gasto));
      setIsRendicionValida(
        isRendicionValidaParaEnvio(nextRendicion, storedGastosConAdjuntos),
      );
    } catch {
      setError('No se pudo cargar la rendicion local.');
    } finally {
      setIsLoading(false);
    }
  }, [rendicionId, usuarioId]);

  useEffect(() => {
    setRendicion(null);
    setGastos([]);
    setIsRendicionValida(false);
    setError(null);
    setIsLoading(true);
    void loadDetalle();
  }, [loadDetalle]);

  useEffect(() => {
    function handleLocalChange(event: Event) {
      const detail = (event as CustomEvent<{ rendicionId?: string }>).detail;

      if (detail?.rendicionId === rendicionId) {
        void loadDetalle();
      }
    }

    window.addEventListener('sgo:rendicion-local-change', handleLocalChange);

    return () => {
      window.removeEventListener('sgo:rendicion-local-change', handleLocalChange);
    };
  }, [loadDetalle, rendicionId]);

  const removeGasto = async (gasto: Gasto) => {
    if (!usuarioId) {
      setError('Debes iniciar sesion para eliminar gastos.');
      return;
    }

    try {
      setError(null);
      await deleteGasto(gasto, usuarioId);
      await syncRendicionDraft(
        gasto.rendicion_id,
        currentUser,
        userProfile?.nombre ?? currentUser?.displayName,
      );
      setGastos((current) => current.filter((item) => item.id !== gasto.id));
      await loadDetalle();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo eliminar el gasto.');
    }
  };

  const retryGastoSync = async (gasto: Gasto) => {
    if (!usuarioId || !currentUser) {
      setError('Debes iniciar sesion para sincronizar gastos.');
      return;
    }

    if (!navigator.onLine) {
      setError('No hay conexion disponible para sincronizar.');
      return;
    }

    try {
      setError(null);
      setGastos((current) =>
        current.map((item) =>
          item.id === gasto.id ? { ...item, sync_status: 'syncing', sync_error: undefined } : item,
        ),
      );
      await syncGastoDraft(
        gasto.rendicion_id,
        gasto.id,
        currentUser,
        userProfile?.nombre ?? currentUser.displayName,
      );
      await loadDetalle();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo reintentar la sincronizacion.');
    }
  };

  return {
    rendicion,
    gastos,
    isLoading,
    error,
    isRendicionValida,
    hasPendingGastoSync: pendingSyncCount > 0,
    pendingSyncCount,
    isEditable: isRendicionEditable(rendicion),
    removeGasto,
    retryGastoSync,
    reload: loadDetalle,
  };
}
