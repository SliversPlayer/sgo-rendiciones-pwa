import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppTopbar } from '../components/AppTopbar';
import { CatalogManagementPanel } from '../components/CatalogManagementPanel';
import { UserManagementPanel } from '../components/UserManagementPanel';

type SuperAdminTab = 'usuarios' | 'catalogos';

export function SuperAdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SuperAdminTab>('usuarios');

  return (
    <main className="app-shell">
      <AppTopbar currentSection="superadmin" />

      <header className="app-header">
        <div>
          <p className="eyebrow">Panel superadmin</p>
          <h1>Administracion del sistema</h1>
          <p className="header-copy">
            Gestiona usuarios, roles y catalogos editables desde Firestore.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="button button-secondary" onClick={() => navigate('/')}>
            Volver
          </button>
        </div>
      </header>

      <div className="superadmin-tabs" role="tablist" aria-label="Panel superadmin">
        <button
          type="button"
          className={activeTab === 'usuarios' ? 'is-active' : ''}
          onClick={() => setActiveTab('usuarios')}
        >
          Usuarios
        </button>
        <button
          type="button"
          className={activeTab === 'catalogos' ? 'is-active' : ''}
          onClick={() => setActiveTab('catalogos')}
        >
          Catalogos
        </button>
      </div>

      {activeTab === 'usuarios' ? <UserManagementPanel /> : null}
      {activeTab === 'catalogos' ? <CatalogManagementPanel /> : null}
    </main>
  );
}
