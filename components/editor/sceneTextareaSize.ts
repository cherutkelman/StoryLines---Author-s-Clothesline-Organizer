/** Re-measure after wrapping/font changes without touching text, focus or selection. */
export function resizeSceneTextarea(textarea: HTMLTextAreaElement, minRows: number): void {
  const lineHeight = Number.parseFloat(window.getComputedStyle(textarea).lineHeight);
  textarea.style.height = 'auto';
  const minimumHeight = minRows * (Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : 28);
  textarea.style.height = `${Math.ceil(Math.max(textarea.scrollHeight, minimumHeight))}px`;
}