import type { Gasto } from '../types/gasto';

interface GastoListProps {
  gastos: Gasto[];
  onEdit: (gasto: Gasto) => void;
  onDelete: (gasto: Gasto) => void;
}

function formatMonto(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function GastoList({ gastos, onEdit, onDelete }: GastoListProps) {
  if (gastos.length === 0) {
    return (
      <div className="empty-state">
        <h3>Esta rendicion todavia no tiene gastos</h3>
        <p>Agrega el primer gasto para que la rendicion quede valida.</p>
      </div>
    );
  }

  return (
    <div className="gastos-list">
      {gastos.map((gasto) => (
        <article className="gasto-item" key={gasto.id}>
          <div className="gasto-main">
            <div>
              <p className="card-kicker">{gasto.tipo_documento_nombre}</p>
              <h3>{gasto.glosa}</h3>
              <p className="card-muted">Documento {gasto.numero_documento}</p>
            </div>
            <strong>{formatMonto(gasto.monto)}</strong>
          </div>

          <div className="card-actions compact-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => onEdit(gasto)}
            >
              Editar
            </button>
            <button
              type="button"
              className="button button-danger"
              onClick={() => onDelete(gasto)}
            >
              Eliminar
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
