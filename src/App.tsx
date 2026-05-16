import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom';
import { useCatalogosBootstrap } from './hooks/useCatalogos';
import { useAuth } from './hooks/useAuth';
import { DashboardPage } from './pages/DashboardPage';
import { GastoFormPage } from './pages/GastoFormPage';
import { LoginPage } from './pages/LoginPage';
import { RendicionDetallePage } from './pages/RendicionDetallePage';

function LoadingShell({ message }: { message: string }) {
  return (
    <main className="app-shell">
      <p className="notice">{message}</p>
    </main>
  );
}

function ProtectedLayout() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingShell message="Cargando sesion..." />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function PublicLoginRoute() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingShell message="Cargando sesion..." />;
  }

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  return <LoginPage />;
}

function LegacyRendicionRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/rendiciones/${id}` : '/'} replace />;
}

function LegacyNuevoGastoRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/rendiciones/${id}/gastos/nuevo` : '/'} replace />;
}

function LegacyEditarGastoRedirect() {
  const { id, gastoId } = useParams<{ id: string; gastoId: string }>();
  return <Navigate to={id && gastoId ? `/rendiciones/${id}/gastos/${gastoId}` : '/'} replace />;
}

export function App() {
  const catalogos = useCatalogosBootstrap();

  if (catalogos.isLoading) {
    return <LoadingShell message="Preparando catalogos locales..." />;
  }

  if (catalogos.error) {
    return (
      <main className="app-shell">
        <p className="notice notice-error">{catalogos.error}</p>
        <button type="button" className="button button-primary" onClick={() => void catalogos.reload()}>
          Reintentar
        </button>
      </main>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<PublicLoginRoute />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/rendiciones/:id" element={<RendicionDetallePage />} />
        <Route path="/rendiciones/:id/gastos/nuevo" element={<GastoFormPage />} />
        <Route path="/rendiciones/:id/gastos/:gastoId" element={<GastoFormPage />} />
        <Route path="/rendicion/:id" element={<LegacyRendicionRedirect />} />
        <Route path="/rendicion/:id/nuevo" element={<LegacyNuevoGastoRedirect />} />
        <Route path="/rendicion/:id/editar/:gastoId" element={<LegacyEditarGastoRedirect />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
