const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_WIDTH = 1600;
const OUTPUT_TYPE = 'image/jpeg';
const OUTPUT_QUALITY = 0.75;
const COMPRESSIBLE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);

interface ImageCompressionOptions {
  maxSizeBytes?: number;
  maxWidth?: number;
  quality?: number;
}

export interface ImageCompressionResult {
  archivo: Blob;
  nombre: string;
  tipo: string;
  wasCompressed: boolean;
}

export function isCompressibleImage(file: Blob): boolean {
  return COMPRESSIBLE_IMAGE_TYPES.has(file.type);
}

export function getMaxAttachmentSizeBytes(): number {
  return MAX_ATTACHMENT_SIZE_BYTES;
}

function getCompressedName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');

  if (dotIndex <= 0) {
    return `${fileName}-comprimido.jpg`;
  }

  return `${fileName.slice(0, dotIndex)}-comprimido.jpg`;
}

function getTargetSize(width: number, height: number, maxWidth: number) {
  if (width <= maxWidth) {
    return { width, height };
  }

  const ratio = maxWidth / width;
  return {
    width: maxWidth,
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('No se pudo leer la imagen.'));
    };

    image.decoding = 'async';
    image.src = imageUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('No se pudo comprimir la imagen.'));
          return;
        }

        resolve(blob);
      },
      type,
      quality,
    );
  });
}

export async function compressImageIfNeeded(
  file: File,
  options: ImageCompressionOptions = {},
): Promise<ImageCompressionResult> {
  const maxSizeBytes = options.maxSizeBytes ?? MAX_ATTACHMENT_SIZE_BYTES;

  if (!isCompressibleImage(file) || file.size <= maxSizeBytes) {
    return {
      archivo: file,
      nombre: file.name,
      tipo: file.type,
      wasCompressed: false,
    };
  }

  const maxWidth = options.maxWidth ?? MAX_IMAGE_WIDTH;
  const quality = options.quality ?? OUTPUT_QUALITY;
  const image = await loadImage(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const targetSize = getTargetSize(sourceWidth, sourceHeight, maxWidth);
  const canvas = document.createElement('canvas');
  canvas.width = targetSize.width;
  canvas.height = targetSize.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('No se pudo preparar la compresion de la imagen.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const compressedBlob = await canvasToBlob(canvas, OUTPUT_TYPE, quality);

  if (compressedBlob.size > maxSizeBytes) {
    throw new Error(
      `La imagen "${file.name}" sigue superando 5 MB despues de comprimirla.`,
    );
  }

  return {
    archivo: compressedBlob,
    nombre: getCompressedName(file.name),
    tipo: OUTPUT_TYPE,
    wasCompressed: true,
  };
}
