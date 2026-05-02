import { useGastoForm } from '../hooks/useGastoForm';
import type { AdjuntoInput, GastoConAdjuntos, GastoFormData } from '../types/gasto';

interface GastoFormProps {
  initialGasto?: GastoConAdjuntos;
  onSubmit: (data: GastoFormData, adjuntos: AdjuntoInput[]) => Promise<void>;
  onCancel: () => void;
}

export function GastoForm({ initialGasto, onSubmit, onCancel }: GastoFormProps) {
  const {
    data,
    adjuntos,
    catalogos,
    isSaving,
    isProcessingFiles,
    formError,
    canAddAdjuntos,
    totalAdjuntosLabel,
    updateField,
    handleFileChange,
    removeAdjunto,
    handleSubmit,
  } = useGastoForm({ initialGasto, onSubmit });
  const isEditing = Boolean(initialGasto);

  return (
    <section className="form-panel wide-panel" aria-labelledby="gasto-form-title">
      <div className="section-heading">
        <p className="eyebrow">{isEditing ? 'Editar' : 'Nuevo'}</p>
        <h2 id="gasto-form-title">{isEditing ? 'Editar gasto' : 'Crear gasto'}</h2>
      </div>

      <form className="rendicion-form gasto-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            <span>Fecha</span>
            <input
              type="date"
              value={data.fecha}
              onChange={(event) => updateField('fecha', event.target.value)}
            />
          </label>

          <label>
            <span>Glosa</span>
            <input
              type="text"
              value={data.glosa}
              onChange={(event) => updateField('glosa', event.target.value)}
              placeholder="Ej: Taxi aeropuerto"
              maxLength={160}
              autoFocus
            />
          </label>

          <label>
            <span>Centro de costo</span>
            <select
              value={data.centro_costo_id}
              onChange={(event) => updateField('centro_costo_id', event.target.value)}
            >
              <option value="">Selecciona centro de costo</option>
              {catalogos.centrosCosto.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Tipo documento</span>
            <select
              value={data.tipo_documento_id}
              onChange={(event) => updateField('tipo_documento_id', event.target.value)}
            >
              <option value="">Selecciona tipo documento</option>
              {catalogos.tiposDocumento.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Numero documento</span>
            <input
              type="text"
              value={data.numero_documento}
              onChange={(event) => updateField('numero_documento', event.target.value)}
              placeholder="Ej: 123456"
              maxLength={60}
            />
          </label>

          <label>
            <span>Tipo gasto</span>
            <select
              value={data.tipo_gasto_id}
              onChange={(event) => updateField('tipo_gasto_id', event.target.value)}
            >
              <option value="">Selecciona tipo gasto</option>
              {catalogos.tiposGasto.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Monto</span>
            <input
              type="number"
              value={data.monto}
              onChange={(event) => updateField('monto', event.target.value)}
              placeholder="0"
              min="1"
              step="1"
            />
          </label>
        </div>

        <fieldset className="adjuntos-fieldset">
          <legend>Adjuntos</legend>
          <p className="field-help">{totalAdjuntosLabel}</p>

          <div className="attachment-actions">
            <label className={`button button-secondary file-button ${canAddAdjuntos ? '' : 'is-disabled'}`}>
              Tomar foto
              <input
                type="file"
                accept="image/jpeg,image/png"
                capture="environment"
                onChange={handleFileChange}
                disabled={!canAddAdjuntos}
              />
            </label>

            <label className={`button button-secondary file-button ${canAddAdjuntos ? '' : 'is-disabled'}`}>
              Seleccionar archivo
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={handleFileChange}
                disabled={!canAddAdjuntos}
              />
            </label>
          </div>

          {adjuntos.length > 0 ? (
            <ul className="attachments-list">
              {adjuntos.map((adjunto) => (
                <li key={adjunto.id}>
                  <span>{adjunto.nombre}</span>
                  <button
                    type="button"
                    className="button button-danger button-small"
                    onClick={() => removeAdjunto(adjunto.id)}
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="card-muted">Agrega entre 1 y 2 comprobantes.</p>
          )}
        </fieldset>

        {formError ? <p className="form-error">{formError}</p> : null}

        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="submit"
            className="button button-primary"
            disabled={isSaving || isProcessingFiles}
          >
            {isProcessingFiles ? 'Procesando...' : isSaving ? 'Guardando...' : 'Guardar gasto'}
          </button>
        </div>
      </form>
    </section>
  );
}
