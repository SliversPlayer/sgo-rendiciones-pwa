import { useGastoForm } from '../hooks/useGastoForm';
import type { AdjuntoInput, GastoConAdjuntos, GastoFormData } from '../types/gasto';

interface GastoFormProps {
  initialGasto?: GastoConAdjuntos;
  onSubmit: (data: GastoFormData, adjuntos: AdjuntoInput[]) => Promise<void>;
  onCancel: () => void;
}

function getCatalogPlaceholder(isLoading: boolean, hasOptions: boolean, labels: {
  loading: string;
  empty: string;
  ready: string;
}) {
  if (isLoading) {
    return labels.loading;
  }

  if (!hasOptions) {
    return labels.empty;
  }

  return labels.ready;
}

export function GastoForm({ initialGasto, onSubmit, onCancel }: GastoFormProps) {
  const {
    data,
    adjuntos,
    catalogos,
    isCatalogosLoading,
    catalogosError,
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
  const hasCentrosNegocio = catalogos.centrosNegocio.length > 0;
  const hasTiposDocumento = catalogos.tiposDocumento.length > 0;
  const hasTiposGasto = catalogos.tiposGasto.length > 0;
  const isCentroNegocioDisabled = isCatalogosLoading || !hasCentrosNegocio;
  const isTipoDocumentoDisabled = isCatalogosLoading || !hasTiposDocumento;
  const isTipoGastoDisabled = isCatalogosLoading || !hasTiposGasto;
  const hasUnavailableCatalogos =
    !isCatalogosLoading &&
    !catalogosError &&
    (!hasCentrosNegocio || !hasTiposDocumento || !hasTiposGasto);
  const centroNegocioPlaceholder = getCatalogPlaceholder(isCatalogosLoading, hasCentrosNegocio, {
    loading: 'Cargando centros de negocio...',
    empty: 'No hay centros de negocio disponibles',
    ready: 'Selecciona centro de negocio',
  });
  const tipoDocumentoPlaceholder = getCatalogPlaceholder(isCatalogosLoading, hasTiposDocumento, {
    loading: 'Cargando tipos de documento...',
    empty: 'No hay tipos de documento disponibles',
    ready: 'Selecciona tipo documento',
  });
  const tipoGastoPlaceholder = getCatalogPlaceholder(isCatalogosLoading, hasTiposGasto, {
    loading: 'Cargando tipos de gasto...',
    empty: 'No hay tipos de gasto disponibles',
    ready: 'Selecciona tipo gasto',
  });

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
            <span>Centro de negocio</span>
            <select
              className={hasCentrosNegocio && data.centro_negocio_id ? 'is-filled' : ''}
              value={hasCentrosNegocio ? data.centro_negocio_id : ''}
              onChange={(event) => updateField('centro_negocio_id', event.target.value)}
              disabled={isCentroNegocioDisabled}
            >
              <option value="">{centroNegocioPlaceholder}</option>
              {catalogos.centrosNegocio.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Tipo documento</span>
            <select
              className={hasTiposDocumento && data.tipo_documento_id ? 'is-filled' : ''}
              value={hasTiposDocumento ? data.tipo_documento_id : ''}
              onChange={(event) => updateField('tipo_documento_id', event.target.value)}
              disabled={isTipoDocumentoDisabled}
            >
              <option value="">{tipoDocumentoPlaceholder}</option>
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
              className={hasTiposGasto && data.tipo_gasto_id ? 'is-filled' : ''}
              value={hasTiposGasto ? data.tipo_gasto_id : ''}
              onChange={(event) => updateField('tipo_gasto_id', event.target.value)}
              disabled={isTipoGastoDisabled}
            >
              <option value="">{tipoGastoPlaceholder}</option>
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
              className="amount-input"
              value={data.monto}
              onChange={(event) => updateField('monto', event.target.value)}
              placeholder="0"
              inputMode="numeric"
              pattern="[0-9]*"
              min="1"
              step="1"
            />
          </label>
        </div>

        {isCatalogosLoading ? <p className="notice">Cargando catalogos locales...</p> : null}
        {catalogosError ? <p className="notice notice-error">{catalogosError}</p> : null}
        {hasUnavailableCatalogos ? (
          <p className="notice notice-warning">
            Faltan opciones para crear el gasto. Contacte al administrador.
          </p>
        ) : null}

        <fieldset className="adjuntos-fieldset">
          <legend>Adjuntos</legend>
          <p className="field-help">{totalAdjuntosLabel}</p>

          <div className="attachment-actions">
            <label
              className={`button button-secondary file-button ${canAddAdjuntos ? '' : 'is-disabled'}`}
              aria-disabled={!canAddAdjuntos}
            >
              Agregar adjunto
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                multiple
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
          ) : null}
        </fieldset>

        {formError ? <p className="form-error">{formError}</p> : null}

        <div className="form-actions sticky-actions primary-first-on-stack">
          <button type="button" className="button button-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="submit"
            className="button button-primary"
            disabled={isSaving || isProcessingFiles || isCatalogosLoading}
          >
            {isProcessingFiles ? 'Procesando...' : isSaving ? 'Guardando...' : 'Guardar gasto'}
          </button>
        </div>
      </form>
    </section>
  );
}
