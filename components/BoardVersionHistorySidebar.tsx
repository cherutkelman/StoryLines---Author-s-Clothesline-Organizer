import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { BoardVersion } from '../types';
import {
  BOARD_HISTORY_EMPTY_MESSAGE,
  prepareBoardVersionList,
  selectBoardVersionId,
} from '../src/board-version-history-ui';

interface BoardVersionHistorySidebarProps {
  isOpen: boolean;
  boardTitle: string;
  activePreviewVersionId?: string | null;
  onClose: () => void;
  onLoadVersions: () => Promise<BoardVersion[]> | BoardVersion[];
  onPreviewVersion: (version: BoardVersion) => void;
}

const BoardVersionHistorySidebar: React.FC<BoardVersionHistorySidebarProps> = ({
  isOpen,
  boardTitle,
  activePreviewVersionId,
  onClose,
  onLoadVersions,
  onPreviewVersion,
}) => {
  const [versions, setVersions] = useState<BoardVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isCurrent = true;
    setIsLoading(true);
    setErrorMessage(null);

    Promise.resolve(onLoadVersions())
      .then((loadedVersions) => {
        if (!isCurrent) return;
        setVersions(loadedVersions);
      })
      .catch((error) => {
        if (!isCurrent) return;
        console.warn('[BoardVersionHistory] Failed to load board versions.', error);
        setVersions([]);
        setErrorMessage('לא ניתן היה לטעון את היסטוריית הגרסאות של לוח העלילה.');
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isOpen, onLoadVersions]);

  const versionItems = useMemo(() => prepareBoardVersionList(versions), [versions]);
  const activeVersionId = selectBoardVersionId(versions, activePreviewVersionId ?? null);

  if (!isOpen) return null;

  return (
    <aside
      className="fixed bottom-0 right-0 top-0 z-[100] flex h-full w-full max-w-md flex-col border-r border-[var(--theme-border)] bg-[var(--theme-card)] shadow-2xl"
      dir="rtl"
    >
      <header className="flex items-center justify-between gap-4 border-b border-[var(--theme-border)] bg-[var(--theme-secondary)]/20 px-6 py-5">
        <div className="min-w-0">
          <h2 className="text-xl font-black text-[var(--theme-primary)]">היסטוריית גרסאות</h2>
          <p className="truncate text-sm font-bold text-[var(--theme-primary)]/50">
            {boardTitle || 'לוח העלילה'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-[var(--theme-primary)]/40 hover:text-[var(--theme-primary)]"
          aria-label="סגור"
        >
          <X size={24} />
        </button>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto bg-[var(--theme-secondary)]/10 p-4">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 text-sm font-bold text-[var(--theme-primary)]/50">
            <Loader2 size={18} className="animate-spin" />
            <span>טוען גרסאות...</span>
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="rounded-lg border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {!isLoading && !errorMessage && versionItems.length === 0 && (
          <div className="rounded-lg border border-dashed border-[var(--theme-border)] bg-[var(--theme-card)] p-8 text-center text-sm font-bold text-[var(--theme-primary)]/35">
            {BOARD_HISTORY_EMPTY_MESSAGE}
          </div>
        )}

        {!isLoading && !errorMessage && versionItems.length > 0 && (
          <div className="space-y-2">
            {versionItems.map((item) => {
              const isActive = activeVersionId === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onPreviewVersion(item.version)}
                  aria-pressed={isActive}
                  className={`w-full rounded-lg border p-3 text-right transition-all ${
                    isActive
                      ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-sm'
                      : 'border-[var(--theme-border)] bg-[var(--theme-card)] text-[var(--theme-primary)] hover:border-[var(--theme-accent)]'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-black">{item.displayName}</span>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-black ${isActive ? 'bg-white/20' : 'bg-[var(--theme-secondary)]'}`}>
                      {item.typeLabel}
                    </span>
                  </div>
                  <div className={`text-xs font-bold ${isActive ? 'text-[var(--theme-card)]/70' : 'text-[var(--theme-primary)]/50'}`}>
                    {item.dateLabel} · {item.timeLabel}
                  </div>
                  <div className={`mt-1 flex items-center justify-between gap-2 text-[10px] font-black ${isActive ? 'text-[var(--theme-card)]/80' : 'text-[var(--theme-primary)]/35'}`}>
                    <span>{item.reasonLabel}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      {isActive && (
                        <span className="rounded bg-white/20 px-2 py-0.5">
                          מוצגת עכשיו
                        </span>
                      )}
                      {item.isLatest && (
                        <span className={`rounded px-2 py-0.5 ${isActive ? 'bg-white/20' : 'bg-green-100 text-green-700'}`}>
                          הגרסה האחרונה
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </aside>
  );
};

export default BoardVersionHistorySidebar;
