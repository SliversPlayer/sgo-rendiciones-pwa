import { useEffect, useMemo, useState } from 'react';
import { DashboardPage } from './pages/DashboardPage';
import { GastoFormPage } from './pages/GastoFormPage';
import { RendicionDetallePage } from './pages/RendicionDetallePage';

export function App() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const route = useMemo(() => parseRoute(path), [path]);

  const navigateTo = (nextPath: string) => {
    window.history.pushState(null, '', nextPath);
    setPath(nextPath);
  };

  if (route.name === 'rendicionDetalle') {
    return <RendicionDetallePage rendicionId={route.rendicionId} navigateTo={navigateTo} />;
  }

  if (route.name === 'nuevoGasto') {
    return <GastoFormPage rendicionId={route.rendicionId} navigateTo={navigateTo} />;
  }

  if (route.name === 'editarGasto') {
    return (
      <GastoFormPage
        rendicionId={route.rendicionId}
        gastoId={route.gastoId}
        navigateTo={navigateTo}
      />
    );
  }

  return <DashboardPage navigateTo={navigateTo} />;
}

type AppRoute =
  | { name: 'dashboard' }
  | { name: 'rendicionDetalle'; rendicionId: string }
  | { name: 'nuevoGasto'; rendicionId: string }
  | { name: 'editarGasto'; rendicionId: string; gastoId: string };

function parseRoute(path: string): AppRoute {
  const parts = path.split('/').filter(Boolean);

  if (parts[0] === 'rendicion' && parts[1] && parts.length === 2) {
    return { name: 'rendicionDetalle', rendicionId: parts[1] };
  }

  if (parts[0] === 'rendicion' && parts[1] && parts[2] === 'nuevo' && parts.length === 3) {
    return { name: 'nuevoGasto', rendicionId: parts[1] };
  }

  if (
    parts[0] === 'rendicion' &&
    parts[1] &&
    parts[2] === 'editar' &&
    parts[3] &&
    parts.length === 4
  ) {
    return { name: 'editarGasto', rendicionId: parts[1], gastoId: parts[3] };
  }

  return { name: 'dashboard' };
}
