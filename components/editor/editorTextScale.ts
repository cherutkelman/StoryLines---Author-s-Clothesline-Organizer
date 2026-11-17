import { useEffect, useState } from 'react';

export const EDITOR_TEXT_SCALE_KEY = 'storylines.editorTextScale';
export const MIN_TEXT_SCALE = 70;
export const MAX_TEXT_SCALE = 200;
export const DEFAULT_TEXT_SCALE = 100;

export function normalizeTextScale(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_TEXT_SCALE;
  return Math.max(MIN_TEXT_SCALE, Math.min(MAX_TEXT_SCALE, Math.round(value / 10) * 10));
}

export function readTextScale(): number {
  try {
    const saved = window.localStorage.getItem(EDITOR_TEXT_SCALE_KEY);
    return saved === null || saved.trim() === '' ? DEFAULT_TEXT_SCALE : normalizeTextScale(Number(saved));
  } catch {
    return DEFAULT_TEXT_SCALE;
  }
}

export function saveTextScale(scale: number): void {
  try {
    window.localStorage.setItem(EDITOR_TEXT_SCALE_KEY, String(normalizeTextScale(scale)));
  } catch {
    // Display controls remain usable when local storage is unavailable.
  }
}

export function useEditorTextScale() {
  const [textScale, setTextScale] = useState(readTextScale);
  useEffect(() => saveTextScale(textScale), [textScale]);
  return { textScale, setTextScale: (value: number) => setTextScale(normalizeTextScale(value)) };
}
