import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminRendiciones } from '../hooks/useAdminRendiciones';
import type { AdminEstadoFilter } from '../types/admin';
import { formatDisplayDate } from '../utils/date';
import { formatCurrency, formatTipoRendicionNombre } from '../utils/format';
import { getRendicionOwnerLabel } from '../utils/rendicionOwner';
import { getEstadoLabel } from '../utils/rendicionStatus';

const estadosAdmin: AdminEstadoFilter[] = ['TODAS', 'ENVIADA', 'APROBADA', 'RECHAZADA'];
const adminViewModeKey = 'admin-rendiciones-view-mode';

type AdminViewMode = 'cards' | 'list';
type ListFilters = {
  owner: string;
  title: string;
  type: string;
  status: string;
  sentFrom: string;
  sentTo: string;
  amountMin: string;
  amountMax: string;
};

const emptyListFilters: ListFilters = {
  owner: '',
  title: '',
  type: '',
  status: '',
  sentFrom: '',
  sentTo: '',
  amountMin: '',
  amountMax: '',
};

function getActiveListFilterCount(filters: ListFilters): number {
  return [
    filters.owner.trim(),
    filters.title.trim(),
    filters.type,
    filters.status,
    filters.sentFrom || filters.sentTo,
    filters.amountMin || filters.amountMax,
  ].filter(Boolean).length;
}

function CardsIcon() {
  return (
    <svg className="view-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="view-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="3" rx="1.5" />
      <rect x="4" y="10.5" width="16" height="3" rx="1.5" />
      <rect x="4" y="16" width="16" height="3" rx="1.5" />
    </svg>
  );
}

function isAdminViewMode(value: string | null): value is AdminViewMode {
  return value === 'cards' || value === 'list';
}

function getStoredAdminViewMode(): AdminViewMode | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storedViewMode = window.localStorage.getItem(adminViewModeKey);
    return isAdminViewMode(storedViewMode) ? storedViewMode : null;
  } catch {
    return null;
  }
}

function saveAdminViewMode(viewMode: AdminViewMode): void {
  try {
    window.localStorage.setItem(adminViewModeKey, viewMode);
  } catch {
    // The selected view still works when localStorage is unavailable.
  }
}

function getInitialAdminViewMode(): AdminViewMode {
  if (typeof window === 'undefined') {
    return 'list';
  }

  const storedViewMode = getStoredAdminViewMode();

  if (storedViewMode) {
    return storedViewMode;
  }

  return window.matchMedia('(max-width: 719px)').matches ? 'cards' : 'list';
}

function normalizeFilterText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getDateInputValue(value?: string): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function normalizeAdminEstadoFilter(value: string): AdminEstadoFilter | '' {
  const normalizedValue = value.trim().toUpperCase();

  if (normalizedValue === 'TODAS') {
    return '';
  }

  return estadosAdmin.includes(normalizedValue as AdminEstadoFilter)
    ? (normalizedValue as AdminEstadoFilter)
    : '';
}

