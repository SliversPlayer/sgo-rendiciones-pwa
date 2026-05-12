export const MAX_ADJUNTOS_PER_GASTO = 2;
export const PDF_MIME_TYPE = 'application/pdf';
export const PDF_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const PDF_MAX_SIZE_LABEL = '5 MB';

export function validatePdfSize(file: Blob, fileName: string): void {
  if (file.size > PDF_MAX_SIZE_BYTES) {
    throw new Error(
      `El PDF "${fileName}" supera el limite de ${PDF_MAX_SIZE_LABEL} por archivo.`,
    );
  }
}
