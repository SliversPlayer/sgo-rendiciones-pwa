import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { centrosCosto, tiposDocumento, tiposGasto } from '../services/catalogos';
import type { AdjuntoInput, GastoConAdjuntos, GastoFormData } from '../types/gasto';
import { createId } from '../utils/id';

const MAX_ADJUNTOS = 2;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

interface AdjuntoDraft extends AdjuntoInput {
  id: string;
  size: number;
}

interface UseGastoFormParams {
  initialGasto?: GastoConAdjuntos;
  onSubmit: (data: GastoFormData, adjuntos: AdjuntoInput[]) => Promise<void>;
}

function todayInputDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatInputDate(value: string): string {
  return value.slice(0, 10);
}

function getInitialData(initialGasto?: GastoConAdjuntos): GastoFormData {
  if (!initialGasto) {
    return {
      fecha: todayInputDate(),
      glosa: '',
      centro_costo_id: '',
      tipo_documento_id: '',
      numero_documento: '',
      tipo_gasto_id: '',
      monto: '',
    };
  }

  return {
    fecha: formatInputDate(initialGasto.gasto.fecha),
    glosa: initialGasto.gasto.glosa,
    centro_costo_id: initialGasto.gasto.centro_costo_id,
    tipo_documento_id: initialGasto.gasto.tipo_documento_id,
    numero_documento: initialGasto.gasto.numero_documento,
    tipo_gasto_id: initialGasto.gasto.tipo_gasto_id,
    monto: String(initialGasto.gasto.monto),
  };
}

function getInitialAdjuntos(initialGasto?: GastoConAdjuntos): AdjuntoDraft[] {
  return (
    initialGasto?.adjuntos.map((adjunto) => ({
      id: adjunto.id,
      archivo: adjunto.archivo,
      nombre: adjunto.nombre,
      tipo: adjunto.tipo,
      size: adjunto.archivo.size,
    })) ?? []
  );
}

export function useGastoForm({ initialGasto, onSubmit }: UseGastoFormParams) {
  const [data, setData] = useState<GastoFormData>(() => getInitialData(initialGasto));
  const [adjuntos, setAdjuntos] = useState<AdjuntoDraft[]>(() =>
    getInitialAdjuntos(initialGasto),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const remainingAdjuntos = MAX_ADJUNTOS - adjuntos.length;
  const canAddAdjuntos = remainingAdjuntos > 0;

  const totalAdjuntosLabel = useMemo(
    () => `${adjuntos.length}/${MAX_ADJUNTOS} adjuntos`,
    [adjuntos.length],
  );

  function updateField(field: keyof GastoFormData, value: string) {
    setData((current) => ({ ...current, [field]: value }));
  }

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const selectedFiles = Array.from(files);

    if (selectedFiles.length > remainingAdjuntos) {
      setFormError('Cada gasto puede tener maximo 2 adjuntos.');
      return;
    }

    const invalidType = selectedFiles.find((file) => !ALLOWED_TYPES.includes(file.type));
    if (invalidType) {
      setFormError('Solo se permiten imagenes JPEG, PNG o archivos PDF.');
      return;
    }

    const oversized = selectedFiles.find((file) => file.size > MAX_FILE_SIZE);
    if (oversized) {
      setFormError('Cada adjunto debe pesar 5MB o menos.');
      return;
    }

    setAdjuntos((current) => [
      ...current,
      ...selectedFiles.map((file) => ({
        id: createId(),
        archivo: file,
        nombre: file.name,
        tipo: file.type,
        size: file.size,
      })),
    ]);
    setFormError(null);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.target.files);
    event.target.value = '';
  }

  function removeAdjunto(id: string) {
    setAdjuntos((current) => current.filter((adjunto) => adjunto.id !== id));
  }

  function validate(): string | null {
    if (!data.fecha || Number.isNaN(new Date(data.fecha).getTime())) {
      return 'Ingresa una fecha valida.';
    }

    if (!data.glosa.trim()) {
      return 'Ingresa la glosa del gasto.';
    }

    if (!data.centro_costo_id) {
      return 'Selecciona un centro de costo.';
    }

    if (!data.tipo_documento_id) {
      return 'Selecciona un tipo de documento.';
    }

    if (!data.numero_documento.trim()) {
      return 'Ingresa el numero de documento.';
    }

    if (!data.tipo_gasto_id) {
      return 'Selecciona un tipo de gasto.';
    }

    if (!data.monto || Number(data.monto) <= 0) {
      return 'Ingresa un monto mayor a 0.';
    }

    if (adjuntos.length < 1) {
      return 'Agrega al menos 1 adjunto.';
    }

    if (adjuntos.length > MAX_ADJUNTOS) {
      return 'Cada gasto puede tener maximo 2 adjuntos.';
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);
      await onSubmit(
        data,
        adjuntos.map(({ archivo, nombre, tipo }) => ({ archivo, nombre, tipo })),
      );
    } catch {
      setFormError('No se pudo guardar el gasto. Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  }

  return {
    data,
    adjuntos,
    catalogos: {
      centrosCosto,
      tiposDocumento,
      tiposGasto,
    },
    isSaving,
    formError,
    canAddAdjuntos,
    totalAdjuntosLabel,
    updateField,
    handleFileChange,
    removeAdjunto,
    handleSubmit,
  };
}
