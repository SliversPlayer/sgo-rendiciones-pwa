import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminRendiciones } from '../hooks/useAdminRendiciones';
import type { AdminEstadoFilter } from '../types/admin';
import { formatDisplayDate } from '../utils/date';
import { formatCurrency } from '../utils/format';
import { getRendicionOwnerLabel } from '../utils/rendicionOwner';
import { getEstadoLabel } from '../utils/rendicionStatus';

const estadosAdmin: AdminEstadoFilter[] = ['ENVIADA', 'APROBADA', 'RECHAZADA', 'TODAS'];
const adminViewModeKey = 'admin-rendiciones-view-mode';

type AdminViewMode = 'cards' | 'list';

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

export function AdminPage() {
  const navigate = useNavigate();
  const { estado, setEstado, rendiciones, isLoading, error, reload } = useAdminRendiciones();
  const [viewMode, setViewMode] = useState<AdminViewMode>(getInitialAdminViewMode);

  const changeViewMode = (nextViewMode: AdminViewMode) => {
    setViewMode(nextViewMode);
    saveAdminViewMode(nextViewMode);
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
              onChange={(event) => setEstado(event.target.value as AdminEstadoFilter)}
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

        {!isLoading && rendiciones.length > 0 && viewMode === 'cards' ? (
          <div className="rendiciones-grid">
            {rendiciones.map((rendicion) => (
              <article className="rendicion-card" key={rendicion.id}>
                <div className="card-header">
                  <div>
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
                    <dd>{rendicion.tipo_rendicion_nombre || 'Sin tipo'}</dd>
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
                  <p className="notice notice-warning">{rendicion.observacion_rechazo}</p>
                ) : null}

                <div className="card-actions">
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => openDetalle(rendicion.id)}
                  >
                    Abrir detalle
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!isLoading && rendiciones.length > 0 && viewMode === 'list' ? (
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
                {rendiciones.map((rendicion) => (
                  <tr key={rendicion.id}>
                    <td data-label="Dueno">{getRendicionOwnerLabel(rendicion)}</td>
                    <td data-label="Titulo">{rendicion.titulo}</td>
                    <td data-label="Tipo de rendicion">
                      {rendicion.tipo_rendicion_nombre || 'Sin tipo'}
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
                          Abrir detalle
                        </button>
                        {rendicion.estado === 'ENVIADA' ? (
                          <button
                            type="button"
                            className="button button-secondary button-small"
                            onClick={() => openDetalle(rendicion.id)}
                          >
                            Aprobar/Rechazar
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  );
}
