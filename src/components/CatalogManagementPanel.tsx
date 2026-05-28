import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSuperAdminCatalogos } from '../hooks/useSuperAdminCatalogos';
import type {
  CatalogoKey,
  ManagedCatalogInput,
  ManagedCatalogItem,
} from '../types/superadmin';

type CatalogStateFilter = 'TODOS' | 'ACTIVO' | 'INACTIVO';

interface CatalogDefinition {
  key: CatalogoKey;
  label: string;
  plural: string;
  usesCuentaContable: boolean;
}

const catalogDefinitions: CatalogDefinition[] = [
  {
    key: 'centros_negocio',
    label: 'Centro de negocio',
    plural: 'Centros de negocio',
    usesCuentaContable: false,
  },
  {
    key: 'tipos_documento',
    label: 'Tipo de documento',
    plural: 'Tipos de documento',
    usesCuentaContable: true,
  },
  {
    key: 'tipos_gasto',
    label: 'Tipo de gasto',
    plural: 'Tipos de gasto',
    usesCuentaContable: true,
  },
  {
    key: 'tipos_rendicion',
    label: 'Tipo de rendicion',
    plural: 'Tipos de rendicion',
    usesCuentaContable: true,
  },
];

const emptyForm: ManagedCatalogInput = {
  nombre: '',
  codigo: '',
  activo: true,
  cuenta_contable: '',
};

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function matchesCatalogSearch(item: ManagedCatalogItem, search: string): boolean {
  if (!search) {
    return true;
  }

  return normalizeSearch(`${item.nombre} ${item.codigo} ${item.cuenta_contable ?? ''}`).includes(
    search,
  );
}

