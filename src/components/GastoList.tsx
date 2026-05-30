import type { Gasto } from '../types/gasto';
import { formatCurrency } from '../utils/format';

interface GastoListProps {
  gastos: Gasto[];
  onEdit: (gasto: Gasto) => void;
  onDelete: (gasto: Gasto) => void;
  readOnly?: boolean;
}

export function GastoList({ gastos, onEdit, onDelete, readOnly = false }: GastoListProps) {
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
      {gastos.map((gasto) => {
        const centroNegocioNombre =
          gasto.centro_negocio_nombre ?? gasto.centro_costo_nombre ?? 'Sin centro de negocio';

        return (
          <article className="gasto-item" key={gasto.id}>
            <div className="gasto-main">
              <div>
                <p className="card-kicker">{gasto.tipo_documento_nombre}</p>
                <h3>{gasto.glosa}</h3>
                <div className="gasto-meta-row">
                  <span>{centroNegocioNombre}</span>
                  <span>Documento {gasto.numero_documento}</span>
                </div>
              </div>
              <strong className="amount-value">{formatCurrency(gasto.monto)}</strong>
            </div>

            {!readOnly ? (
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
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
