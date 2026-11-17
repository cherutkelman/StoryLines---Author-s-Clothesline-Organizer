import { useLayoutEffect } from 'react';
import './mobileEditorViewport.css';

// Match the app's mobile layout, without changing narrow desktop windows.
const MOBILE_EDITOR_QUERY = '(max-width: 1023px) and (pointer: coarse)';
const ACTIVE_CLASS = 'storylines-mobile-editor-active';

export function bindMobileEditorViewport(win: Window): () => void {
  const media = win.matchMedia(MOBILE_EDITOR_QUERY);
  const root = win.document.documentElement;
  const viewport = win.visualViewport;
  const properties = ['--sl-editor-viewport-height', '--sl-editor-viewport-top'];
  const previous = properties.map(name => [root.style.getPropertyValue(name), root.style.getPropertyPriority(name)]);
  const hadClass = root.classList.contains(ACTIVE_CLASS);
  let frame: number | null = null;

  const restore = () => {
    root.classList.toggle(ACTIVE_CLASS, hadClass);
    properties.forEach((name, index) => {
      const [value, priority] = previous[index];
      if (value) root.style.setProperty(name, value, priority);
      else root.style.removeProperty(name);
    });
  };
  const update = () => {
    frame = null;
    if (!media.matches) {
      restore();
      return;
    }
    root.classList.add(ACTIVE_CLASS);
    // offsetTop follows keyboard-induced viewport panning as well as resizing.
    // No focus, selection or scroll writes: the textarea retains its existing caret handling.
    root.style.setProperty(properties[0], `${viewport?.height ?? win.innerHeight}px`);
    root.style.setProperty(properties[1], `${viewport?.offsetTop ?? 0}px`);
  };
  const schedule = () => {
    if (frame === null) frame = win.requestAnimationFrame(update);
  };
  update();
  media.addEventListener('change', schedule);
  win.addEventListener('resize', schedule);
  viewport?.addEventListener('resize', schedule);
  viewport?.addEventListener('scroll', schedule);
  return () => {
    if (frame !== null) win.cancelAnimationFrame(frame);
    media.removeEventListener('change', schedule);
    win.removeEventListener('resize', schedule);
    viewport?.removeEventListener('resize', schedule);
    viewport?.removeEventListener('scroll', schedule);
    restore();
  };
}

export function useMobileEditorViewport(enabled: boolean): void {
  useLayoutEffect(() => {
    if (enabled) return bindMobileEditorViewport(window);
  }, [enabled]);
}
