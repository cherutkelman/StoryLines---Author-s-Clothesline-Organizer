import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureSceneCollapseAnchor, getSceneExpansionChange } from './sceneCollapseScroll';

// Layout harness: content positions are independent of scrollTop; writes clamp as in a browser.
function layout({ viewportHeight = 600, toolbarHeight = 80, articleTop = 2000, scrollTop = 1900, keyboard = false } = {}) {
  let scroll = scrollTop;
  let maximumScroll = 12000;
  const viewportTop = 60;
  let expanded = true;
  let titleOffset = 0;
  const viewport = Object.assign(new EventTarget(), { height: viewportHeight, scale: 1 });
  const doc = Object.assign(new EventTarget(), {
    documentElement: { classList: { contains: () => keyboard }, clientHeight: 800 },
    defaultView: { visualViewport: viewport, setTimeout, clearTimeout },
  });
  const scroller = Object.assign(new EventTarget(), {
    isConnected: true,
    clientTop: 0,
    clientHeight: viewportHeight,
    getBoundingClientRect: () => ({ top: viewportTop }),
    querySelector: () => ({ getBoundingClientRect: () => ({ bottom: viewportTop + toolbarHeight }) }),
  });
  Object.defineProperties(scroller, {
    scrollHeight: { get: () => maximumScroll + scroller.clientHeight },
    scrollTop: { get: () => scroll, set: (value: number) => { scroll = Math.max(0, Math.min(maximumScroll, value)); } },
  });
  const titleRect = () => ({ top: viewportTop + articleTop - scroll + titleOffset, height: 48 });
  const article = {
    isConnected: true,
    ownerDocument: doc,
    closest: () => scroller,
    querySelector: (selector: string) => selector === '[data-editor-collapse-title]'
      ? { getBoundingClientRect: titleRect } : expanded ? {} : null,
  };
  return {
    scroller: scroller as typeof scroller & { scrollTop: number }, article, doc, viewport,
    capture: () => captureSceneCollapseAnchor(article as unknown as HTMLElement)!,
    collapse: (max = maximumScroll) => {
      expanded = false;
      maximumScroll = max;
      scroll = Math.min(scroll, max);
    },
    reopen: () => { expanded = true; },
    moveScroll: (value: number) => { scroll = value; scroller.dispatchEvent(new Event('scroll')); },
    resize: (height: number, offset: number, max = maximumScroll) => {
      scroller.clientHeight = viewport.height = height;
      titleOffset = offset;
      maximumScroll = max;
      scroll = Math.min(scroll, max);
      viewport.dispatchEvent(new Event('resize'));
      scroller.dispatchEvent(new Event('scroll'));
    },
    relativeTop: () => titleRect().top - viewportTop,
  };
}

afterEach(() => vi.useRealTimers());

describe('scene collapse focus policy', () => {
  it('closes the active scene without activating the last remaining open scene', () => {
    expect(getSceneExpansionChange(['first', 'last', 'active'], 'active', 'active')).toEqual({
      closing: true, expandedSceneIds: ['first', 'last'], focusedSceneId: null,
    });
  });
  it('leaves no active scene when closing the only open scene', () => {
    expect(getSceneExpansionChange(['only'], 'only', 'only')).toEqual({
      closing: true, expandedSceneIds: [], focusedSceneId: null,
    });
  });
  it('does not change focus when closing an inactive scene', () => {
    expect(getSceneExpansionChange(['first', 'active', 'last'], 'active', 'first').focusedSceneId).toBe('active');
  });
  it('still opens and activates an explicitly selected collapsed scene', () => {
    expect(getSceneExpansionChange(['first'], 'first', 'next')).toEqual({
      closing: false, expandedSceneIds: ['first', 'next'], focusedSceneId: 'next',
    });
  });
});

