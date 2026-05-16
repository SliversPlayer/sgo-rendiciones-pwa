import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { useGastoCatalogos } from './useCatalogos';
import type { AdjuntoInput, GastoConAdjuntos, GastoFormData } from '../types/gasto';
import {
  compressImageIfNeeded,
  isCompressibleImage,
} from '../utils/imageCompression';
import {
  MAX_ADJUNTOS_PER_GASTO,
  PDF_MIME_TYPE,
  validatePdfSize,
} from '../utils/attachmentValidation';
import { createId } from '../utils/id';

const MAX_ADJUNTOS = MAX_ADJUNTOS_PER_GASTO;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', PDF_MIME_TYPE];

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
      centro_negocio_id: '',
      tipo_documento_id: '',
      numero_documento: '',
      tipo_gasto_id: '',
      monto: '',
    };
  }

  return {
    fecha: formatInputDate(initialGasto.gasto.fecha),
    glosa: initialGasto.gasto.glosa,
    centro_negocio_id:
      initialGasto.gasto.centro_negocio_id ?? initialGasto.gasto.centro_costo_id ?? '',
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
  const {
    catalogos,
    isLoading: isCatalogosLoading,
    error: catalogosError,
  } = useGastoCatalogos();
  const [data, setData] = useState<GastoFormData>(() => getInitialData(initialGasto));
  const [adjuntos, setAdjuntos] = useState<AdjuntoDraft[]>(() =>
    getInitialAdjuntos(initialGasto),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const remainingAdjuntos = MAX_ADJUNTOS - adjuntos.length;
  const canAddAdjuntos = remainingAdjuntos > 0 && !isProcessingFiles;

  const totalAdjuntosLabel = useMemo(
    () => `${adjuntos.length}/${MAX_ADJUNTOS} adjuntos`,
    [adjuntos.length],
  );

  function updateField(field: keyof GastoFormData, value: string) {
    setData((current) => ({ ...current, [field]: value }));
  }

  async function buildAdjuntoDraft(file: File): Promise<AdjuntoDraft> {
    if (file.type === PDF_MIME_TYPE) {
      validatePdfSize(file, file.name);

      return {
        id: createId(),
        archivo: file,
        nombre: file.name,
        tipo: file.type,
        size: file.size,
      };
    }

    if (isCompressibleImage(file)) {
      const compressed = await compressImageIfNeeded(file);

      return {
        id: createId(),
        archivo: compressed.archivo,
        nombre: compressed.nombre,
        tipo: compressed.tipo,
        size: compressed.archivo.size,
      };
    }

    throw new Error('Solo se permiten imagenes JPEG, PNG o archivos PDF.');
  }

  async function addFiles(selectedFiles: File[]) {
    if (selectedFiles.length === 0) {
      return;
    }

    if (isProcessingFiles) {
      return;
    }

    if (selectedFiles.length > remainingAdjuntos) {
      setFormError('Cada gasto puede tener maximo 2 adjuntos.');
      return;
    }

    const invalidType = selectedFiles.find((file) => !ALLOWED_TYPES.includes(file.type));
    if (invalidType) {
      setFormError('Solo se permiten imagenes JPEG, PNG o archivos PDF.');
      return;
    }

    try {
      setIsProcessingFiles(true);
      setFormError(null);
      const processedFiles = await Promise.all(selectedFiles.map(buildAdjuntoDraft));
      setAdjuntos((current) => [...current, ...processedFiles]);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'No se pudo preparar el adjunto. Intenta nuevamente.',
      );
    } finally {
      setIsProcessingFiles(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = event.currentTarget.files
      ? Array.from(event.currentTarget.files)
      : [];
    event.currentTarget.value = '';
    void addFiles(selectedFiles);
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

    if (isCatalogosLoading) {
      return 'Espera a que se carguen los catalogos locales.';
    }

    if (catalogosError) {
      return catalogosError;
    }

    if (!data.centro_negocio_id) {
      return 'Selecciona un centro de negocio.';
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

    if (isProcessingFiles) {
      return 'Espera a que termine la compresion de los adjuntos.';
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
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el gasto. Intenta nuevamente.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return {
    data,
    adjuntos,
    catalogos: {
      ...catalogos,
    },
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
  };
}