export function CatalogManagementPanel() {
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogoKey>('centros_negocio');
  const [editingItem, setEditingItem] = useState<ManagedCatalogItem | null>(null);
  const [formData, setFormData] = useState<ManagedCatalogInput>(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState<CatalogStateFilter>('TODOS');
  const [formError, setFormError] = useState<string | null>(null);
  const {
    items,
    isLoading,
    isSaving,
    error,
    successMessage,
    reload,
    saveItem,
    changeItemActive,
  } = useSuperAdminCatalogos(selectedCatalog);

  const selectedDefinition = catalogDefinitions.find(
    (definition) => definition.key === selectedCatalog,
  ) ?? catalogDefinitions[0];

  const visibleItems = useMemo(() => {
    const search = normalizeSearch(searchTerm.trim());

    return items
      .filter((item) => {
        if (stateFilter === 'ACTIVO') {
          return item.activo;
        }

        if (stateFilter === 'INACTIVO') {
          return !item.activo;
        }

        return true;
      })
      .filter((item) => matchesCatalogSearch(item, search));
  }, [items, searchTerm, stateFilter]);

  useEffect(() => {
    setEditingItem(null);
    setFormData(emptyForm);
    setFormError(null);
  }, [selectedCatalog]);

  function updateFormField<K extends keyof ManagedCatalogInput>(
    field: K,
    value: ManagedCatalogInput[K],
  ) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  function startEdit(item: ManagedCatalogItem) {
    setEditingItem(item);
    setFormData({
      nombre: item.nombre,
      codigo: item.codigo,
      cuenta_contable: item.cuenta_contable ?? '',
      activo: item.activo,
    });
    setFormError(null);
  }

  function resetForm() {
    setEditingItem(null);
    setFormData(emptyForm);
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setFormError(null);
      await saveItem(formData, editingItem?.id);
      resetForm();
    } catch (saveError) {
      setFormError(
        saveError instanceof Error ? saveError.message : 'No se pudo guardar el catalogo.',
      );
    }
  }

  async function handleActiveChange(item: ManagedCatalogItem) {
    const nextActive = !item.activo;

    if (!nextActive) {
      const shouldDeactivate = window.confirm(`Desactivar ${item.nombre}?`);

      if (!shouldDeactivate) {
        return;
      }
    }

    await changeItemActive(item.id, nextActive).catch(() => undefined);

    if (editingItem?.id === item.id) {
      resetForm();
    }
  }

  return (
    <section className="dashboard-section" aria-labelledby="superadmin-catalogs-title">
      <div className="section-heading with-action">
        <div>
          <p className="eyebrow">Catalogos</p>
          <h2 id="superadmin-catalogs-title">Gestion de catalogos</h2>
        </div>
        <button type="button" className="button button-secondary" onClick={() => void reload()}>
          Refrescar
        </button>
      </div>

      <div className="catalog-tabs" role="tablist" aria-label="Catalogos editables">
        {catalogDefinitions.map((definition) => (
          <button
            key={definition.key}
            type="button"
            className={selectedCatalog === definition.key ? 'is-active' : ''}
            onClick={() => setSelectedCatalog(definition.key)}
          >
            {definition.label}
          </button>
        ))}
      </div>

      <section className="form-panel wide-panel superadmin-form-panel" aria-labelledby="catalog-form-title">
        <div className="section-heading">
          <p className="eyebrow">{editingItem ? 'Editar' : 'Nuevo'}</p>
          <h2 id="catalog-form-title">
            {editingItem ? `Editar ${selectedDefinition.label}` : `Crear ${selectedDefinition.label}`}
          </h2>
        </div>

        <form className="rendicion-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              <span>Nombre visible</span>
              <input
                type="text"
                value={formData.nombre}
                onChange={(event) => updateFormField('nombre', event.target.value)}
                placeholder={selectedDefinition.label}
                maxLength={140}
              />
            </label>

            <label>
              <span>Codigo interno</span>
              <input
                type="text"
                value={formData.codigo}
                onChange={(event) => updateFormField('codigo', event.target.value)}
                placeholder="Codigo"
                maxLength={80}
              />
            </label>

            {selectedDefinition.usesCuentaContable ? (
              <label>
                <span>Cuenta contable</span>
                <input
                  type="text"
                  value={formData.cuenta_contable ?? ''}
                  onChange={(event) => updateFormField('cuenta_contable', event.target.value)}
                  placeholder="Cuenta contable"
                  maxLength={80}
                />
              </label>
            ) : null}
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={formData.activo}
              onChange={(event) => updateFormField('activo', event.target.checked)}
            />
            <span>Item activo</span>
          </label>

          {formError ? <p className="form-error">{formError}</p> : null}

          <div className="form-actions">
            {editingItem ? (
              <button type="button" className="button button-secondary" onClick={resetForm}>
                Cancelar edicion
              </button>
            ) : null}
            <button type="submit" className="button button-primary" disabled={isSaving}>
              {isSaving ? 'Guardando...' : editingItem ? 'Guardar cambios' : 'Crear item'}
            </button>
          </div>
        </form>
      </section>

      <div className="filters-bar superadmin-filters" aria-label="Filtros de catalogos">
        <label>
          <span>Buscar</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Nombre, codigo o cuenta"
          />
        </label>
        <label>
          <span>Estado</span>
          <select
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value as CatalogStateFilter)}
          >
            <option value="TODOS">Todos</option>
            <option value="ACTIVO">Activos</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
        </label>
      </div>

      <div className="section-heading compact-heading">
        <p className="eyebrow">Listado</p>
        <h2>{selectedDefinition.plural}</h2>
      </div>

      {error ? <p className="notice notice-error">{error}</p> : null}
      {successMessage ? <p className="notice notice-success">{successMessage}</p> : null}
      {isLoading ? <p className="notice">Cargando catalogos...</p> : null}

      {!isLoading && visibleItems.length === 0 ? (
        <div className="empty-state">
          <h3>Sin items</h3>
          <p>Ajusta la busqueda o crea un nuevo item.</p>
        </div>
      ) : null}

      {!isLoading && visibleItems.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-rendiciones-table superadmin-table">
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Codigo</th>
                {selectedDefinition.usesCuentaContable ? <th scope="col">Cuenta</th> : null}
                <th scope="col">Estado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr key={item.id}>
                  <td data-label="Nombre">{item.nombre}</td>
                  <td data-label="Codigo">{item.codigo}</td>
                  {selectedDefinition.usesCuentaContable ? (
                    <td data-label="Cuenta">{item.cuenta_contable ?? '-'}</td>
                  ) : null}
                  <td data-label="Estado">
                    <span className={`status-pill ${item.activo ? 'status-active' : 'status-inactive'}`}>
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td data-label="Acciones">
                    <div className="table-actions">
                      <button
                        type="button"
                        className="button button-secondary button-small"
                        onClick={() => startEdit(item)}
                        disabled={isSaving}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className={item.activo ? 'button button-danger button-small' : 'button button-secondary button-small'}
                        onClick={() => void handleActiveChange(item)}
                        disabled={isSaving}
                      >
                        {item.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
