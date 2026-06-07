import {
  CloudAlert,
  CloudCheck,
  CloudOff,
  LoaderCircle,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import { useSyncStatus, type SyncStatusMode } from '../hooks/useSyncStatus';

interface SyncStatusConfig {
  icon: LucideIcon;
  label: string;
  title: string;
}

const syncStatusConfig: Record<SyncStatusMode, SyncStatusConfig> = {
  idle: {
    icon: RefreshCw,
    label: 'Actualizar',
    title: 'Actualizar datos ahora',
  },
  syncing: {
    icon: LoaderCircle,
    label: 'Sincronizando',
    title: 'Sincronizacion en curso',
  },
  synced: {
    icon: CloudCheck,
    label: 'Sincronizado',
    title: 'Datos sincronizados',
  },
  offline: {
    icon: CloudOff,
    label: 'Offline',
    title: 'Sin conexion disponible',
  },
  error: {
    icon: CloudAlert,
    label: 'Error',
    title: 'Reintentar actualizacion',
  },
};

export function SyncStatusPill() {
  const { status, syncNow } = useSyncStatus();
  const config = syncStatusConfig[status];
  const Icon = config.icon;
  const isBusy = status === 'syncing';
  const isDisabled = status === 'offline' || isBusy;

  return (
    <button
      type="button"
      className={`sync-status-pill is-${status}`}
      onClick={() => void syncNow().catch(() => undefined)}
      disabled={isDisabled}
      aria-busy={isBusy}
      aria-live="polite"
      aria-label={config.title}
      title={config.title}
    >
      <Icon className={`sync-status-icon ${isBusy ? 'animate-spin' : ''}`} aria-hidden="true" />
      <span>{config.label}</span>
    </button>
  );
}
