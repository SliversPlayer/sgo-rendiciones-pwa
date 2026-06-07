import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import {
  Calendar,
  CheckCircle,
  CircleDollarSign,
  CreditCard,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  Wallet,
} from 'lucide-react';
import type { Rendicion } from '../types/rendicion';
import { RendicionStatusBadge } from './StatusBadges';
import { formatDisplayDate } from '../utils/date';
import { formatCurrency, formatTipoRendicionNombre } from '../utils/format';
import { isRendicionEditable } from '../utils/rendicionStatus';

interface RendicionCardSummary {
  gastosCount: number;
  montoTotal: number;
}

interface RendicionCardProps {
  rendicion: Rendicion;
  summary?: RendicionCardSummary;
  onOpen: (rendicion: Rendicion) => void;
  onEdit: (rendicion: Rendicion) => void;
  onDelete: (rendicion: Rendicion) => void;
}

function isCreditCardType(tipoNombre: string): boolean {
  return tipoNombre.toLowerCase().includes('tarjeta');
}

export function RendicionCard({
  rendicion,
  summary = { gastosCount: 0, montoTotal: 0 },
  onOpen,
  onEdit,
  onDelete,
}: RendicionCardProps) {
  const isEditable = isRendicionEditable(rendicion);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const tipoRendicion = formatTipoRendicionNombre(
    rendicion.tipo_rendicion_id,
    rendicion.tipo_rendicion_nombre,
  );
  const TypeIcon = isCreditCardType(tipoRendicion) ? CreditCard : Wallet;
  const showApprovalDate = rendicion.estado === 'APROBADA' && Boolean(rendicion.fecha_aprobacion);
  const gastosLabel =
    summary.gastosCount === 1 ? '1 gasto' : `${summary.gastosCount} gastos`;

  const openRendicion = () => {
    onOpen(rendicion);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openRendicion();
    }
  };

  const handleMenuButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsMenuOpen((current) => !current);
  };

  const handleEdit = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsMenuOpen(false);

    if (isEditable) {
      onEdit(rendicion);
    }
  };

  const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsMenuOpen(false);

    if (isEditable) {
      onDelete(rendicion);
    }
  };

  return (
    <article
      className="rendicion-card user-rendicion-card"
      role="button"
      tabIndex={0}
      onClick={openRendicion}
      onKeyDown={handleCardKeyDown}
      aria-label={`Ver detalle de rendicion ${rendicion.titulo}`}
    >
      <div className="rendicion-card-top">
        <RendicionStatusBadge estado={rendicion.estado} />

        <div className="rendicion-card-menu">
          <button
            type="button"
            className="card-menu-button"
            onClick={handleMenuButtonClick}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-label={`Acciones para ${rendicion.titulo}`}
          >
            <MoreVertical className="card-menu-icon" aria-hidden="true" />
          </button>

          {isMenuOpen ? (
            <div className="card-action-menu" role="menu" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                role="menuitem"
                onClick={handleEdit}
                disabled={!isEditable}
              >
                <Pencil className="card-action-icon" aria-hidden="true" />
                <span>Editar</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="is-danger"
                onClick={handleDelete}
                disabled={!isEditable}
              >
                <Trash2 className="card-action-icon" aria-hidden="true" />
                <span>Eliminar</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <h2 className="rendicion-card-title">{rendicion.titulo}</h2>

      <div className="rendicion-card-meta">
        <p>
          <TypeIcon className="rendicion-card-meta-icon" aria-hidden="true" />
          <span>{tipoRendicion}</span>
        </p>
        <p>
          {showApprovalDate ? (
            <CheckCircle className="rendicion-card-meta-icon is-approved" aria-hidden="true" />
          ) : (
            <Calendar className="rendicion-card-meta-icon" aria-hidden="true" />
          )}
          <span>
            {showApprovalDate
              ? `Aprobada: ${formatDisplayDate(rendicion.fecha_aprobacion ?? '')}`
              : formatDisplayDate(rendicion.fecha_creacion)}
          </span>
        </p>
      </div>

      <div className="rendicion-card-footer">
        <span className="rendicion-card-footer-item">
          <FileText className="rendicion-card-footer-icon" aria-hidden="true" />
          {gastosLabel}
        </span>
        <strong className="rendicion-card-amount">
          <CircleDollarSign className="rendicion-card-footer-icon" aria-hidden="true" />
          {formatCurrency(summary.montoTotal)}
        </strong>
      </div>
    </article>
  );
}
