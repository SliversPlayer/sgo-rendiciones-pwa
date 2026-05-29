import { FormEvent, useMemo, useState } from 'react';
import { useSuperAdminUsers } from '../hooks/useSuperAdminUsers';
import type { CreateManagedUserInput, ManagedUser } from '../types/superadmin';
import type { UserRole } from '../types/user';
import { getSelectableUserRoles, normalizeUserRole } from '../utils/roles';
import { formatRut } from '../utils/rut';

type UserStateFilter = 'TODOS' | 'ACTIVO' | 'INACTIVO';

const roleOptions = getSelectableUserRoles();

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function matchesUserSearch(user: ManagedUser, search: string): boolean {
  if (!search) {
    return true;
  }

  return normalizeSearch(
    `${user.nombre} ${user.email} ${user.rut ?? ''} ${normalizeUserRole(user.rol)}`,
  ).includes(search);
}

export function UserManagementPanel() {
  const {
    users,
    activeSuperAdminCount,
    isLoading,
    isSaving,
    error,
    successMessage,
    reload,
    createUser,
    changeUserRole,
    changeUserActive,
    changeUserRut,
  } = useSuperAdminUsers();
  const [formData, setFormData] = useState<CreateManagedUserInput>({
    nombre: '',
    email: '',
    rut: '',
    temporaryPassword: '',
    rol: 'USER',
    activo: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'TODOS'>('TODOS');
  const [stateFilter, setStateFilter] = useState<UserStateFilter>('TODOS');
  const [formError, setFormError] = useState<string | null>(null);
  const [editingRutUserId, setEditingRutUserId] = useState<string | null>(null);
  const [rutDraft, setRutDraft] = useState('');
  const [rutEditError, setRutEditError] = useState<string | null>(null);

  const visibleUsers = useMemo(() => {
    const search = normalizeSearch(searchTerm.trim());

    return users
      .filter((user) => roleFilter === 'TODOS' || normalizeUserRole(user.rol) === roleFilter)
      .filter((user) => {
        if (stateFilter === 'ACTIVO') {
          return user.activo;
        }

        if (stateFilter === 'INACTIVO') {
          return !user.activo;
        }

        return true;
      })
      .filter((user) => matchesUserSearch(user, search));
  }, [roleFilter, searchTerm, stateFilter, users]);

  function updateFormField<K extends keyof CreateManagedUserInput>(
    field: K,
    value: CreateManagedUserInput[K],
  ) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setFormError(null);
      await createUser(formData);
      setFormData({
        nombre: '',
        email: '',
        rut: '',
        temporaryPassword: '',
        rol: 'USER',
        activo: true,
      });
    } catch (createError) {
      setFormError(
        createError instanceof Error ? createError.message : 'No se pudo crear el usuario.',
      );
    }
  }

  async function handleRoleChange(user: ManagedUser, nextRole: UserRole) {
    const normalizedNextRole = normalizeUserRole(nextRole);

    if (normalizeUserRole(user.rol) === normalizedNextRole) {
      return;
    }

    const shouldChange = window.confirm(
      `Cambiar rol de ${user.nombre} a ${normalizedNextRole}?`,
    );

    if (!shouldChange) {
      return;
    }

    await changeUserRole(user.uid, normalizedNextRole).catch(() => undefined);
  }

  async function handleActiveChange(user: ManagedUser) {
    const nextActive = !user.activo;

    if (!nextActive) {
      const shouldDeactivate = window.confirm(`Desactivar usuario ${user.nombre}?`);

      if (!shouldDeactivate) {
        return;
      }
    }

    await changeUserActive(user.uid, nextActive).catch(() => undefined);
  }

  function startRutEdit(user: ManagedUser) {
    setEditingRutUserId(user.uid);
    setRutDraft(user.rut ?? '');
    setRutEditError(null);
  }

  function cancelRutEdit() {
    setEditingRutUserId(null);
    setRutDraft('');
    setRutEditError(null);
  }

  async function handleRutSubmit(event: FormEvent<HTMLFormElement>, user: ManagedUser) {
    event.preventDefault();

    try {
      setRutEditError(null);
      await changeUserRut(user.uid, rutDraft);
      cancelRutEdit();
    } catch (saveError) {
      setRutEditError(
        saveError instanceof Error ? saveError.message : 'No se pudo actualizar el RUT.',
      );
    }
  }

  return (
    <section className="dashboard-section" aria-labelledby="superadmin-users-title">
      <div className="section-heading with-action">
        <div>
          <p className="eyebrow">Usuarios</p>
          <h2 id="superadmin-users-title">Gestion de usuarios</h2>
        </div>
        <button type="button" className="button button-secondary" onClick={() => void reload()}>
          Refrescar
        </button>
      </div>

      <div className="stats-grid superadmin-stats" aria-label="Resumen de usuarios">
        <div className="stat-card">
          <span>Usuarios</span>
          <strong>{users.length}</strong>
        </div>
        <div className="stat-card">
          <span>Activos</span>
          <strong>{users.filter((user) => user.activo).length}</strong>
        </div>
        <div className="stat-card">
          <span>SUPERADMIN activos</span>
          <strong>{activeSuperAdminCount}</strong>
        </div>
      </div>

      <section className="form-panel wide-panel superadmin-form-panel" aria-labelledby="create-user-title">
        <div className="section-heading">
          <p className="eyebrow">Nuevo usuario</p>
          <h2 id="create-user-title">Crear cuenta</h2>
        </div>

        <form className="rendicion-form" onSubmit={handleCreateUser}>
          <div className="form-grid">
            <label>
              <span>Nombre</span>
              <input
                type="text"
                value={formData.nombre}
                onChange={(event) => updateFormField('nombre', event.target.value)}
                maxLength={120}
                placeholder="Nombre completo"
              />
            </label>

            <label>
              <span>Email</span>
              <input
                type="email"
                value={formData.email}
                onChange={(event) => updateFormField('email', event.target.value)}
                placeholder="usuario@empresa.cl"
              />
            </label>

            <label>
              <span>RUT</span>
              <input
                type="text"
                value={formData.rut}
                onChange={(event) => updateFormField('rut', event.target.value)}
                placeholder="12.345.678-5"
                maxLength={12}
                required
              />
            </label>

            <label>
              <span>Contrasena temporal</span>
              <input
                type="password"
                value={formData.temporaryPassword}
                onChange={(event) => updateFormField('temporaryPassword', event.target.value)}
                minLength={8}
                autoComplete="new-password"
                placeholder="Minimo 8 caracteres"
              />
            </label>

            <label>
              <span>Rol</span>
              <select
                value={formData.rol}
                onChange={(event) => updateFormField('rol', event.target.value as UserRole)}
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={formData.activo}
              onChange={(event) => updateFormField('activo', event.target.checked)}
            />
            <span>Usuario activo</span>
          </label>

          {formError ? <p className="form-error">{formError}</p> : null}

          <div className="form-actions">
            <button type="submit" className="button button-primary" disabled={isSaving}>
              {isSaving ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </section>

      <div className="filters-bar superadmin-filters" aria-label="Filtros de usuarios">
        <label>
          <span>Buscar</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Nombre, email o RUT"
          />
        </label>
        <label>
          <span>Rol</span>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as UserRole | 'TODOS')}
          >
            <option value="TODOS">Todos</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Estado</span>
          <select
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value as UserStateFilter)}
          >
            <option value="TODOS">Todos</option>
            <option value="ACTIVO">Activos</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
        </label>
      </div>

      {error ? <p className="notice notice-error">{error}</p> : null}
      {successMessage ? <p className="notice notice-success">{successMessage}</p> : null}
      {isLoading ? <p className="notice">Cargando usuarios desde Firestore...</p> : null}

      {!isLoading && visibleUsers.length === 0 ? (
        <div className="empty-state">
          <h3>Sin usuarios</h3>
          <p>Ajusta la busqueda o crea una nueva cuenta.</p>
        </div>
      ) : null}

      {!isLoading && visibleUsers.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-rendiciones-table superadmin-table">
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Email</th>
                <th scope="col">RUT</th>
                <th scope="col">Rol</th>
                <th scope="col">Estado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((user) => (
                <tr key={user.uid}>
                  <td data-label="Nombre">{user.nombre}</td>
                  <td data-label="Email">{user.email}</td>
                  <td data-label="RUT">
                    {editingRutUserId === user.uid ? (
                      <form className="inline-edit-form" onSubmit={(event) => handleRutSubmit(event, user)}>
                        <input
                          type="text"
                          value={rutDraft}
                          onChange={(event) => setRutDraft(event.target.value)}
                          placeholder="12.345.678-5"
                          maxLength={12}
                          aria-label={`RUT de ${user.nombre}`}
                          autoFocus
                        />
                        <div className="table-actions">
                          <button type="submit" className="button button-primary button-small" disabled={isSaving}>
                            Guardar
                          </button>
                          <button
                            type="button"
                            className="button button-secondary button-small"
                            onClick={cancelRutEdit}
                            disabled={isSaving}
                          >
                            Cancelar
                          </button>
                        </div>
                        {rutEditError ? <p className="form-error">{rutEditError}</p> : null}
                      </form>
                    ) : (
                      <div className="rut-cell">
                        <span>{formatRut(user.rut) || '-'}</span>
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => startRutEdit(user)}
                          disabled={isSaving}
                        >
                          Editar RUT
                        </button>
                      </div>
                    )}
                  </td>
                  <td data-label="Rol">
                    <select
                      className="table-select"
                      value={normalizeUserRole(user.rol)}
                      onChange={(event) => void handleRoleChange(user, event.target.value as UserRole)}
                      disabled={isSaving}
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td data-label="Estado">
                    <span className={`status-pill ${user.activo ? 'status-active' : 'status-inactive'}`}>
                      {user.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td data-label="Acciones">
                    <div className="table-actions">
                      <button
                        type="button"
                        className={user.activo ? 'button button-danger button-small' : 'button button-secondary button-small'}
                        onClick={() => void handleActiveChange(user)}
                        disabled={isSaving}
                      >
                        {user.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
