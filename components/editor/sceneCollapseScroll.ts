export function getSceneExpansionChange(
  expandedSceneIds: readonly string[],
  focusedSceneId: string | null,
  sceneId: string,
) {
  const closing = expandedSceneIds.includes(sceneId);
  return {
    closing,
    expandedSceneIds: closing
      ? expandedSceneIds.filter(id => id !== sceneId)
      : [...expandedSceneIds, sceneId],
    // Closing never activates another scene, even when several remain open.
    focusedSceneId: closing ? (focusedSceneId === sceneId ? null : focusedSceneId) : sceneId,
  };
}

export function captureSceneCollapseAnchor(article: HTMLElement | null) {
  const scroller = article?.closest<HTMLElement>('.storylines-editor-scroll');
  if (!article || !scroller) return null;
  const viewportTop = () => scroller.getBoundingClientRect().top + scroller.clientTop;
  const header = () => article.querySelector<HTMLElement>('[data-editor-collapse-title]') ?? article;
  const oldTop = header().getBoundingClientRect().top - viewportTop();
  const doc = article.ownerDocument;
  const win = doc?.defaultView;
  const viewport = win?.visualViewport;
  const keyboardHeight = doc?.documentElement.classList.contains('storylines-mobile-editor-active')
    && viewport?.scale === 1 && viewport.height + 80 < doc.documentElement.clientHeight
    ? viewport.height : undefined;
  const maxScroll = () => Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  const isCollapsed = () => article.isConnected && scroller.isConnected
    && !article.querySelector('[data-editor-scene-body]');
  const restore = () => {
    const top = viewportTop();
    const title = header().getBoundingClientRect();
    const toolbar = scroller.querySelector<HTMLElement>('[data-editor-toolbar]');
    const inset = Math.max(0, (toolbar?.getBoundingClientRect().bottom ?? top) - top + 12);
    const minimumTop = Math.min(inset, Math.max(0, scroller.clientHeight - 48));
    const maximumTop = Math.max(minimumTop, scroller.clientHeight - Math.min(title.height, 48));
    const desiredTop = Math.max(minimumTop, Math.min(oldTop, maximumTop));
    const target = Math.max(0, Math.min(maxScroll(), scroller.scrollTop + title.top - top - desiredTop));
    if (Math.abs(target - scroller.scrollTop) > 1) scroller.scrollTop = target;
  };

  return () => {
    if (!isCollapsed()) return;
    restore();
    if (!win || !viewport || keyboardHeight === undefined) return;

    // Only follow a keyboard-sized viewport growing after this collapse. A changed
    // scroll position is accepted only if the new scroll range explains the clamp.
    const initialScroll = scroller.scrollTop;
    const initialHeight = scroller.clientHeight;
    const interactionEvents = ['pointerdown', 'touchmove', 'wheel', 'keydown', 'focusin', 'beforeinput'];
    let settleTimer = 0;
    let sawResize = false;
    const scrollIsOwned = () => Math.abs(scroller.scrollTop - Math.min(initialScroll, maxScroll())) <= 1;
    const cancel = () => {
      win.clearTimeout(deadline);
      win.clearTimeout(settleTimer);
      viewport.removeEventListener('resize', onResize);
      viewport.removeEventListener('scroll', schedule);
      scroller.removeEventListener('scroll', checkScroll);
      interactionEvents.forEach(event => doc.removeEventListener(event, cancel, true));
    };
    const checkScroll = () => {
      if (!scrollIsOwned()) cancel();
    };
    const schedule = () => {
      if (viewport.scale !== 1) {
        cancel();
        return;
      }
      win.clearTimeout(settleTimer);
      if (!sawResize || viewport.height <= keyboardHeight + 1) return;
      settleTimer = win.setTimeout(() => {
        cancel();
        if (isCollapsed() && scrollIsOwned() && scroller.clientHeight > initialHeight) restore();
      }, 100);
    };
    const onResize = () => {
      sawResize = true;
      schedule();
    };

    const deadline = win.setTimeout(cancel, 550);
    viewport.addEventListener('resize', onResize);
    viewport.addEventListener('scroll', schedule);
    scroller.addEventListener('scroll', checkScroll);
    interactionEvents.forEach(event => doc.addEventListener(event, cancel, { capture: true, passive: true }));
    return cancel;
  };
}
