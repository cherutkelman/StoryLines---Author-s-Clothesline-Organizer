import { describe, expect, it, vi } from 'vitest';
import { bindMobileEditorViewport } from './mobileEditorViewport';

function harness(mobile = true, withViewport = true) {
  const media = Object.assign(new EventTarget(), { matches: mobile });
  const viewport = Object.assign(new EventTarget(), { height: 800, offsetTop: 0 });
  const styles = new Map<string, string>();
  const classes = new Set<string>();
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  const win = Object.assign(new EventTarget(), {
    innerHeight: 760,
    visualViewport: withViewport ? viewport : null,
    matchMedia: vi.fn(() => media),
    requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
      frames.set(++id, callback);
      return id;
    }),
    cancelAnimationFrame: vi.fn((frame: number) => frames.delete(frame)),
    document: { documentElement: {
      style: {
        getPropertyValue: (name: string) => styles.get(name) ?? '',
        getPropertyPriority: () => '',
        setProperty: (name: string, value: string) => styles.set(name, value),
        removeProperty: (name: string) => styles.delete(name),
      },
      classList: {
        contains: (name: string) => classes.has(name),
        add: (name: string) => classes.add(name),
        toggle: (name: string, active: boolean) => active ? classes.add(name) : classes.delete(name),
      },
    } },
  });
  const flush = () => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(callback => callback(0));
  };
  return { win, media, viewport, styles, classes, frames, flush,
    bind: () => bindMobileEditorViewport(win as unknown as Window) };
}

const height = '--sl-editor-viewport-height';
const top = '--sl-editor-viewport-top';

describe('mobile editor viewport lifecycle', () => {
  it('tracks keyboard opening, panning and closing without React state updates', () => {
    const h = harness();
    const dispose = h.bind();
    expect(h.styles.get(height)).toBe('800px');
    h.viewport.height = 410;
    h.viewport.offsetTop = 48;
    h.viewport.dispatchEvent(new Event('resize'));
    h.viewport.dispatchEvent(new Event('scroll'));
    expect(h.frames.size).toBe(1);
    h.flush();
    expect(h.styles.get(height)).toBe('410px');
    expect(h.styles.get(top)).toBe('48px');
    h.viewport.height = 800;
    h.viewport.offsetTop = 0;
    h.viewport.dispatchEvent(new Event('resize'));
    h.flush();
    expect(h.styles.get(height)).toBe('800px');
    expect(h.styles.get(top)).toBe('0px');
    dispose();
  });

  it('leaves desktop untouched and restores layout when leaving the mobile breakpoint', () => {
    const h = harness(false);
    const dispose = h.bind();
    expect(h.classes.size).toBe(0);
    expect(h.styles.size).toBe(0);
    h.media.matches = true;
    h.media.dispatchEvent(new Event('change'));
    h.flush();
    expect(h.classes.size).toBe(1);
    h.media.matches = false;
    h.media.dispatchEvent(new Event('change'));
    h.flush();
    expect(h.classes.size).toBe(0);
    expect(h.styles.size).toBe(0);
    dispose();
  });

  it('falls back to window height without VisualViewport and handles rotation', () => {
    const h = harness(true, false);
    const dispose = h.bind();
    expect(h.styles.get(height)).toBe('760px');
    h.win.innerHeight = 380;
    h.win.dispatchEvent(new Event('resize'));
    h.flush();
    expect(h.styles.get(height)).toBe('380px');
    expect(h.styles.get(top)).toBe('0px');
    dispose();
  });

  it('restores previous styles and removes listeners and queued work on editor exit', () => {
    const h = harness();
    h.styles.set(height, '123px');
    const dispose = h.bind();
    h.viewport.dispatchEvent(new Event('resize'));
    dispose();
    expect(h.frames.size).toBe(0);
    expect(h.classes.size).toBe(0);
    expect(h.styles.get(height)).toBe('123px');
    expect(h.styles.has(top)).toBe(false);
    h.viewport.dispatchEvent(new Event('resize'));
    h.viewport.dispatchEvent(new Event('scroll'));
    h.win.dispatchEvent(new Event('resize'));
    h.media.dispatchEvent(new Event('change'));
    expect(h.frames.size).toBe(0);
  });
});

describe('production textarea compatibility', () => {
  it('does not move the caret, selection or scroll while the keyboard viewport changes', () => {
    const h = harness();
    const textarea = { value: 'טקסט בעברית לקריאה וכתיבה', selectionStart: 4, selectionEnd: 10, scrollTop: 120, focus: vi.fn() };
    const scrollTo = vi.fn();
    const scrollBy = vi.fn();
    Object.assign(h.win, { scrollY: 200, scrollTo, scrollBy });
    Object.assign(h.win.document, { activeElement: textarea });
    const dispose = h.bind();
    h.viewport.height = 320;
    h.viewport.offsetTop = 40;
    h.viewport.dispatchEvent(new Event('resize'));
    h.viewport.dispatchEvent(new Event('scroll'));
    h.flush();
    expect(textarea).toMatchObject({ value: 'טקסט בעברית לקריאה וכתיבה', selectionStart: 4, selectionEnd: 10, scrollTop: 120 });
    expect(textarea.focus).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
    expect(scrollBy).not.toHaveBeenCalled();
    expect(h.styles.get(height)).toBe('320px');
    expect(h.win.matchMedia).toHaveBeenCalledWith('(max-width: 1023px) and (pointer: coarse)');
    dispose();
  });
});