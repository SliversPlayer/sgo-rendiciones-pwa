import { FormEvent, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAdminRendicionDetalle } from '../hooks/useAdminRendiciones';
import { formatDisplayDate } from '../utils/date';
import { formatCurrency, formatTipoRendicionNombre } from '../utils/format';
import { getRendicionOwnerLabel } from '../utils/rendicionOwner';
import { getEstadoLabel } from '../utils/rendicionStatus';

export function AdminRendicionDetallePage() {
  const { id: rendicionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [observacion, setObservacion] = useState('');
  const {
    detalle,
    isLoading,
    isSubmitting,
    error,
    successMessage,
    reload,
    aprobar,
    rechazar,
  } = useAdminRendicionDetalle(rendicionId ?? '');

  if (!rendicionId) {
    return <Navigate to="/admin" replace />;
  }

  const rendicion = detalle?.rendicion;
  const canReview = rendicion?.estado === 'ENVIADA';

  const handleReject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await rechazar(observacion);
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Detalle admin</p>
          <h1>{rendicion?.titulo ?? 'Rendicion'}</h1>
          <p className="header-copy">
            Revision administrativa sin edicion de gastos ni datos contables.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="button button-secondary" onClick={() => navigate('/admin')}>
            Volver
          </button>
          <button type="button" className="button button-secondary" onClick={() => void reload()}>
            Refrescar
          </button>
        </div>
      </header>

      {error ? <p className="notice notice-error">{error}</p> : null}
      {successMessage ? <p className="notice notice-success">{successMessage}</p> : null}
      {isLoading ? <p className="notice">Cargando detalle desde Firestore...</p> : null}

      {!isLoading && !detalle ? (
        <div className="empty-state">
          <h3>Rendicion no encontrada</h3>
          <p>Vuelve al panel admin y refresca el listado.</p>
        </div>
      ) : null}

      {detalle && rendicion ? (
        <>
          <section className="detail-summary admin-summary" aria-labelledby="admin-summary-title">
            <div>
              <p className="eyebrow">Estado</p>
              <h2 id="admin-summary-title">{getEstadoLabel(rendicion.estado)}</h2>
              <div className="owner-summary">
                <p className="eyebrow">Dueno</p>
                <strong>{getRendicionOwnerLabel(rendicion)}</strong>
              </div>
              <p className="card-muted">
                Tipo:{' '}
                {formatTipoRendicionNombre(
                  rendicion.tipo_rendicion_id,
                  rendicion.tipo_rendicion_nombre,
                )}
              </p>
            </div>

            <dl className="card-meta">
              <div>
                <dt>Enviada</dt>
                <dd>{rendicion.fecha_envio ? formatDisplayDate(rendicion.fecha_envio) : 'Sin fecha'}</dd>
              </div>
              <div>
                <dt>Gastos</dt>
                <dd>{rendicion.total_gastos ?? detalle.gastos.length}</dd>
              </div>
              <div>
                <dt>Monto total</dt>
                <dd>{formatCurrency(rendicion.monto_total ?? 0)}</dd>
              </div>
            </dl>
          </section>

          <section className="dashboard-section" aria-labelledby="admin-history-title">
            <div className="section-heading">
              <p className="eyebrow">Historial</p>
              <h2 id="admin-history-title">Revision administrativa</h2>
            </div>

            <dl className="admin-history">
              {rendicion.fecha_aprobacion ? (
                <div>
                  <dt>Aprobacion</dt>
                  <dd>
                    {formatDisplayDate(rendicion.fecha_aprobacion)} por{' '}
                    {rendicion.usuario_aprobacion ?? 'admin'}
                  </dd>
                </div>
              ) : null}
              {rendicion.fecha_rechazo ? (
                <div>
                  <dt>Rechazo</dt>
                  <dd>
                    {formatDisplayDate(rendicion.fecha_rechazo)} por{' '}
                    {rendicion.usuario_rechazo ?? 'admin'}
                  </dd>
                </div>
              ) : null}
              {rendicion.observacion_rechazo ? (
                <div>
                  <dt>Observacion</dt>
                  <dd>{rendicion.observacion_rechazo}</dd>
                </div>
              ) : null}
              {!rendicion.fecha_aprobacion && !rendicion.fecha_rechazo ? (
                <div>
                  <dt>Revision</dt>
                  <dd>Sin acciones administrativas registradas.</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="form-panel wide-panel admin-actions-panel" aria-labelledby="admin-actions-title">
            <div className="section-heading">
              <p className="eyebrow">Acciones</p>
              <h2 id="admin-actions-title">Aprobar o rechazar</h2>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={() => void aprobar()}
                disabled={!canReview || isSubmitting}
              >
                Aprobar
              </button>
            </div>

            <form className="rendicion-form" onSubmit={handleReject}>
              <label>
                <span>Observacion de rechazo</span>
                <textarea
                  value={observacion}
                  onChange={(event) => setObservacion(event.target.value)}
                  placeholder="Indica que debe corregir el usuario"
                  rows={4}
                  maxLength={500}
                />
              </label>
              <button
                type="submit"
                className="button button-danger"
                disabled={!canReview || isSubmitting || !observacion.trim()}
              >
                Rechazar
              </button>
            </form>

            {!canReview ? (
              <p className="notice">
                Solo las rendiciones enviadas pueden aprobarse o rechazarse.
              </p>
            ) : null}
          </section>

          <section className="dashboard-section" aria-labelledby="admin-gastos-title">
            <div className="section-heading">
              <p className="eyebrow">Gastos</p>
              <h2 id="admin-gastos-title">Detalle contable y comprobantes</h2>
            </div>

            <div className="gastos-list">
              {detalle.gastos.map((gasto) => (
                <article className="gasto-item" key={gasto.id}>
                  <div className="gasto-main">
                    <div>
                      <p className="card-kicker">{gasto.tipo_documento_nombre}</p>
                      <h3>{gasto.glosa}</h3>
                      <p className="card-muted">
                        {gasto.centro_negocio_nombre} - Documento {gasto.numero_documento}
                      </p>
                    </div>
                    <strong>{formatCurrency(gasto.monto)}</strong>
                  </div>

                  <dl className="card-meta admin-snapshots">
                    <div>
                      <dt>Centro codigo</dt>
                      <dd>{gasto.centro_negocio_codigo}</dd>
                    </div>
                    <div>
                      <dt>Documento codigo</dt>
                      <dd>{gasto.tipo_documento_codigo}</dd>
                    </div>
                    <div>
                      <dt>Cuenta documento</dt>
                      <dd>{gasto.tipo_documento_cuenta_contable}</dd>
                    </div>
                    <div>
                      <dt>Cuenta gasto</dt>
                      <dd>{gasto.tipo_gasto_cuenta_contable}</dd>
                    </div>
                  </dl>

                  {gasto.adjuntos.length > 0 ? (
                    <div className="attachment-links">
                      {gasto.adjuntos.map((adjunto) => (
                        <a
                          key={adjunto.id}
                          className="button button-secondary"
                          href={adjunto.downloadURL}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {adjunto.nombre}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="notice notice-error">Sin comprobantes remotos.</p>
                  )}
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
