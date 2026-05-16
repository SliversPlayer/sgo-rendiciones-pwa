import type { Rendicion } from '../types/rendicion';
import { formatDisplayDate } from '../utils/date';
import {
  getEstadoLabel,
  getSyncStatusLabel,
  isRendicionEditable,
} from '../utils/rendicionStatus';

interface RendicionCardProps {
  rendicion: Rendicion;
  onOpen: (rendicion: Rendicion) => void;
  onEdit: (rendicion: Rendicion) => void;
  onDelete: (rendicion: Rendicion) => void;
}

export function RendicionCard({ rendicion, onOpen, onEdit, onDelete }: RendicionCardProps) {
  const isEditable = isRendicionEditable(rendicion);

  return (
    <article className="rendicion-card">
      <div className="card-header">
        <div>
          <p className="card-kicker">Rendicion</p>
          <h2>{rendicion.titulo}</h2>
        </div>
        <span className={`status-pill status-${rendicion.estado.toLowerCase()}`}>
          {getEstadoLabel(rendicion.estado)}
        </span>
      </div>

      {rendicion.glosa_grupo ? (
        <p className="card-glosa">{rendicion.glosa_grupo}</p>
      ) : (
        <p className="card-muted">Sin glosa de grupo</p>
      )}

      <dl className="card-meta">
        <div>
          <dt>Tipo</dt>
          <dd>{rendicion.tipo_rendicion_nombre || 'Sin tipo'}</dd>
        </div>
        <div>
          <dt>Creada</dt>
          <dd>{formatDisplayDate(rendicion.fecha_creacion)}</dd>
        </div>
        <div>
          <dt>Sync</dt>
          <dd>{getSyncStatusLabel(rendicion.sync_status ?? 'LOCAL')}</dd>
        </div>
      </dl>

      <div className="card-actions">
        <button type="button" className="button button-primary" onClick={() => onOpen(rendicion)}>
          Ver gastos
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => onEdit(rendicion)}
          disabled={!isEditable}
        >
          Editar
        </button>
        <button
          type="button"
          className="button button-danger"
          onClick={() => onDelete(rendicion)}
          disabled={!isEditable}
        >
          Eliminar
        </button>
      </div>
    </article>
  );
}
