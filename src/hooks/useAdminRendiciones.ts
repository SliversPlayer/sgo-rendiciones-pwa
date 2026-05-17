import { useCallback, useEffect, useState } from 'react';
import {
  aprobarRendicionAdmin,
  getAdminRendicionDetalle,
  getAdminRendiciones,
  rechazarRendicionAdmin,
} from '../services/adminService';
import type {
  AdminEstadoFilter,
  AdminRendicion,
  AdminRendicionDetalle,
} from '../types/admin';
import { useAuth } from './useAuth';

function getAdminErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo cargar la informacion administrativa.';
}

export function useAdminRendiciones(initialEstado: AdminEstadoFilter = 'ENVIADA') {
  const [estado, setEstado] = useState<AdminEstadoFilter>(initialEstado);
  const [rendiciones, setRendiciones] = useState<AdminRendicion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRendiciones = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setRendiciones(await getAdminRendiciones(estado));
    } catch (loadError) {
      setError(getAdminErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [estado]);

  useEffect(() => {
    void loadRendiciones();
  }, [loadRendiciones]);

  return {
    estado,
    setEstado,
    rendiciones,
    isLoading,
    error,
    reload: loadRendiciones,
  };
}

export function useAdminRendicionDetalle(rendicionId: string) {
  const { currentUser } = useAuth();
  const [detalle, setDetalle] = useState<AdminRendicionDetalle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadDetalle = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setDetalle(await getAdminRendicionDetalle(rendicionId));
    } catch (loadError) {
      setError(getAdminErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [rendicionId]);

  useEffect(() => {
    void loadDetalle();
  }, [loadDetalle]);

  const aprobar = async () => {
    if (!currentUser) {
      setError('Debes iniciar sesion para aprobar.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);
      await aprobarRendicionAdmin(rendicionId, currentUser);
      setSuccessMessage('Rendicion aprobada correctamente.');
      await loadDetalle();
    } catch (submitError) {
      setError(getAdminErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const rechazar = async (observacion: string) => {
    if (!currentUser) {
      setError('Debes iniciar sesion para rechazar.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);
      await rechazarRendicionAdmin(rendicionId, currentUser, observacion);
      setSuccessMessage('Rendicion rechazada correctamente.');
      await loadDetalle();
    } catch (submitError) {
      setError(getAdminErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    detalle,
    isLoading,
    isSubmitting,
    error,
    successMessage,
    reload: loadDetalle,
    aprobar,
    rechazar,
  };
}
