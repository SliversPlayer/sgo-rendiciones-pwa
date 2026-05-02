import { ConnectionStatus } from '../components/ConnectionStatus';
import { GastoList } from '../components/GastoList';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useRendicionDetalle } from '../hooks/useRendicionDetalle';
import type { Gasto } from '../types/gasto';
import { formatDisplayDate } from '../utils/date';

interface RendicionDetallePageProps {
  rendicionId: string;
  navigateTo: (path: string) => void;
}

export function RendicionDetallePage({ rendicionId, navigateTo }: RendicionDetallePageProps) {
  const isOnline = useOnlineStatus();
  const { rendicion, gastos, isLoading, error, isRendicionValida, removeGasto } =
    useRendicionDetalle(rendicionId);

  const handleDelete = async (gasto: Gasto) => {
    const shouldDelete = window.confirm(`Eliminar el gasto "${gasto.glosa}"?`);

    if (shouldDelete) {
      await removeGasto(gasto);
    }
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

      <div className="top-actions">
        <button type="button" className="button button-secondary" onClick={() => navigateTo('/')}>
          Volver
        </button>
        <button
          type="button"
          className="button button-primary"
          onClick={() => navigateTo(`/rendicion/${rendicionId}/nuevo`)}
          disabled={!rendicion}
        >
          Agregar gasto
        </button>
      </div>

      {error ? <p className="notice notice-error">{error}</p> : null}
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
              <h2>{isRendicionValida ? 'Rendicion valida' : 'Rendicion incompleta'}</h2>
            </div>
            <dl className="card-meta">
              <div>
                <dt>Actualizada</dt>
                <dd>{formatDisplayDate(rendicion.fecha_actualizacion)}</dd>
              </div>
            </dl>
          </div>

          <div className="section-heading with-action">
            <div>
              <p className="eyebrow">Gastos</p>
              <h2 id="gastos-title">Lista de gastos</h2>
            </div>
          </div>

          <GastoList
            gastos={gastos}
            onEdit={(gasto) => navigateTo(`/rendicion/${rendicionId}/editar/${gasto.id}`)}
            onDelete={handleDelete}
          />
        </section>
      ) : null}
    </main>
  );
}
