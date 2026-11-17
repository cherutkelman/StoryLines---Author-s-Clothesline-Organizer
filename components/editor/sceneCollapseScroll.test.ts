import { describe, expect, it } from 'vitest';
import { captureSceneCollapseAnchor, getSceneExpansionChange } from './sceneCollapseScroll';

// Layout harness: content positions are independent of scrollTop; writes clamp as in a browser.
function layout({ viewportHeight = 600, toolbarHeight = 80, articleTop = 2000, scrollTop = 1900 } = {}) {
  let scroll = scrollTop;
  let maximumScroll = 12000;
  let articleHeight = 8000;
  const viewportTop = 60;
  const scroller = {
    isConnected: true,
    clientTop: 0,
    clientHeight: viewportHeight,
    get scrollTop() { return scroll; },
    set scrollTop(value: number) { scroll = Math.max(0, Math.min(maximumScroll, value)); },
    getBoundingClientRect: () => ({ top: viewportTop }),
    querySelector: () => ({ getBoundingClientRect: () => ({ bottom: viewportTop + toolbarHeight }) }),
  };
  const article = {
    isConnected: true,
    closest: () => scroller,
    getBoundingClientRect: () => ({ top: viewportTop + articleTop - scroll, height: articleHeight }),
  };
  return {
    scroller, article,
    capture: () => captureSceneCollapseAnchor(article as unknown as HTMLElement)!,
    collapse: (max = maximumScroll) => {
      articleHeight = 90;
      maximumScroll = max;
      scroller.scrollTop = scroll;
    },
    moveScroll: (value: number) => { scroller.scrollTop = value; },
    relativeTop: () => article.getBoundingClientRect().top - viewportTop,
  };
}

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
});
