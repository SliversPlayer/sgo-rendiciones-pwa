import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { GastoList } from '../components/GastoList';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useRendicionDetalle } from '../hooks/useRendicionDetalle';
import { useRendicionSync } from '../hooks/useRendicionSync';
import type { Gasto } from '../types/gasto';
import { formatDisplayDate } from '../utils/date';
import { getEstadoLabel, getSyncStatusLabel } from '../utils/rendicionStatus';

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

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Detalle de rendicion</p>
          <h1>{rendicion?.titulo ?? 'Rendicion'}</h1>
          <p className="header-copy">
            {rendicion?.glosa_grupo ?? 'Sin glosa de grupo registrada.'}
          </p>
        </div>
        <ConnectionStatus isOnline={isOnline} />
      </header>

      <div className="top-actions detail-actions">
        <button type="button" className="button button-secondary" onClick={() => navigate('/')}>
          Volver
        </button>
        {rendicion && rendicion.estado !== 'ENVIADA' ? (
          <button
            type="button"
            className="button button-primary"
            onClick={() => void handleSend()}
            disabled={
              !rendicion ||
              !isOnline ||
              isSending ||
              !isEditable ||
              !isRendicionValida ||
              rendicion.estado === 'ENVIANDO'
            }
          >
            {isSending || rendicion.estado === 'ENVIANDO' ? 'Enviando...' : 'Enviar rendicion'}
          </button>
        ) : null}
        <button
          type="button"
          className="button button-primary"
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
              <h2>{getEstadoLabel(rendicion.estado)}</h2>
              <p className="card-muted">
                {isRendicionValida ? 'Rendicion valida' : 'Rendicion incompleta'} - Sync:{' '}
                {getSyncStatusLabel(rendicion.sync_status ?? 'LOCAL')}
              </p>
              <p className="card-muted">
                Tipo: {rendicion.tipo_rendicion_nombre || 'Sin tipo de rendicion'}
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
