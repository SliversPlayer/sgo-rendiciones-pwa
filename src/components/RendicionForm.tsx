import { FormEvent, useState } from 'react';
import type { Rendicion, RendicionFormData } from '../types/rendicion';

interface RendicionFormProps {
  initialRendicion?: Rendicion;
  onSubmit: (data: RendicionFormData) => Promise<void>;
  onCancel: () => void;
}

export function RendicionForm({ initialRendicion, onSubmit, onCancel }: RendicionFormProps) {
  const [titulo, setTitulo] = useState(initialRendicion?.titulo ?? '');
  const [glosaGrupo, setGlosaGrupo] = useState(initialRendicion?.glosa_grupo ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = Boolean(initialRendicion);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!titulo.trim()) {
      setFormError('Ingresa un titulo para la rendicion.');
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);
      await onSubmit({
        titulo,
        glosa_grupo: glosaGrupo,
      });
    } catch {
      setFormError('No se pudo guardar la rendicion. Intenta nuevamente.');
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

        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="button button-primary" disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </section>
  );
}
