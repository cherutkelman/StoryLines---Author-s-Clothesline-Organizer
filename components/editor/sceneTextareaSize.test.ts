import { describe, expect, it, vi } from 'vitest';
import { resizeSceneTextarea } from './sceneTextareaSize';

function fixture(lineHeight = '29.25px', initialScrollHeight = 293) {
  let scrollHeight = initialScrollHeight;
  let height = '100px';
  const heightWrites = vi.fn();
  const native = {
    value: 'טקסט ארוך בעברית '.repeat(100),
    selectionStart: 25,
    selectionEnd: 50,
    selectionDirection: 'backward',
    scrollTop: 19,
    focus: vi.fn(),
    setSelectionRange: vi.fn(),
  };
  const textarea = {
    ...native,
    style: {
      get height() { return height; },
      set height(value: string) { heightWrites(value); height = value; },
    },
    ownerDocument: { defaultView: { getComputedStyle: () => ({ lineHeight, width: '240.5px' }) } },
    parentElement: {
      appendChild: vi.fn((probe: { style: { height: string; width: string } }) => {
        expect(probe.style.height).toBe('auto');
        expect(probe.style.width).toBe('240.5px');
      }),
    },
    cloneNode: vi.fn(() => ({
      style: {},
      removeAttribute: vi.fn(),
      setAttribute: vi.fn(),
      remove: vi.fn(),
      get scrollHeight() { return scrollHeight; },
      value: '',
    })),
  };
  const measure = () => resizeSceneTextarea(textarea as unknown as HTMLTextAreaElement, 5);
  return { textarea, measure, heightWrites, setScrollHeight: (value: number) => { scrollHeight = value; } };
}

describe('textarea sizing during native edits', () => {
  it('grows, shrinks and skips writing the visible height when it already matches', () => {
    const { textarea, measure, heightWrites, setScrollHeight } = fixture();
    measure();
    measure();
    setScrollHeight(1170);
    measure();
    setScrollHeight(144);
    measure();

    expect(heightWrites.mock.calls).toEqual([['293px'], ['1170px'], ['147px']]);
    for (const result of textarea.cloneNode.mock.results) {
      expect(result.value.remove).toHaveBeenCalledOnce();
    }
  });

  it.each([
    ['regular typing', 'שלום א', 6],
    ['keyboard suggestion or autocorrect', 'שלום עולם', 9],
    ['Backspace', 'שלו', 3],
    ['deleting a selected range', 'שלום.', 4],
    ['composition update', 'ש', 1],
  ] as const)('keeps the native value, caret and scroll position after %s', (_action, value, caret) => {
    const { textarea, measure } = fixture();
    textarea.value = value;
    textarea.selectionStart = caret;
    textarea.selectionEnd = caret;
    textarea.scrollTop = 37;
    measure();

    expect(textarea.value).toBe(value);
    expect(textarea.cloneNode.mock.results[0].value.value).toBe(value);
    expect([textarea.selectionStart, textarea.selectionEnd, textarea.scrollTop]).toEqual([caret, caret, 37]);
    expect(textarea.setSelectionRange).not.toHaveBeenCalled();
    expect(textarea.focus).not.toHaveBeenCalled();
  });

  it('leaves the latest selection and user scroll alone across successive edits and detachment', () => {
    const { textarea, measure, heightWrites } = fixture();
    measure();
    textarea.selectionStart = 9;
    textarea.selectionEnd = 12;
    textarea.scrollTop = 85;
    textarea.value = 'עברית ועריכה';
    measure();
    Object.assign(textarea, { parentElement: null });
    measure();
    expect([textarea.selectionStart, textarea.selectionEnd, textarea.selectionDirection, textarea.scrollTop])
      .toEqual([9, 12, 'backward', 85]);
    expect(heightWrites).toHaveBeenCalledOnce();
    expect(textarea.cloneNode).toHaveBeenCalledTimes(2);
  });

  it('keeps a scaled minimum with fractional line heights', () => {
    const { textarea, measure } = fixture('58.5px', 59);
    measure();
    expect(textarea.style.height).toBe('293px');
  });

  it('retains a safe minimum if computed line height is unavailable', () => {
    const { textarea, measure } = fixture('normal', 0);
    measure();
    expect(textarea.style.height).toBe('140px');
  });
});
