import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AppTopbar } from '../components/AppTopbar';
import { GastoForm } from '../components/GastoForm';
import { useGastoEditor } from '../hooks/useGastoEditor';

export function GastoFormPage() {
  const { id: rendicionId, gastoId } = useParams<{ id: string; gastoId?: string }>();
  const navigate = useNavigate();
  const { rendicion, initialGasto, isEditing, isLoading, error, isEditable, saveGasto } =
    useGastoEditor(rendicionId ?? '', gastoId);

  if (!rendicionId) {
    return <Navigate to="/" replace />;
  }

  const goToDetalle = () => navigate(`/rendiciones/${rendicionId}`);
  const handleSubmit: typeof saveGasto = async (data, adjuntos) => {
    await saveGasto(data, adjuntos);
    goToDetalle();
  };

  return (
    <main className="app-shell">
      <AppTopbar />

      <header className="app-header">
        <div>
          <p className="eyebrow">{isEditing ? 'Editar gasto' : 'Nuevo gasto'}</p>
          <h1>{rendicion?.titulo ?? 'Rendicion'}</h1>
          <p className="header-copy">
            {rendicion?.glosa_grupo ?? 'Los comprobantes quedaran guardados offline.'}
          </p>
        </div>
      </header>

      {error ? <p className="notice notice-error">{error}</p> : null}
      {isLoading ? <p className="notice">Cargando formulario...</p> : null}

      {!isLoading && rendicion && !isEditable ? (
        <div className="empty-state">
          <h3>Rendicion bloqueada</h3>
          <p>Esta rendicion ya fue enviada y esta bloqueada para edicion.</p>
          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={goToDetalle}>
              Volver
            </button>
          </div>
        </div>
      ) : null}

      {!isLoading && rendicion && isEditable && (!isEditing || initialGasto) ? (
        <GastoForm initialGasto={initialGasto} onSubmit={handleSubmit} onCancel={goToDetalle} />
      ) : null}

      {!isLoading && !rendicion ? (
        <div className="empty-state">
          <h3>Rendicion no encontrada</h3>
          <p>Vuelve al dashboard y selecciona una rendicion guardada.</p>
          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={() => navigate('/')}>
              Volver
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
