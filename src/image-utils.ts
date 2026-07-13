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

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    if (!blob) throw new Error('Image compression failed');

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
