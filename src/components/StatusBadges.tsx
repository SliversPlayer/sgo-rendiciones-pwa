import type { RendicionEstado } from '../types/rendicion';
import { getEstadoLabel } from '../utils/rendicionStatus';

interface RendicionStatusBadgeProps {
  estado: RendicionEstado;
}

export function RendicionStatusBadge({ estado }: RendicionStatusBadgeProps) {
  return (
    <span className={`status-badge status-${estado.toLowerCase()}`}>
      <span className="status-badge-dot" aria-hidden="true" />
      {getEstadoLabel(estado)}
    </span>
  );
}
