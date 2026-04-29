import type { Rendicion } from '../types/rendicion';
import { formatDisplayDate } from '../utils/date';

interface RendicionCardProps {
  rendicion: Rendicion;
  onEdit: (rendicion: Rendicion) => void;
  onDelete: (rendicion: Rendicion) => void;
}

export function RendicionCard({ rendicion, onEdit, onDelete }: RendicionCardProps) {
  return (
    <article className="rendicion-card">
      <div className="card-header">
        <div>
          <p className="card-kicker">Rendicion</p>
          <h2>{rendicion.titulo}</h2>
        </div>
        <span className="status-pill">{rendicion.estado}</span>
      </div>

      {rendicion.glosa_grupo ? (
        <p className="card-glosa">{rendicion.glosa_grupo}</p>
      ) : (
        <p className="card-muted">Sin glosa de grupo</p>
      )}

      <dl className="card-meta">
        <div>
          <dt>Creada</dt>
          <dd>{formatDisplayDate(rendicion.fecha_creacion)}</dd>
        </div>
      </dl>

      <div className="card-actions">
        <button type="button" className="button button-secondary" onClick={() => onEdit(rendicion)}>
          Editar
        </button>
        <button type="button" className="button button-danger" onClick={() => onDelete(rendicion)}>
          Eliminar
        </button>
      </div>
    </article>
  );
}
