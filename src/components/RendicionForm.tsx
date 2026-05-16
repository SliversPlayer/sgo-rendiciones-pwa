import { FormEvent, useState } from 'react';
import { useTiposRendicion } from '../hooks/useCatalogos';
import type { Rendicion, RendicionFormData } from '../types/rendicion';

interface RendicionFormProps {
  initialRendicion?: Rendicion;
  onSubmit: (data: RendicionFormData) => Promise<void>;
  onCancel: () => void;
}

export function RendicionForm({ initialRendicion, onSubmit, onCancel }: RendicionFormProps) {
  const { tiposRendicion, isLoading: isCatalogosLoading, error: catalogosError } =
    useTiposRendicion();
  const [titulo, setTitulo] = useState(initialRendicion?.titulo ?? '');
  const [glosaGrupo, setGlosaGrupo] = useState(initialRendicion?.glosa_grupo ?? '');
  const [tipoRendicionId, setTipoRendicionId] = useState(
    initialRendicion?.tipo_rendicion_id ?? '',
  );
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = Boolean(initialRendicion);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!titulo.trim()) {
      setFormError('Ingresa un titulo para la rendicion.');
      return;
    }

    if (isCatalogosLoading) {
      setFormError('Espera a que se carguen los catalogos locales.');
      return;
    }

    if (catalogosError) {
      setFormError(catalogosError);
      return;
    }

    if (!tipoRendicionId) {
      setFormError('Selecciona el tipo de rendicion.');
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);
      await onSubmit({
        titulo,
        glosa_grupo: glosaGrupo,
        tipo_rendicion_id: tipoRendicionId,
      });
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la rendicion. Intenta nuevamente.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="form-panel" aria-labelledby="rendicion-form-title">
      <div className="section-heading">
        <p className="eyebrow">{isEditing ? 'Editar' : 'Nueva'}</p>
        <h2 id="rendicion-form-title">
          {isEditing ? 'Editar rendicion' : 'Crear rendicion'}
        </h2>
      </div>

      <form className="rendicion-form" onSubmit={handleSubmit}>
        <label>
          <span>Titulo</span>
          <input
            type="text"
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            placeholder="Ej: Visita oficina regional"
            maxLength={120}
            autoFocus
          />
        </label>

        <fieldset className="radio-card-group">
          <legend>Tipo de rendicion *</legend>
          {isCatalogosLoading ? <p className="notice">Cargando catalogos locales...</p> : null}
          {catalogosError ? <p className="notice notice-error">{catalogosError}</p> : null}
          <div className="radio-card-list">
            {tiposRendicion.map((tipo) => (
              <label
                key={tipo.id}
                className={`radio-card ${tipoRendicionId === tipo.id ? 'is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="tipo_rendicion_id"
                  value={tipo.id}
                  checked={tipoRendicionId === tipo.id}
                  onChange={(event) => setTipoRendicionId(event.target.value)}
                  disabled={isCatalogosLoading}
                />
                <span>{tipo.nombre}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          <span>Glosa de grupo</span>
          <textarea
            value={glosaGrupo}
            onChange={(event) => setGlosaGrupo(event.target.value)}
            placeholder="Descripcion opcional"
            maxLength={260}
            rows={4}
          />
        </label>

        {formError ? <p className="form-error">{formError}</p> : null}

        <div className="form-actions sticky-actions primary-first-on-stack">
          <button type="button" className="button button-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="submit"
            className="button button-primary"
            disabled={isSaving || isCatalogosLoading}
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </section>
  );
}
