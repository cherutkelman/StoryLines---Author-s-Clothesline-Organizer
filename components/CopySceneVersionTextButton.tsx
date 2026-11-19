import React, { useEffect, useState } from 'react';
import { ClipboardCopy } from 'lucide-react';

const hasText = (content: unknown): content is string =>
  typeof content === 'string' && content.length > 0;

export async function copySceneVersionText(content: unknown) {
  if (!hasText(content)) return 'no-text';

  try {
    const clipboard = globalThis.navigator?.clipboard;
    if (!clipboard?.writeText) return 'failed';
    await clipboard.writeText(content);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export default function CopySceneVersionTextButton({ content }: { content: unknown }) {
  const [status, setStatus] = useState<'idle' | 'copying' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (status !== 'copied') return;
    const timeout = setTimeout(() => setStatus('idle'), 2500);
    return () => clearTimeout(timeout);
  }, [status]);

  const handleCopy = async () => {
    setStatus('copying');
    const result = await copySceneVersionText(content);
    setStatus(result === 'no-text' ? 'idle' : result);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={!hasText(content) || status === 'copying'}
        onClick={handleCopy}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--theme-secondary)] px-3 py-2 text-xs font-bold text-[var(--theme-primary)] disabled:opacity-50"
      >
        <ClipboardCopy size={14} aria-hidden="true" />
        העתק הכול
      </button>
      {status === 'copied' && <span role="status">הטקסט הועתק</span>}
      {status === 'failed' && <span role="alert">לא ניתן היה להעתיק את הטקסט.</span>}
    </div>
  );
}
