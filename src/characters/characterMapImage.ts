import { compressImageFile } from '../image-utils';
import { isElectron, openDesktopImageDialog } from '../platform';

export async function readCharacterMapImage(input?: HTMLInputElement): Promise<string | undefined> {
  if (isElectron) return (await openDesktopImageDialog()) || undefined;
  if (!input) return undefined;
  const file = input.files?.[0];
  if (!file) return undefined;
  try {
    return (await compressImageFile(file, 900, 0.76)).dataUrl;
  } finally {
    input.value = '';
  }
}
