import { afterEach, describe, expect, it, vi } from 'vitest';
import { EDITOR_TEXT_SCALE_KEY, normalizeTextScale, readTextScale, saveTextScale } from './editorTextScale';

afterEach(() => vi.unstubAllGlobals());

describe('editor text display preference', () => {
  it('uses 100% by default and tolerates unavailable storage', () => {
    vi.stubGlobal('window', { get localStorage() { throw new Error('blocked'); } });
    expect(readTextScale()).toBe(100);
    expect(() => saveTextScale(150)).not.toThrow();
  });

  it('clamps the range and rounds to 10% steps', () => {
    expect(normalizeTextScale(60)).toBe(70);
    expect(normalizeTextScale(210)).toBe(200);
    expect(normalizeTextScale(124)).toBe(120);
    expect(normalizeTextScale(126)).toBe(130);
    expect(normalizeTextScale(NaN)).toBe(100);
    expect(normalizeTextScale(Infinity)).toBe(100);
  });

  it('persists and reloads using one key shared across books, including reset', () => {
    const data = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    } });
    expect(readTextScale()).toBe(100);
    saveTextScale(160);
    expect(readTextScale()).toBe(160);
    expect([...data.keys()]).toEqual([EDITOR_TEXT_SCALE_KEY]);
    saveTextScale(100);
    expect(readTextScale()).toBe(100);
    for (const invalid of ['', ' ', 'not-a-number', 'Infinity']) {
      data.set(EDITOR_TEXT_SCALE_KEY, invalid);
      expect(readTextScale()).toBe(100);
    }
  });
});
