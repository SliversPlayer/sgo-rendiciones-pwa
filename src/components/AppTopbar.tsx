import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isAdminUser, isSuperAdminUser } from '../utils/roles';
import { SyncStatusPill } from './SyncStatusPill';

interface AppTopbarProps {
  currentSection?: 'dashboard' | 'admin' | 'superadmin';
}

export function AppTopbar({ currentSection = 'dashboard' }: AppTopbarProps) {
  const navigate = useNavigate();
  const { userProfile, logout } = useAuth();

  return (
    <nav className="app-topbar" aria-label="Navegacion principal">
      <button type="button" className="brand-button" onClick={() => navigate('/')}>
        <span className="brand-mark" aria-hidden="true">SGO</span>
        <span>
          <strong>Rendiciones</strong>
          <small>{userProfile?.nombre ?? userProfile?.email ?? 'Usuario'}</small>
        </span>
      </button>

      <div className="topbar-actions">
        <SyncStatusPill />
        {isAdminUser(userProfile) ? (
          <button
            type="button"
            className={`topbar-link ${currentSection === 'admin' ? 'is-active' : ''}`}
            onClick={() => navigate('/admin')}
          >
            Admin
          </button>
        ) : null}
        {isSuperAdminUser(userProfile) ? (
          <button
            type="button"
            className={`topbar-link ${currentSection === 'superadmin' ? 'is-active' : ''}`}
            onClick={() => navigate('/superadmin')}
          >
            Superadmin
          </button>
        ) : null}
        <button
          type="button"
          className="topbar-link topbar-logout-button"
          onClick={() => void logout()}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut className="topbar-link-icon" aria-hidden="true" />
          <span>Salir</span>
        </button>
      </div>
    </nav>
  );
}
