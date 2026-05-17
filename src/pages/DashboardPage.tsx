import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { RendicionCard } from '../components/RendicionCard';
import { RendicionForm } from '../components/RendicionForm';
import { useAuth } from '../hooks/useAuth';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useRendiciones } from '../hooks/useRendiciones';
import type { Rendicion, RendicionEstado, RendicionFormData } from '../types/rendicion';
import { formatCurrency } from '../utils/format';
import { getEstadoLabel, isRendicionEditable } from '../utils/rendicionStatus';
import { isAdminUser } from '../utils/roles';

type ViewMode = 'list' | 'create' | 'edit';
type EstadoFilter = 'TODAS' | RendicionEstado;

const estadoOptions: EstadoFilter[] = [
  'TODAS',
  'BORRADOR',
  'PENDIENTE_ENVIO',
  'ENVIANDO',
  'ENVIADA',
  'APROBADA',
  'RECHAZADA',
  'ERROR',
];

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function matchesSearch(rendicion: Rendicion, search: string): boolean {
  if (!search) {
    return true;
  }

  return normalizeSearch(
    [
      rendicion.titulo,
      rendicion.glosa_grupo ?? '',
      rendicion.tipo_rendicion_nombre ?? '',
      getEstadoLabel(rendicion.estado),
    ].join(' '),
  ).includes(search);
}

export function DashboardPage() {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const { userProfile, logout } = useAuth();
  const { rendiciones, stats, isLoading, error, addRendicion, saveRendicion, removeRendicion } =
    useRendiciones();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedRendicion, setSelectedRendicion] = useState<Rendicion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('TODAS');

  const visibleRendiciones = useMemo(() => {
    const search = normalizeSearch(searchTerm.trim());

    return rendiciones
      .filter((rendicion) => estadoFilter === 'TODAS' || rendicion.estado === estadoFilter)
      .filter((rendicion) => matchesSearch(rendicion, search))
      .sort(
        (first, second) =>
          new Date(second.fecha_actualizacion).getTime() -
          new Date(first.fecha_actualizacion).getTime(),
      );
  }, [estadoFilter, rendiciones, searchTerm]);

  const showList = () => {
    setViewMode('list');
    setSelectedRendicion(null);
  };

  const handleCreate = async (data: RendicionFormData) => {
    await addRendicion(data);
    showList();
  };

  const handleEdit = async (data: RendicionFormData) => {
    if (!selectedRendicion || !isRendicionEditable(selectedRendicion)) {
      return;
    }

    await saveRendicion(selectedRendicion, data);
    showList();
  };

  const handleDelete = async (rendicion: Rendicion) => {
    if (!isRendicionEditable(rendicion)) {
      return;
    }

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
            Gestiona rendiciones offline con catalogos estructurados y envio individual.
          </p>
          <p className="demo-user">
            {userProfile?.nombre ?? 'Usuario'} - {userProfile?.email}
          </p>
        </div>
        <div className="header-actions">
          <ConnectionStatus isOnline={isOnline} />
          {isAdminUser(userProfile) ? (
            <button
              type="button"
              className="button button-primary"
              onClick={() => navigate('/admin')}
            >
              Panel admin
            </button>
          ) : null}
          <button type="button" className="button button-secondary" onClick={() => void logout()}>
            Cerrar sesion
          </button>
        </div>
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
              <h2 id="rendiciones-title">Mis rendiciones</h2>
            </div>
            <button
              type="button"
              className="button button-primary"
              onClick={() => setViewMode('create')}
            >
              Nueva rendicion
            </button>
          </div>

          <div className="stats-grid" aria-label="Estadisticas de rendiciones">
            <div className="stat-card">
              <span>Total rendiciones</span>
              <strong>{stats.totalRendiciones}</strong>
            </div>
            <div className="stat-card">
              <span>Borradores</span>
              <strong>{stats.totalBorradores}</strong>
            </div>
            <div className="stat-card">
              <span>Enviadas</span>
              <strong>{stats.totalEnviadas}</strong>
            </div>
            <div className="stat-card">
              <span>Monto acumulado</span>
              <strong>{formatCurrency(stats.montoTotalAcumulado)}</strong>
            </div>
          </div>

          <div className="filters-bar" aria-label="Filtros de rendiciones">
            <label>
              <span>Buscar</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Titulo, glosa, tipo o estado"
              />
            </label>
            <label>
              <span>Estado</span>
              <select
                value={estadoFilter}
                onChange={(event) => setEstadoFilter(event.target.value as EstadoFilter)}
              >
                {estadoOptions.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado === 'TODAS' ? 'Todos' : getEstadoLabel(estado)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error ? <p className="notice notice-error">{error}</p> : null}
          {isLoading ? (
            <div className="skeleton-grid" aria-label="Cargando rendiciones">
              <div className="skeleton-card" />
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </div>
          ) : null}

          {!isLoading && rendiciones.length === 0 ? (
            <div className="empty-state">
              <h3>No hay rendiciones todavia</h3>
              <p>Crea tu primera rendicion para dejar la base local funcionando.</p>
            </div>
          ) : null}

          {!isLoading && rendiciones.length > 0 && visibleRendiciones.length === 0 ? (
            <div className="empty-state">
              <h3>Sin resultados</h3>
              <p>Ajusta la busqueda o cambia el filtro de estado.</p>
            </div>
          ) : null}

          <div className="rendiciones-grid">
            {visibleRendiciones.map((rendicion) => (
              <RendicionCard
                key={rendicion.id}
                rendicion={rendicion}
                onOpen={(item) => navigate(`/rendiciones/${item.id}`)}
                onEdit={(item) => {
                  if (!isRendicionEditable(item)) {
                    return;
                  }

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
