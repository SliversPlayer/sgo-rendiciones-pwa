import type { Rendicion } from '../types/rendicion';
import { RendicionStatusBadge, SyncStatusBadge } from './StatusBadges';
import { formatDisplayDate } from '../utils/date';
import { formatTipoRendicionNombre } from '../utils/format';
import { isRendicionEditable } from '../utils/rendicionStatus';

interface RendicionCardProps {
  rendicion: Rendicion;
  onOpen: (rendicion: Rendicion) => void;
  onEdit: (rendicion: Rendicion) => void;
  onDelete: (rendicion: Rendicion) => void;
}

export function RendicionCard({ rendicion, onOpen, onEdit, onDelete }: RendicionCardProps) {
  const isEditable = isRendicionEditable(rendicion);

  return (
    <article className="rendicion-card user-rendicion-card">
      <div className="user-card-content">
        <div className="card-header user-card-header">
          <div className="user-card-title">
            <p className="card-kicker">Rendicion</p>
            <h2>{rendicion.titulo}</h2>
          </div>
          <RendicionStatusBadge estado={rendicion.estado} />
        </div>

        {rendicion.glosa_grupo ? (
          <p className="card-glosa user-card-text">{rendicion.glosa_grupo}</p>
        ) : (
          <p className="card-muted user-card-text">Sin glosa de grupo</p>
        )}

        {rendicion.observacion_rechazo ? (
          <p className="notice notice-warning user-card-note">
            Observacion rechazo: {rendicion.observacion_rechazo}
          </p>
        ) : null}

        <dl className="card-meta">
          <div>
            <dt>Tipo</dt>
            <dd>
              {formatTipoRendicionNombre(
                rendicion.tipo_rendicion_id,
                rendicion.tipo_rendicion_nombre,
              )}
            </dd>
          </div>
          <div>
            <dt>Creada</dt>
            <dd>{formatDisplayDate(rendicion.fecha_creacion)}</dd>
          </div>
          <div>
            <dt>Sync</dt>
            <dd>
              <SyncStatusBadge status={rendicion.sync_status ?? 'LOCAL'} />
            </dd>
          </div>
          {rendicion.fecha_aprobacion ? (
            <div>
              <dt>Aprobada</dt>
              <dd>{formatDisplayDate(rendicion.fecha_aprobacion)}</dd>
            </div>
          ) : null}
          {rendicion.fecha_rechazo ? (
            <div>
              <dt>Rechazada</dt>
              <dd>{formatDisplayDate(rendicion.fecha_rechazo)}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="card-actions user-card-actions">
        <div className="user-card-actions-row">
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
        </div>
        <div className="user-card-actions-row">
          <button
            type="button"
            className="button button-danger"
            onClick={() => onDelete(rendicion)}
            disabled={!isEditable}
          >
            Eliminar
          </button>
        </div>
      </div>
    </article>
  );
}
