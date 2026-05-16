import { useCallback, useEffect, useState } from 'react';
import { deleteGasto, getGastosConAdjuntosByRendicion } from '../services/gastosService';
import { getRendicionById } from '../services/rendicionesService';
import type { Gasto, GastoConAdjuntos } from '../types/gasto';
import type { Rendicion } from '../types/rendicion';
import { isRendicionEditable } from '../utils/rendicionStatus';

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
  const [rendicion, setRendicion] = useState<Rendicion | null>(null);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [isRendicionValida, setIsRendicionValida] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetalle = useCallback(async () => {
    try {
      setError(null);
      const [storedRendicion, storedGastosConAdjuntos] = await Promise.all([
        getRendicionById(rendicionId),
        getGastosConAdjuntosByRendicion(rendicionId),
      ]);
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
