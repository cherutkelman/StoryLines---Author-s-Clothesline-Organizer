import React, { useId, useLayoutEffect, useRef } from 'react';

interface MindMapDeleteDialogProps {
  name: string;
  hasChildren: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function MindMapDeleteDialog({ name, hasChildren, onCancel, onConfirm }: MindMapDeleteDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useLayoutEffect(() => {
    const dialog = dialogRef.current!;
    dialog.showModal();
    const viewport = window.visualViewport;
    const resize = () => {
      if (!viewport) return;
      dialog.style.top = `${viewport.offsetTop + viewport.height / 2}px`;
      dialog.style.left = `${viewport.offsetLeft + viewport.width / 2}px`;
      dialog.style.maxHeight = `${viewport.height * 0.9}px`;
      dialog.style.maxWidth = `${Math.min(viewport.width * 0.94, 384)}px`;
    };
    resize();
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    return () => {
      viewport?.removeEventListener('resize', resize);
      viewport?.removeEventListener('scroll', resize);
      dialog.close();
    };
  }, []);

  return (
    <dialog ref={dialogRef} dir="rtl" aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={event => { event.preventDefault(); onCancel(); }}
      className="fixed bottom-auto right-auto left-1/2 top-1/2 m-0 max-h-[90dvh] w-[calc(100%-1rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-0 text-[var(--theme-text)] shadow-xl backdrop:bg-black/50">
      <div className="space-y-2 p-4">
        <h2 id={titleId} className="text-lg font-bold">מחיקת רעיון</h2>
        <p className="whitespace-pre-wrap break-words font-bold">{name}</p>
        <p id={descriptionId}>
          הרעיון וכל הקשרים הישירים שלו יימחקו.
          {hasChildren && ' הילדים וכל צאצאיהם יישארו במפה. רעיונות שלא יישאר להם מסלול לשורש יופיעו תחת ״רעיונות מנותקים״. אחרים עשויים להישאר מחוברים דרך קשרים נוספים.'}
        </p>
      </div>
      <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-[var(--theme-border)] bg-[var(--theme-card)] p-3">
        <button type="button" autoFocus onClick={onCancel}
          className="min-h-11 min-w-11 rounded-xl border border-[var(--theme-border)] px-3 py-2 font-bold">ביטול</button>
        <button type="button" onClick={onConfirm}
          className="min-h-11 min-w-11 rounded-xl border border-[var(--theme-accent)] bg-[var(--theme-secondary)] px-3 py-2 font-bold">מחק רעיון</button>
      </div>
    </dialog>
  );
}
