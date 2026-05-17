import { useNavigate } from 'react-router-dom';
import { useAdminRendiciones } from '../hooks/useAdminRendiciones';
import type { AdminEstadoFilter } from '../types/admin';
import { formatDisplayDate } from '../utils/date';
import { formatCurrency } from '../utils/format';
import { getEstadoLabel } from '../utils/rendicionStatus';

const estadosAdmin: AdminEstadoFilter[] = ['ENVIADA', 'APROBADA', 'RECHAZADA', 'TODAS'];

export function AdminPage() {
  const navigate = useNavigate();
  const { estado, setEstado, rendiciones, isLoading, error, reload } = useAdminRendiciones();

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

        <div className="rendiciones-grid">
          {rendiciones.map((rendicion) => (
            <article className="rendicion-card" key={rendicion.id}>
              <div className="card-header">
                <div>
                  <p className="card-kicker">{rendicion.usuario_email || 'Usuario'}</p>
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
                  <dd>{rendicion.fecha_envio ? formatDisplayDate(rendicion.fecha_envio) : 'Sin fecha'}</dd>
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
                  onClick={() => navigate(`/admin/rendiciones/${rendicion.id}`)}
                >
                  Abrir detalle
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
