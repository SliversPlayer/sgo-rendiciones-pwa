import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AppTopbar } from '../components/AppTopbar';
import { GastoList } from '../components/GastoList';
import { RendicionStatusBadge, SyncStatusBadge } from '../components/StatusBadges';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useRendicionDetalle } from '../hooks/useRendicionDetalle';
import { useRendicionSync } from '../hooks/useRendicionSync';
import type { Gasto } from '../types/gasto';
import { formatDisplayDate } from '../utils/date';
import { formatTipoRendicionNombre } from '../utils/format';

export function RendicionDetallePage() {
  const { id: rendicionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const { rendicion, gastos, isLoading, error, isRendicionValida, isEditable, removeGasto, reload } =
    useRendicionDetalle(rendicionId ?? '');
  const { isSending, syncError, syncSuccess, send } = useRendicionSync();

  if (!rendicionId) {
    return <Navigate to="/" replace />;
  }

  const handleDelete = async (gasto: Gasto) => {
    if (!isEditable) {
      return;
    }

    const shouldDelete = window.confirm(`Eliminar el gasto "${gasto.glosa}"?`);

    if (shouldDelete) {
      await removeGasto(gasto);
    }
  };

  const handleSend = async () => {
    await send(rendicionId);
    await reload();
  };
  const canShowSendAction = rendicion && rendicion.estado !== 'ENVIADA' && rendicion.estado !== 'APROBADA';
  const canSendRendicion =
    Boolean(rendicion) &&
    isOnline &&
    !isSending &&
    isEditable &&
    isRendicionValida &&
    rendicion?.estado !== 'ENVIANDO';
  const shouldPrioritizeSend = Boolean(canShowSendAction && isEditable && isRendicionValida);

  return (
    <main className="app-shell">
      <AppTopbar />

      <header className="app-header">
        <div>
          <p className="eyebrow">Detalle de rendicion</p>
          <h1>{rendicion?.titulo ?? 'Rendicion'}</h1>
          <p className="header-copy">
            {rendicion?.glosa_grupo ?? 'Sin glosa de grupo registrada.'}
          </p>
        </div>
      </header>

      <div className="top-actions detail-actions">
        <button type="button" className="button button-secondary" onClick={() => navigate('/')}>
          Volver
        </button>
        {canShowSendAction ? (
          <button
            type="button"
            className={`button ${shouldPrioritizeSend ? 'button-primary' : 'button-secondary'}`}
            onClick={() => void handleSend()}
            disabled={!canSendRendicion}
          >
            {isSending || rendicion?.estado === 'ENVIANDO' ? 'Enviando...' : 'Enviar rendicion'}
          </button>
        ) : null}
        <button
          type="button"
          className={`button ${shouldPrioritizeSend ? 'button-secondary' : 'button-primary'}`}
          onClick={() => navigate(`/rendiciones/${rendicionId}/gastos/nuevo`)}
          disabled={!rendicion || !isEditable}
        >
          Agregar gasto
        </button>
      </div>

      {error ? <p className="notice notice-error">{error}</p> : null}
      {syncError ? <p className="notice notice-error">{syncError}</p> : null}
      {syncSuccess ? <p className="notice notice-success">{syncSuccess}</p> : null}
      {isLoading ? <p className="notice">Cargando rendicion local...</p> : null}

      {!isLoading && !rendicion ? (
        <div className="empty-state">
          <h3>Rendicion no encontrada</h3>
          <p>Vuelve al dashboard y selecciona una rendicion guardada.</p>
        </div>
      ) : null}

      {rendicion ? (
        <section className="dashboard-section" aria-labelledby="gastos-title">
          <div className="detail-summary">
            <div>
              <p className="eyebrow">Estado local</p>
              <div className="status-stack">
                <RendicionStatusBadge estado={rendicion.estado} />
                <SyncStatusBadge status={rendicion.sync_status ?? 'LOCAL'} />
              </div>
              <p className={isRendicionValida ? 'notice notice-success compact-notice' : 'notice notice-warning compact-notice'}>
                {isRendicionValida ? 'Lista para enviar' : 'Faltan datos para enviar'}
              </p>
              <p className="card-muted">
                Tipo:{' '}
                {formatTipoRendicionNombre(
                  rendicion.tipo_rendicion_id,
                  rendicion.tipo_rendicion_nombre,
                  'Sin tipo de rendicion',
                )}
              </p>
            </div>
            <dl className="card-meta">
              <div>
                <dt>Actualizada</dt>
                <dd>{formatDisplayDate(rendicion.fecha_actualizacion)}</dd>
              </div>
              {rendicion.fecha_envio ? (
                <div>
                  <dt>Enviada</dt>
                  <dd>{formatDisplayDate(rendicion.fecha_envio)}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          {!isEditable ? (
            <p className="notice">
              Esta rendicion ya fue enviada y esta bloqueada para edicion.
            </p>
          ) : null}

          {rendicion.sync_error ? (
            <p className="notice notice-error">{rendicion.sync_error}</p>
          ) : null}

          {rendicion.observacion_rechazo ? (
            <p className="notice notice-warning">
              Observacion de rechazo: {rendicion.observacion_rechazo}
            </p>
          ) : null}

          {rendicion.fecha_aprobacion ? (
            <p className="notice notice-success">
              Rendicion aprobada por {rendicion.usuario_aprobacion ?? 'administracion'}.
            </p>
          ) : null}

          <div className="section-heading with-action">
            <div>
              <p className="eyebrow">Gastos</p>
              <h2 id="gastos-title">Lista de gastos</h2>
            </div>
          </div>

          <GastoList
            gastos={gastos}
            onEdit={(gasto) => navigate(`/rendiciones/${rendicionId}/gastos/${gasto.id}`)}
            onDelete={handleDelete}
            readOnly={!isEditable}
          />
        </section>
      ) : null}
    </main>
  );
}
