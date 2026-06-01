import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[SGO Rendiciones] App render error', error, errorInfo);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <main className="app-shell auth-shell">
          <section className="form-panel auth-panel app-error-panel" aria-labelledby="app-error-title">
            <div className="section-heading">
              <p className="eyebrow">Error de aplicacion</p>
              <h1 id="app-error-title">No se pudo cargar SGO Rendiciones</h1>
              <p className="header-copy">
                Recarga la pagina. Si el problema continua, revisa la configuracion del despliegue.
              </p>
            </div>
            <p className="notice notice-error">{this.state.error.message}</p>
            <button
              type="button"
              className="button button-primary"
              onClick={() => window.location.reload()}
            >
              Recargar
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
