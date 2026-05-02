import { ConnectionStatus } from '../components/ConnectionStatus';
import { GastoForm } from '../components/GastoForm';
import { useGastoEditor } from '../hooks/useGastoEditor';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface GastoFormPageProps {
  rendicionId: string;
  gastoId?: string;
  navigateTo: (path: string) => void;
}

export function GastoFormPage({ rendicionId, gastoId, navigateTo }: GastoFormPageProps) {
  const isOnline = useOnlineStatus();
  const { rendicion, initialGasto, isEditing, isLoading, error, saveGasto } =
    useGastoEditor(rendicionId, gastoId);

  const goToDetalle = () => navigateTo(`/rendicion/${rendicionId}`);
  const handleSubmit: typeof saveGasto = async (data, adjuntos) => {
    await saveGasto(data, adjuntos);
    goToDetalle();
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">{isEditing ? 'Editar gasto' : 'Nuevo gasto'}</p>
          <h1>{rendicion?.titulo ?? 'Rendicion'}</h1>
          <p className="header-copy">
            {rendicion?.glosa_grupo ?? 'Los comprobantes quedaran guardados offline.'}
          </p>
        </div>
        <ConnectionStatus isOnline={isOnline} />
      </header>

      {error ? <p className="notice notice-error">{error}</p> : null}
      {isLoading ? <p className="notice">Cargando formulario...</p> : null}

      {!isLoading && rendicion && (!isEditing || initialGasto) ? (
        <GastoForm initialGasto={initialGasto} onSubmit={handleSubmit} onCancel={goToDetalle} />
      ) : null}

      {!isLoading && !rendicion ? (
        <div className="empty-state">
          <h3>Rendicion no encontrada</h3>
          <p>Vuelve al dashboard y selecciona una rendicion guardada.</p>
          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={() => navigateTo('/')}>
              Volver
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
