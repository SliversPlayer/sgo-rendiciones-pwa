import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createManagedUser,
  getManagedUsers,
  updateManagedUser,
  updateManagedUserActive,
  updateManagedUserRole,
} from '../services/superAdminService';
import type {
  CreateManagedUserInput,
  ManagedUser,
  UpdateManagedUserInput,
} from '../types/superadmin';
import type { UserRole } from '../types/user';
import { isSuperAdminRole } from '../utils/roles';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la operacion.';
}

export function useSuperAdminUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activeSuperAdminCount = useMemo(
    () => users.filter((user) => user.activo && isSuperAdminRole(user.rol)).length,
    [users],
  );

  const reload = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setUsers(await getManagedUsers());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createUser = async (input: CreateManagedUserInput) => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);
      await createManagedUser(input);
      setSuccessMessage('Usuario creado correctamente.');
      await reload();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  };

  const changeUserRole = async (uid: string, nextRole: UserRole) => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);
      await updateManagedUserRole(uid, nextRole);
      setSuccessMessage('Rol actualizado correctamente.');
      await reload();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  };

  const changeUserActive = async (uid: string, activo: boolean) => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);
      await updateManagedUserActive(uid, activo);
      setSuccessMessage(activo ? 'Usuario activado correctamente.' : 'Usuario desactivado correctamente.');
      await reload();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  };

  const saveUser = async (uid: string, input: UpdateManagedUserInput) => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);
      await updateManagedUser(uid, input);
      setSuccessMessage('Usuario actualizado correctamente.');
      await reload();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    users,
    activeSuperAdminCount,
    isLoading,
    isSaving,
    error,
    successMessage,
    reload,
    createUser,
    saveUser,
    changeUserRole,
    changeUserActive,
  };
}
