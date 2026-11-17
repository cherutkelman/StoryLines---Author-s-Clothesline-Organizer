import { afterEach, describe, expect, it, vi } from 'vitest';
import { resizeSceneTextarea } from './sceneTextareaSize';

afterEach(() => vi.unstubAllGlobals());

describe('textarea font-size reflow', () => {
  it('grows and shrinks to the newly wrapped content and preserves text and selection', () => {
    let lineHeight = 29.25;
    let wrappedLines = 10;
    const style = { height: '100px' };
    const textarea = {
      style, value: 'טקסט ארוך בעברית '.repeat(100), selectionStart: 25, selectionEnd: 50,
      selectionDirection: 'backward', focus: vi.fn(), setSelectionRange: vi.fn(),
      get scrollHeight() { expect(style.height).toBe('auto'); return Math.ceil(lineHeight * wrappedLines); },
    };
    const before = { value: textarea.value, from: textarea.selectionStart, to: textarea.selectionEnd };
    vi.stubGlobal('window', { getComputedStyle: () => ({ lineHeight: `${lineHeight}px` }) });
    resizeSceneTextarea(textarea as unknown as HTMLTextAreaElement, 5);
    expect(style.height).toBe('293px');
    lineHeight = 58.5; wrappedLines = 20;
    resizeSceneTextarea(textarea as unknown as HTMLTextAreaElement, 5);
    expect(style.height).toBe('1170px');
    lineHeight = 20.475; wrappedLines = 7;
    resizeSceneTextarea(textarea as unknown as HTMLTextAreaElement, 5);
    expect(style.height).toBe('144px');
    expect(textarea.value).toBe(before.value);
    expect([textarea.selectionStart, textarea.selectionEnd, textarea.selectionDirection]).toEqual([before.from, before.to, 'backward']);
    expect(textarea.focus).not.toHaveBeenCalled();
    expect(textarea.setSelectionRange).not.toHaveBeenCalled();
  });

  it('sizes an empty scene using the scaled line height without clipping fractional pixels', () => {
    vi.stubGlobal('window', { getComputedStyle: () => ({ lineHeight: '58.5px' }) });
    const textarea = { style: { height: 'auto' }, scrollHeight: 59 };
    resizeSceneTextarea(textarea as unknown as HTMLTextAreaElement, 5);
    expect(textarea.style.height).toBe('293px');
  });

  it('retains a safe minimum if computed line height is unavailable', () => {
    vi.stubGlobal('window', { getComputedStyle: () => ({ lineHeight: 'normal' }) });
    const textarea = { style: { height: 'auto' }, scrollHeight: 0 };
    resizeSceneTextarea(textarea as unknown as HTMLTextAreaElement, 5);
    expect(textarea.style.height).toBe('140px');
  });
});