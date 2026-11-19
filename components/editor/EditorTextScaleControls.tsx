import React from 'react';
import { DEFAULT_TEXT_SCALE, MIN_TEXT_SCALE, MAX_TEXT_SCALE } from './editorTextScale';

interface Props {
  textScale: number;
  onTextScaleChange: (scale: number) => void;
}

export default function EditorTextScaleControls({ textScale, onTextScaleChange }: Props) {
  const buttonClass = 'min-h-11 min-w-11 rounded-md px-2 enabled:hover:bg-[var(--theme-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--theme-primary)] disabled:cursor-not-allowed disabled:opacity-75';
  return <div role="group" aria-label="גודל תצוגת גוף הטקסט" dir="ltr"
    className="flex max-w-full flex-wrap items-center justify-center gap-1 rounded-lg border border-[var(--theme-primary)]/50 bg-[var(--theme-bg)] p-1 text-sm text-[var(--theme-primary)]"
    onMouseDown={event => { if (event.button === 0) event.preventDefault(); }}>
    <button type="button" aria-label="הקטנת גודל הטקסט" disabled={textScale <= MIN_TEXT_SCALE}
      onClick={() => onTextScaleChange(textScale - 10)} className={buttonClass}>A−</button>
    <output aria-label="גודל הטקסט הנוכחי" aria-live="polite" className="min-w-12 text-center tabular-nums">{textScale}%</output>
    <button type="button" aria-label="הגדלת גודל הטקסט" disabled={textScale >= MAX_TEXT_SCALE}
      onClick={() => onTextScaleChange(textScale + 10)} className={buttonClass}>A+</button>
    <button type="button" aria-label="איפוס גודל הטקסט ל־100%"
      onClick={() => onTextScaleChange(DEFAULT_TEXT_SCALE)} className={buttonClass}>איפוס</button>
  </div>;
}
