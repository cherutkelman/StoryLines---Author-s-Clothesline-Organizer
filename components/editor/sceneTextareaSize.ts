/** Re-measure after wrapping/font changes without touching text, focus or selection. */
export function resizeSceneTextarea(textarea: HTMLTextAreaElement, minRows: number): void {
  const parent = textarea.parentElement;
  if (!parent) return;
  const computed = textarea.ownerDocument.defaultView?.getComputedStyle(textarea);
  if (!computed) return;

  // Measure at the current width without temporarily shrinking the focused field.
  const probe = textarea.cloneNode(false) as HTMLTextAreaElement;
  probe.removeAttribute('id');
  probe.removeAttribute('name');
  probe.removeAttribute('autofocus');
  probe.setAttribute('aria-hidden', 'true');
  probe.tabIndex = -1;
  probe.value = textarea.value;
  Object.assign(probe.style, {
    position: 'fixed',
    inset: '0 auto auto 0',
    visibility: 'hidden',
    pointerEvents: 'none',
    height: 'auto',
    width: computed.width,
  });
  parent.appendChild(probe);

  const lineHeight = Number.parseFloat(computed.lineHeight);
  const minimumHeight = minRows * (Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : 28);
  const height = `${Math.ceil(Math.max(probe.scrollHeight, minimumHeight))}px`;
  probe.remove();
  if (textarea.style.height !== height) textarea.style.height = height;
}
