import { useCallback, useEffect, useState } from 'react';
import { deleteGasto, getGastosConAdjuntosByRendicion } from '../services/gastosService';
import { getRendicionById } from '../services/rendicionesService';
import { syncRendicionDraft } from '../services/syncService';
import type { Gasto, GastoConAdjuntos } from '../types/gasto';
import type { Rendicion } from '../types/rendicion';
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
      Number.isFinite(gasto.monto) &&
      gasto.monto > 0 &&
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

  return {
    rendicion,
    gastos,
    isLoading,
    error,
    isRendicionValida,
    isEditable: isRendicionEditable(rendicion),
    removeGasto,
    reload: loadDetalle,
  };
}
