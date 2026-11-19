import { describe, expect, it, vi } from 'vitest';
import { compressImageFile } from '../image-utils';
import { openDesktopImageDialog } from '../platform';
import { readCharacterMapImage } from './characterMapImage';

const platform = vi.hoisted(() => ({ desktop: false }));
vi.mock('../platform', () => ({
  get isElectron() { return platform.desktop; },
  openDesktopImageDialog: vi.fn(),
}));
vi.mock('../image-utils', () => ({ compressImageFile: vi.fn() }));

describe('shared character image loader', () => {
  it('compresses a browser file using the existing settings and resets the input', async () => {
    const file = new File(['photo'], 'photo.png');
    const input = { files: [file], value: 'photo.png' } as unknown as HTMLInputElement;
    vi.mocked(compressImageFile).mockResolvedValue({ dataUrl: 'data:image/jpeg;base64,test', blob: new Blob() });
    expect(await readCharacterMapImage(input)).toBe('data:image/jpeg;base64,test');
    expect(compressImageFile).toHaveBeenCalledWith(file, 900, 0.76);
    expect(input.value).toBe('');
    vi.mocked(compressImageFile).mockRejectedValueOnce(new Error('decode'));
    input.value = 'photo.png';
    await expect(readCharacterMapImage(input)).rejects.toThrow('decode');
    expect(input.value).toBe('');
  });

  it('uses the original desktop dialog when running in Electron', async () => {
    platform.desktop = true;
    try {
      vi.mocked(openDesktopImageDialog).mockResolvedValueOnce('desktop-image');
      expect(await readCharacterMapImage()).toBe('desktop-image');
    } finally {
      platform.desktop = false;
    }
  });
});
