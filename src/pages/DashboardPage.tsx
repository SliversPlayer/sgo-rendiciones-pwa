import { useState } from 'react';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { RendicionCard } from '../components/RendicionCard';
import { RendicionForm } from '../components/RendicionForm';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useRendiciones } from '../hooks/useRendiciones';
import type { Rendicion, RendicionFormData } from '../types/rendicion';
import { DEMO_USER } from '../utils/demoUser';

type ViewMode = 'list' | 'create' | 'edit';

interface DashboardPageProps {
  navigateTo: (path: string) => void;
}

export function DashboardPage({ navigateTo }: DashboardPageProps) {
  const isOnline = useOnlineStatus();
  const { rendiciones, isLoading, error, addRendicion, saveRendicion, removeRendicion } =
    useRendiciones();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedRendicion, setSelectedRendicion] = useState<Rendicion | null>(null);

  const showList = () => {
    setViewMode('list');
    setSelectedRendicion(null);
  };

  const handleCreate = async (data: RendicionFormData) => {
    await addRendicion(data);
    showList();
  };

  const handleEdit = async (data: RendicionFormData) => {
    if (!selectedRendicion) {
      return;
    }

    await saveRendicion(selectedRendicion, data);
    showList();
  };

  const handleDelete = async (rendicion: Rendicion) => {
    const shouldDelete = window.confirm(`Eliminar la rendicion "${rendicion.titulo}"?`);

    if (shouldDelete) {
      await removeRendicion(rendicion.id);
    }
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">SGO Rendiciones PWA</p>
          <h1>SGO Rendiciones</h1>
          <p className="header-copy">
            Base offline-first para gestionar rendiciones locales en borrador.
          </p>
          <p className="demo-user">
            {DEMO_USER.nombre} · {DEMO_USER.email}
          </p>
        </div>
        <ConnectionStatus isOnline={isOnline} />
      </header>

      {viewMode === 'create' ? (
        <RendicionForm onSubmit={handleCreate} onCancel={showList} />
      ) : null}

      {viewMode === 'edit' && selectedRendicion ? (
        <RendicionForm
          initialRendicion={selectedRendicion}
          onSubmit={handleEdit}
          onCancel={showList}
        />
      ) : null}

      {viewMode === 'list' ? (
        <section className="dashboard-section" aria-labelledby="rendiciones-title">
          <div className="section-heading with-action">
            <div>
              <p className="eyebrow">Dashboard</p>
              <h2 id="rendiciones-title">Rendiciones guardadas</h2>
            </div>
            <button
              type="button"
              className="button button-primary"
              onClick={() => setViewMode('create')}
            >
              Nueva rendicion
            </button>
          </div>

          {error ? <p className="notice notice-error">{error}</p> : null}
          {isLoading ? <p className="notice">Cargando rendiciones locales...</p> : null}

          {!isLoading && rendiciones.length === 0 ? (
            <div className="empty-state">
              <h3>No hay rendiciones todavia</h3>
              <p>Crea tu primera rendicion para dejar la base local funcionando.</p>
            </div>
          ) : null}

          <div className="rendiciones-grid">
            {rendiciones.map((rendicion) => (
              <RendicionCard
                key={rendicion.id}
                rendicion={rendicion}
                onOpen={(item) => navigateTo(`/rendicion/${item.id}`)}
                onEdit={(item) => {
                  setSelectedRendicion(item);
                  setViewMode('edit');
                }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
