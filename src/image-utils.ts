export type CompressedImage = {
  blob: Blob;
  dataUrl: string;
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const loadImage = (url: string, timeoutMs = 8000): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const timeoutId = window.setTimeout(() => {
      image.onload = null;
      image.onerror = null;
      reject(new Error('Image load timed out'));
    }, timeoutMs);

    image.onload = () => {
      window.clearTimeout(timeoutId);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timeoutId);
      reject(new Error('Image load failed'));
    };
    image.src = url;
  });

const canvasToJpegBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Image compression failed'));
      }
    }, 'image/jpeg', quality);
  });

export const compressImageFile = async (
  file: File,
  maxDimension = 1200,
  quality = 0.78
): Promise<CompressedImage> => {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);

    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context is unavailable');

    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToJpegBlob(canvas, quality);

    return {
      blob,
      dataUrl: await blobToDataUrl(blob),
    };
  } catch (error) {
    console.warn('Image compression failed; using original file fallback.', error);
    return {
      blob: file,
      dataUrl: await blobToDataUrl(file),
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const compressImageBlobToLimit = async (
  source: Blob,
  maxDataUrlLength = 120000
): Promise<CompressedImage> => {
  const objectUrl = URL.createObjectURL(source);

  try {
    const image = await loadImage(objectUrl);
    const dimensions = [760, 640, 520, 420, 340, 280];
    const qualities = [0.62, 0.52, 0.44, 0.36, 0.3];
    let smallest: CompressedImage | null = null;

    for (const maxDimension of dimensions) {
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas 2D context is unavailable');

      context.drawImage(image, 0, 0, width, height);

      for (const quality of qualities) {
        const blob = await canvasToJpegBlob(canvas, quality);
        const dataUrl = await blobToDataUrl(blob);
        const compressed = { blob, dataUrl };

        if (!smallest || dataUrl.length < smallest.dataUrl.length) {
          smallest = compressed;
        }

        if (dataUrl.length <= maxDataUrlLength) {
          return compressed;
        }
      }
    }

    if (smallest) return smallest;
    throw new Error('Image compression did not produce an output');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const compressImageFileToLimit = (
  file: File,
  maxDataUrlLength = 120000
): Promise<CompressedImage> => compressImageBlobToLimit(file, maxDataUrlLength);

export const compressDataUrlToLimit = async (
  dataUrl: string,
  maxDataUrlLength = 120000
): Promise<string> => {
  if (!dataUrl.startsWith('data:image/') || dataUrl.length <= maxDataUrlLength) {
    return dataUrl;
  }

  try {
    const blob = await fetch(dataUrl).then(response => response.blob());
    const compressed = await compressImageBlobToLimit(blob, maxDataUrlLength);
    return compressed.dataUrl.length < dataUrl.length ? compressed.dataUrl : dataUrl;
  } catch (error) {
    console.warn('Existing gallery image recompression failed.', error);
    return dataUrl;
  }
};
