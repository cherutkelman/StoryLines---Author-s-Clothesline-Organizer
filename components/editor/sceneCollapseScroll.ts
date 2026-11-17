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

/** Restore the closed card's visual context once, immediately after React's layout update. */
export function captureSceneCollapseAnchor(article: HTMLElement | null): (() => void) | null {
  const scroller = article?.closest<HTMLElement>('.storylines-editor-scroll');
  if (!article || !scroller) return null;
  const oldTop = article.getBoundingClientRect().top - scroller.getBoundingClientRect().top - scroller.clientTop;
  return () => {
    if (!article.isConnected || !scroller.isConnected) return;
    const viewportTop = scroller.getBoundingClientRect().top + scroller.clientTop;
    const toolbar = scroller.querySelector<HTMLElement>('[data-editor-toolbar]');
    // Keep the title below the sticky toolbar, also when the toolbar wraps on mobile.
    const inset = Math.max(0, (toolbar?.getBoundingClientRect().bottom ?? viewportTop) - viewportTop + 12);
    const minimumTop = Math.min(inset, Math.max(0, scroller.clientHeight - 48));
    const maximumTop = Math.max(minimumTop, scroller.clientHeight - Math.min(article.getBoundingClientRect().height, 48));
    const desiredTop = Math.max(minimumTop, Math.min(oldTop, maximumTop));
    const currentTop = article.getBoundingClientRect().top - viewportTop;
    // Let the browser clamp to the remaining scroll range. Do not scroll any ancestor,
    // focus another scene, or install an ongoing correction that fights manual scrolling.
    scroller.scrollTop += currentTop - desiredTop;
  };
}