describe('scene collapse visual anchor', () => {
  it.each([
    ['desktop', 600, 80, 100],
    ['mobile with wrapped toolbar', 400, 150, 180],
    ['mobile with keyboard', 240, 100, 120],
  ])('keeps a long scene header in place after collapse on %s', (_name, viewportHeight, toolbarHeight, oldTop) => {
    const h = layout({ viewportHeight, toolbarHeight, scrollTop: 2000 - oldTop });
    const restore = h.capture();
    h.collapse();
    // Simulate a browser scroll-anchor adjustment toward later content during layout.
    h.moveScroll(1000);
    restore();
    expect(h.relativeTop()).toBe(oldTop);
    h.moveScroll(900);
    expect(h.scroller.scrollTop).toBe(900); // No persistent scroll interception.
  });
  it('reveals the closed header if the old header was above the viewport', () => {
    const h = layout({ scrollTop: 4000 });
    const restore = h.capture();
    h.collapse();
    restore();
    expect(h.relativeTop()).toBe(92);
  });
  it('keeps the last closed scene visible when the new scroll range clamps the old position', () => {
    const h = layout();
    const restore = h.capture();
    h.collapse(1550);
    restore();
    expect(h.scroller.scrollTop).toBe(1550);
    expect(h.relativeTop()).toBe(450);
    expect(h.relativeTop()).toBeLessThan(h.scroller.clientHeight);
  });
  it('does nothing when the scene has unmounted or no editor scroller exists', () => {
    expect(captureSceneCollapseAnchor(null)).toBeNull();
    const h = layout();
    const restore = h.capture();
    h.article.isConnected = false;
    h.moveScroll(1000);
    restore();
    expect(h.scroller.scrollTop).toBe(1000);
    expect(captureSceneCollapseAnchor({ closest: () => null } as unknown as HTMLElement)).toBeNull();
  });
  it('handles enlarged text and tiny viewports without producing a negative scroll target', () => {
    const h = layout({ viewportHeight: 100, toolbarHeight: 150, articleTop: 0, scrollTop: 0 });
    const restore = h.capture();
    h.collapse(0);
    restore();
    expect(h.scroller.scrollTop).toBe(0);
  });

  function collapseWithKeyboard() {
    vi.useFakeTimers();
    const h = layout({ viewportHeight: 320, keyboard: true });
    const restore = h.capture();
    h.collapse();
    return { ...h, cancel: restore() };
  }

  it('corrects once after keyboard dismissal settles, including a changed scroll limit', () => {
    const h = collapseWithKeyboard();
    h.resize(450, -15);
    vi.advanceTimersByTime(70);
    h.resize(700, -40, 1890);
    vi.advanceTimersByTime(99);
    expect(h.scroller.scrollTop).toBe(1890);
    vi.advanceTimersByTime(1);
    expect(h.relativeTop()).toBe(100);
    h.resize(750, -50);
    vi.advanceTimersByTime(550);
    expect(h.relativeTop()).toBe(90);
  });

  it.each(['touchmove', 'wheel', 'pointerdown', 'keydown', 'focusin', 'beforeinput'])(
    'cancels a pending correction on %s', event => {
      const h = collapseWithKeyboard();
      h.resize(700, -40);
      h.doc.dispatchEvent(new Event(event));
      vi.advanceTimersByTime(550);
      expect(h.scroller.scrollTop).toBe(1900);
    },
  );

  it('preserves scrolling not explained by the new scroll range', () => {
    const h = collapseWithKeyboard();
    h.resize(700, -40);
    h.moveScroll(1700);
    vi.advanceTimersByTime(550);
    expect(h.scroller.scrollTop).toBe(1700);
  });

  it.each(['navigation', 'another collapse', 'reopening', 'removal'])(
    'skips the pending correction after %s', reason => {
      const h = collapseWithKeyboard();
      h.resize(700, -40);
      if (reason === 'reopening') h.reopen();
      else if (reason === 'removal') h.article.isConnected = false;
      else h.cancel?.();
      vi.advanceTimersByTime(550);
      expect(h.scroller.scrollTop).toBe(1900);
    },
  );

  it('ignores viewport panning alone and a resize after the deadline', () => {
    const h = collapseWithKeyboard();
    h.viewport.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(550);
    h.resize(700, -40);
    vi.advanceTimersByTime(550);
    expect(h.scroller.scrollTop).toBe(1900);
  });
});