export function AdminPage() {
  const navigate = useNavigate();
  const { estado, setEstado, rendiciones, isLoading, error, reload } = useAdminRendiciones();
  const [viewMode, setViewMode] = useState<AdminViewMode>(getInitialAdminViewMode);
  const [listFilters, setListFilters] = useState<ListFilters>(emptyListFilters);
  const [draftListFilters, setDraftListFilters] = useState<ListFilters>(emptyListFilters);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);

  const typeOptions = useMemo(
    () =>
      Array.from(
        new Set(rendiciones.map((rendicion) => rendicion.tipo_rendicion_nombre).filter(Boolean)),
      ).sort((first, second) => first.localeCompare(second, 'es')),
    [rendiciones],
  );

  const visibleRendiciones = useMemo(() => {
    const ownerFilter = normalizeFilterText(listFilters.owner.trim());
    const titleFilter = normalizeFilterText(listFilters.title.trim());
    const statusFilter =
      estado === 'TODAS' ? normalizeAdminEstadoFilter(listFilters.status) : '';
    const minAmount = listFilters.amountMin === '' ? null : Number(listFilters.amountMin);
    const maxAmount = listFilters.amountMax === '' ? null : Number(listFilters.amountMax);

    return rendiciones.filter((rendicion) => {
      const owner = normalizeFilterText(getRendicionOwnerLabel(rendicion));
      const title = normalizeFilterText(rendicion.titulo);
      const sentDate = getDateInputValue(rendicion.fecha_envio);
      const amount = rendicion.monto_total ?? 0;

      if (ownerFilter && !owner.includes(ownerFilter)) {
        return false;
      }

      if (titleFilter && !title.includes(titleFilter)) {
        return false;
      }

      if (listFilters.type && rendicion.tipo_rendicion_nombre !== listFilters.type) {
        return false;
      }

      if (statusFilter && rendicion.estado !== statusFilter) {
        return false;
      }

      if (listFilters.sentFrom && (!sentDate || sentDate < listFilters.sentFrom)) {
        return false;
      }

      if (listFilters.sentTo && (!sentDate || sentDate > listFilters.sentTo)) {
        return false;
      }

      if (minAmount !== null && Number.isFinite(minAmount) && amount < minAmount) {
        return false;
      }

      if (maxAmount !== null && Number.isFinite(maxAmount) && amount > maxAmount) {
        return false;
      }

      return true;
    });
  }, [estado, listFilters, rendiciones]);

  const activeFilterCount = getActiveListFilterCount(listFilters);
  const draftActiveFilterCount = getActiveListFilterCount(draftListFilters);
  const hasListFilters = activeFilterCount > 0;
  const filtersButtonLabel = `Filtros${activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}`;

  const changeViewMode = (nextViewMode: AdminViewMode) => {
    setViewMode(nextViewMode);
    saveAdminViewMode(nextViewMode);
  };

  const openFiltersModal = () => {
    setDraftListFilters(listFilters);
    setIsFiltersModalOpen(true);
  };

  const updateDraftListFilter = (key: keyof ListFilters, value: string) => {
    setDraftListFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  };

  const handleEstadoChange = (nextEstado: AdminEstadoFilter) => {
    setEstado(nextEstado);
    setListFilters((currentFilters) => ({ ...currentFilters, status: '' }));
    setDraftListFilters((currentFilters) => ({ ...currentFilters, status: '' }));
  };

  const applyListFilters = () => {
    setListFilters(draftListFilters);
    setIsFiltersModalOpen(false);
  };

  const clearListFilters = () => {
    setListFilters(emptyListFilters);
    setDraftListFilters(emptyListFilters);
  };

  const openDetalle = (rendicionId: string) => {
    navigate(`/admin/rendiciones/${rendicionId}`);
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Panel admin</p>
          <h1>Revision de rendiciones</h1>
          <p className="header-copy">
            Revisa rendiciones enviadas, aprobadas y rechazadas desde Firestore.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="button button-secondary" onClick={() => navigate('/')}>
            Volver
          </button>
          <button type="button" className="button button-primary" onClick={() => void reload()}>
            Refrescar
          </button>
        </div>
      </header>

      <section className="dashboard-section" aria-labelledby="admin-rendiciones-title">
        <div className="filters-bar">
          <label>
            <span>Estado</span>
            <select
              value={estado}
              onChange={(event) => handleEstadoChange(event.target.value as AdminEstadoFilter)}
            >
              {estadosAdmin.map((item) => (
                <option key={item} value={item}>
                  {item === 'TODAS' ? 'Todas' : getEstadoLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <div className="view-toggle-field">
            <span>Vista</span>
            <div className="segmented-control" role="group" aria-label="Cambiar vista del listado">
              <button
                type="button"
                className={viewMode === 'cards' ? 'is-active' : ''}
                aria-pressed={viewMode === 'cards'}
                aria-label="Vista cards"
                title="Vista cards"
                onClick={() => changeViewMode('cards')}
              >
                <CardsIcon />
                <span className="sr-only">Cards</span>
              </button>
              <button
                type="button"
                className={viewMode === 'list' ? 'is-active' : ''}
                aria-pressed={viewMode === 'list'}
                aria-label="Vista lista"
                title="Vista lista"
                onClick={() => changeViewMode('list')}
              >
                <ListIcon />
                <span className="sr-only">Lista</span>
              </button>
            </div>
          </div>
          <div className="filter-controls-field" aria-label="Filtros del listado">
            <button
              type="button"
              className="button button-secondary"
              onClick={openFiltersModal}
              aria-haspopup="dialog"
              aria-expanded={isFiltersModalOpen}
            >
              {filtersButtonLabel}
            </button>
            {hasListFilters ? (
              <button
                type="button"
                className="button button-subtle button-small"
                onClick={clearListFilters}
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>
        </div>

        <div className="section-heading">
          <p className="eyebrow">Listado</p>
          <h2 id="admin-rendiciones-title">Rendiciones administrativas</h2>
        </div>

        {error ? <p className="notice notice-error">{error}</p> : null}
        {isLoading ? <p className="notice">Cargando rendiciones desde Firestore...</p> : null}

        {!isLoading && rendiciones.length === 0 ? (
          <div className="empty-state">
            <h3>Sin rendiciones</h3>
            <p>No hay rendiciones para el filtro seleccionado.</p>
          </div>
        ) : null}

        {!isLoading && rendiciones.length > 0 && visibleRendiciones.length === 0 ? (
          <div className="empty-state">
            <h3>Sin resultados</h3>
            <p>Ajusta los filtros o limpia los filtros activos.</p>
          </div>
        ) : null}

        {!isLoading && rendiciones.length > 0 && viewMode === 'cards' && visibleRendiciones.length > 0 ? (
          <div className="rendiciones-grid">
            {visibleRendiciones.map((rendicion) => (
              <article className="rendicion-card admin-rendicion-card" key={rendicion.id}>
                <div className="admin-card-content">
                  <div className="card-header admin-card-header">
                    <div className="admin-card-title">
                      <p className="card-kicker">Dueno: {getRendicionOwnerLabel(rendicion)}</p>
                      <h2>{rendicion.titulo}</h2>
                    </div>
                    <span className={`status-pill status-${rendicion.estado.toLowerCase()}`}>
                      {getEstadoLabel(rendicion.estado)}
                    </span>
                  </div>

                  <dl className="card-meta">
                    <div>
                      <dt>Tipo</dt>
                      <dd>
                        {formatTipoRendicionNombre(
                          rendicion.tipo_rendicion_id,
                          rendicion.tipo_rendicion_nombre,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Enviada</dt>
                      <dd>
                        {rendicion.fecha_envio ? formatDisplayDate(rendicion.fecha_envio) : 'Sin fecha'}
                      </dd>
                    </div>
                    <div>
                      <dt>Total</dt>
                      <dd>{formatCurrency(rendicion.monto_total ?? 0)}</dd>
                    </div>
                  </dl>

                  {rendicion.observacion_rechazo ? (
                    <p className="notice notice-warning admin-card-note">
                      {rendicion.observacion_rechazo}
                    </p>
                  ) : null}
                </div>

                <div className="card-actions">
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => openDetalle(rendicion.id)}
                  >
                    Revisar
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!isLoading && rendiciones.length > 0 && viewMode === 'list' && visibleRendiciones.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-rendiciones-table">
              <thead>
                <tr>
                  <th scope="col">Dueno</th>
                  <th scope="col">Titulo</th>
                  <th scope="col">Tipo de rendicion</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Fecha envio</th>
                  <th scope="col">Monto total</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleRendiciones.map((rendicion) => (
                  <tr key={rendicion.id}>
                    <td data-label="Dueno">{getRendicionOwnerLabel(rendicion)}</td>
                    <td data-label="Titulo">{rendicion.titulo}</td>
                    <td data-label="Tipo de rendicion">
                      {formatTipoRendicionNombre(
                        rendicion.tipo_rendicion_id,
                        rendicion.tipo_rendicion_nombre,
                      )}
                    </td>
                    <td data-label="Estado" className="status-cell">
                      <span className={`status-pill status-${rendicion.estado.toLowerCase()}`}>
                        {getEstadoLabel(rendicion.estado)}
                      </span>
                    </td>
                    <td data-label="Fecha envio">
                      {rendicion.fecha_envio ? formatDisplayDate(rendicion.fecha_envio) : 'Sin fecha'}
                    </td>
                    <td data-label="Monto total" className="numeric-cell">
                      {formatCurrency(rendicion.monto_total ?? 0)}
                    </td>
                    <td data-label="Acciones">
                      <div className="table-actions">
                        <button
                          type="button"
                          className="button button-primary button-small"
                          onClick={() => openDetalle(rendicion.id)}
                        >
                          Revisar
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

      {isFiltersModalOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsFiltersModalOpen(false);
            }
          }}
        >
          <section
            className="filter-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-filters-title"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setIsFiltersModalOpen(false);
              }
            }}
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                applyListFilters();
              }}
            >
              <div className="filter-modal-header">
                <div>
                  <p className="eyebrow">Filtros</p>
                  <h2 id="admin-filters-title">Filtrar rendiciones</h2>
                  {draftActiveFilterCount > 0 ? (
                    <p className="active-filter-note">
                      {draftActiveFilterCount} filtros activos
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="modal-close-button"
                  onClick={() => setIsFiltersModalOpen(false)}
                  aria-label="Cerrar filtros"
                >
                  X
                </button>
              </div>

              <div className="filter-modal-body">
                <div className="filter-form-grid">
                  <label>
                    <span>Dueno</span>
                    <input
                      autoFocus
                      type="search"
                      value={draftListFilters.owner}
                      onChange={(event) => updateDraftListFilter('owner', event.target.value)}
                      placeholder="Filtrar dueno"
                    />
                  </label>

                  <label>
                    <span>Titulo</span>
                    <input
                      type="search"
                      value={draftListFilters.title}
                      onChange={(event) => updateDraftListFilter('title', event.target.value)}
                      placeholder="Filtrar titulo"
                    />
                  </label>

                  <label>
                    <span>Tipo de rendicion</span>
                    <select
                      value={draftListFilters.type}
                      onChange={(event) => updateDraftListFilter('type', event.target.value)}
                    >
                      <option value="">Todos</option>
                      {typeOptions.map((type) => (
                        <option key={type} value={type}>
                          {formatTipoRendicionNombre(undefined, type)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Estado</span>
                    <select
                      value={draftListFilters.status}
                      onChange={(event) => updateDraftListFilter('status', event.target.value)}
                    >
                      <option value="">Todos</option>
                      {estadosAdmin
                        .filter((item) => item !== 'TODAS')
                        .map((item) => (
                          <option key={item} value={item}>
                            {getEstadoLabel(item)}
                          </option>
                        ))}
                    </select>
                  </label>

                  <fieldset className="filter-fieldset">
                    <legend>Fecha envio</legend>
                    <div className="range-filter">
                      <input
                        type="date"
                        value={draftListFilters.sentFrom}
                        onChange={(event) => updateDraftListFilter('sentFrom', event.target.value)}
                        aria-label="Fecha envio desde"
                      />
                      <input
                        type="date"
                        value={draftListFilters.sentTo}
                        onChange={(event) => updateDraftListFilter('sentTo', event.target.value)}
                        aria-label="Fecha envio hasta"
                      />
                    </div>
                  </fieldset>

                  <fieldset className="filter-fieldset">
                    <legend>Monto total</legend>
                    <div className="range-filter">
                      <input
                        type="number"
                        min="0"
                        value={draftListFilters.amountMin}
                        onChange={(event) => updateDraftListFilter('amountMin', event.target.value)}
                        placeholder="Min"
                        aria-label="Monto minimo"
                      />
                      <input
                        type="number"
                        min="0"
                        value={draftListFilters.amountMax}
                        onChange={(event) => updateDraftListFilter('amountMax', event.target.value)}
                        placeholder="Max"
                        aria-label="Monto maximo"
                      />
                    </div>
                  </fieldset>
                </div>
              </div>

              <div className="filter-modal-actions">
                <button
                  type="button"
                  className="button button-subtle"
                  onClick={clearListFilters}
                  disabled={!hasListFilters && draftActiveFilterCount === 0}
                >
                  Limpiar filtros
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsFiltersModalOpen(false)}
                >
                  Cerrar
                </button>
                <button type="submit" className="button button-primary">
                  Aplicar
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
