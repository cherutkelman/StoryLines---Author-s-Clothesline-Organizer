import React from 'react';
import { ClipboardCopy, FileText, GitCompare, Pencil, RotateCcw, Save, Trash2, X } from 'lucide-react';
import type { Scene, SceneVersion } from '../../types';
import { formatVersionDate, formatVersionTime, getVersionReasonLabel, getVersionTypeLabel } from './editorHistoryHelpers';

type HistoryMode = 'view' | 'compare';
type ComparisonPart = { type: 'added' | 'removed' | 'same'; text: string };

interface EditorHistoryPanelProps {
  historyScene?: Scene; historyVersions: SceneVersion[]; selectedVersion?: SceneVersion;
  selectedVersionCanBeDeleted: boolean; historyMode: HistoryMode; comparisonParts: ComparisonPart[];
  hasComparisonChanges: boolean; copiedVersionNoticeId: string | null; deletingVersionId: string | null;
  renamingVersionId: string | null; deleteVersionError: string | null; renameVersionError: string | null;
  renameCandidateVersion?: SceneVersion; isManualVersionFormOpen: boolean; manualVersionName: string; manualVersionNote: string;
  setIsHistoryOpen: (value: boolean) => void; setIsManualVersionFormOpen: (value: boolean) => void;
  setManualVersionName: (value: string) => void; setManualVersionNote: (value: string) => void;
  setSelectedVersionId: (value: string | null) => void; setHistoryMode: (value: HistoryMode) => void;
  setCopiedVersionNoticeId: (value: string | null) => void; handleCreateManualVersion: () => void;
  handleRestoreVersion: () => void; handleCopyVersion: () => void | Promise<void>;
  openRenameVersionDialog: () => void; openDeleteVersionConfirmation: () => void;
}

const EditorHistoryPanel: React.FC<EditorHistoryPanelProps> = (props) => {
  const { historyScene, historyVersions, selectedVersion, selectedVersionCanBeDeleted, historyMode, comparisonParts,
    hasComparisonChanges, copiedVersionNoticeId, deletingVersionId, renamingVersionId, deleteVersionError,
    renameVersionError, renameCandidateVersion, isManualVersionFormOpen, manualVersionName, manualVersionNote,
    setIsHistoryOpen, setIsManualVersionFormOpen, setManualVersionName, setManualVersionNote, setSelectedVersionId,
    setHistoryMode, setCopiedVersionNoticeId, handleCreateManualVersion, handleRestoreVersion, handleCopyVersion,
    openRenameVersionDialog, openDeleteVersionConfirmation } = props;
  return (

        <div className="fixed inset-0 z-[100] flex justify-end bg-black/35 backdrop-blur-sm" dir="rtl">
          <button
            className="absolute inset-0 cursor-default"
            onClick={() => setIsHistoryOpen(false)}
            aria-label="סגור היסטוריית גרסאות"
          />
          <aside className="relative h-full w-full max-w-5xl bg-[var(--theme-card)] shadow-2xl border-r border-[var(--theme-border)] flex flex-col">
            <header className="flex items-center justify-between gap-4 border-b border-[var(--theme-border)] px-6 py-5 bg-[var(--theme-secondary)]/20">
              <div className="min-w-0">
                <h2 className="text-xl font-black text-[var(--theme-primary)]">היסטוריית גרסאות</h2>
                <p className="truncate text-sm font-bold text-[var(--theme-primary)]/50">
                  {historyScene?.title || 'סצנה ללא כותרת'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsManualVersionFormOpen(true)}
                  disabled={!historyScene}
                  className="flex items-center gap-2 rounded-lg bg-[var(--theme-primary)] px-4 py-2 text-xs font-bold text-[var(--theme-card)] transition-all hover:opacity-90 disabled:opacity-40"
                >
                  <Save size={14} />
                  <span>שמור גרסה</span>
                </button>
                <button onClick={() => setIsHistoryOpen(false)} className="p-2 text-[var(--theme-primary)]/40 hover:text-[var(--theme-primary)]">
                  <X size={24} />
                </button>
              </div>
            </header>

            {historyScene ? (
              <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[320px_1fr]">
                <section className="min-h-0 overflow-y-auto border-l border-[var(--theme-border)] bg-[var(--theme-secondary)]/10 p-4">
                  <div className="mb-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-[var(--theme-primary)]">הגרסה הנוכחית</span>
                      <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-black text-green-700">פעילה</span>
                    </div>
                    <div className="text-xs font-bold text-[var(--theme-primary)]/45">
                      {historyScene.content.length.toLocaleString()} תווים
                    </div>
                  </div>

                  <div className="space-y-2">
                    {historyVersions.map(version => {
                      const isSelected = selectedVersion?.id === version.id;
                      const isCurrentSource = historyScene.restoredFromVersionId === version.id;

                      return (
                        <button
                          key={version.id}
                          onClick={() => {
                            setSelectedVersionId(version.id);
                            setHistoryMode('view');
                          }}
                          className={`w-full rounded-lg border p-3 text-right transition-all ${
                            isSelected
                              ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-sm'
                              : 'border-[var(--theme-border)] bg-[var(--theme-card)] text-[var(--theme-primary)] hover:border-[var(--theme-accent)]'
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="text-sm font-black">{formatVersionDate(version.createdAt)}</span>
                            <span className={`rounded px-2 py-0.5 text-[10px] font-black ${isSelected ? 'bg-white/20' : 'bg-[var(--theme-secondary)]'}`}>
                              {getVersionTypeLabel(version)}
                            </span>
                          </div>
                          <div className={`text-xs font-bold ${isSelected ? 'text-[var(--theme-card)]/70' : 'text-[var(--theme-primary)]/50'}`}>
                            {formatVersionTime(version.createdAt)} · {getVersionReasonLabel(version.reason)}
                          </div>

                          {version.name && (
                            <div className={`mt-2 truncate text-xs font-black ${isSelected ? 'text-[var(--theme-card)]' : 'text-[var(--theme-primary)]'}`}>
                              {version.name}
                            </div>
                          )}
                          {isCurrentSource && (
                            <div className={`mt-2 text-[10px] font-black ${isSelected ? 'text-[var(--theme-card)]/80' : 'text-green-700'}`}>
                              מקור הגרסה הנוכחית
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {historyVersions.length === 0 && (
                    <div className="rounded-lg border border-dashed border-[var(--theme-border)] p-8 text-center text-sm font-bold text-[var(--theme-primary)]/35">
                      עדיין אין גרסאות שמורות לסצנה הזו.
                    </div>
                  )}
                </section>

                <section className="min-h-0 overflow-y-auto p-6">
                  {isManualVersionFormOpen && (
                    <div className="mb-5 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-secondary)]/15 p-4">
                      <div className="mb-3 text-sm font-black text-[var(--theme-primary)]">שמירת גרסה ידנית</div>
                      <div className="grid gap-3">
                        <input
                          value={manualVersionName}
                          onChange={(event) => setManualVersionName(event.target.value)}
                          placeholder="שם קצר לגרסה"
                          className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] px-3 py-2 text-sm text-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-accent)]"
                        />
                        <textarea
                          value={manualVersionNote}
                          onChange={(event) => setManualVersionNote(event.target.value)}
                          placeholder="הערה אופציונלית"
                          rows={3}
                          className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] px-3 py-2 text-sm text-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-accent)]"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleCreateManualVersion}
                            className="rounded-lg bg-[var(--theme-primary)] px-4 py-2 text-xs font-bold text-[var(--theme-card)]"
                          >
                            שמור
                          </button>
                          <button
                            onClick={() => setIsManualVersionFormOpen(false)}
                            className="rounded-lg px-4 py-2 text-xs font-bold text-[var(--theme-primary)]/60 hover:bg-[var(--theme-secondary)]"
                          >
                            ביטול
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedVersion ? (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--theme-border)] pb-4">
                        <div>
                          <div className="text-sm font-black text-[var(--theme-primary)]">
                            {formatVersionDate(selectedVersion.createdAt)} · {formatVersionTime(selectedVersion.createdAt)}
                          </div>
                          <div className="text-xs font-bold text-[var(--theme-primary)]/50">
                            {getVersionTypeLabel(selectedVersion)} · {getVersionReasonLabel(selectedVersion.reason)}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">

                          <button
                            onClick={() => setHistoryMode('view')}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${historyMode === 'view' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)]' : 'bg-[var(--theme-secondary)] text-[var(--theme-primary)]'}`}
                          >
                            <FileText size={14} />
                            <span>הצג</span>
                          </button>
                          <button
                            onClick={() => {
                              setCopiedVersionNoticeId(null);
                              setHistoryMode('compare');
                            }}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${historyMode === 'compare' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)]' : 'bg-[var(--theme-secondary)] text-[var(--theme-primary)]'}`}
                          >
                            <GitCompare size={14} />
                            <span>השווה לנוכחי</span>
                          </button>
                          <button
                            onClick={handleRestoreVersion}
                            className="flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800"
                          >
                            <RotateCcw size={14} />
                            <span>שחזר</span>
                          </button>
                          <button
                            onClick={() => { void handleCopyVersion(); }}
                            className="flex items-center gap-2 rounded-lg bg-[var(--theme-secondary)] px-3 py-2 text-xs font-bold text-[var(--theme-primary)]"
                          >
                            <ClipboardCopy size={14} />
                            <span>צור עותק</span>
                          </button>
                          {historyMode === 'view' && (
                            <button
                              onClick={openRenameVersionDialog}
                              disabled={Boolean(renamingVersionId)}
                              className="flex items-center gap-2 rounded-lg bg-[var(--theme-secondary)] px-3 py-2 text-xs font-bold text-[var(--theme-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Pencil size={14} />
                              <span>שנה שם</span>
                            </button>
                          )}
                          {historyMode === 'view' && selectedVersionCanBeDeleted && (
                            <button
                              onClick={openDeleteVersionConfirmation}
                              disabled={Boolean(deletingVersionId)}
                              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 size={14} />
                              <span>מחק גרסה</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {historyMode === 'compare' && !hasComparisonChanges && (
                        <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-secondary)]/30 p-4 text-center text-sm font-black text-[var(--theme-primary)]">
                          אין הבדלים בין הגרסאות.
                        </div>
                      )}

                      {historyMode === 'view' && copiedVersionNoticeId === selectedVersion.id && (
                        <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-secondary)]/30 p-4 text-center text-sm font-black text-[var(--theme-primary)]">
                          נוצר עותק.
                        </div>
                      )}

                      {deleteVersionError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm font-black text-red-700">
                          {deleteVersionError}
                        </div>

                      )}

                      {renameVersionError && !renameCandidateVersion && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm font-black text-red-700">
                          {renameVersionError}
                        </div>
                      )}

                      {selectedVersion.name && (
                        <div className="rounded-lg bg-[var(--theme-secondary)]/30 p-3 text-sm font-bold text-[var(--theme-primary)]">
                          {selectedVersion.name}
                        </div>
                      )}
                      {selectedVersion.note && (
                        <div className="rounded-lg bg-[var(--theme-secondary)]/20 p-3 text-sm leading-relaxed text-[var(--theme-primary)]/70">
                          {selectedVersion.note}
                        </div>
                      )}

                      {historyMode === 'view' ? (
                        <article className="whitespace-pre-wrap rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] p-5 text-lg leading-relaxed text-[var(--theme-primary)]">
                          {selectedVersion.content || 'אין תוכן בגרסה הזו.'}
                        </article>
                      ) : (
                        <article className="whitespace-pre-wrap rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] p-5 text-lg leading-relaxed text-[var(--theme-primary)]">
                          {comparisonParts.map((part, index) => {
                            if (part.type === 'added') {
                              return <ins key={index} className="bg-green-100 text-green-800 no-underline">{part.text}</ins>;
                            }
                            if (part.type === 'removed') {
                              return <del key={index} className="bg-red-100 text-red-800">{part.text}</del>;
                            }
                            return <span key={index}>{part.text}</span>;
                          })}
                        </article>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[var(--theme-border)] p-10 text-center text-sm font-bold text-[var(--theme-primary)]/35">
                      בחרי גרסה מהרשימה או שמרי גרסה ידנית חדשה.
                    </div>
                  )}
                </section>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-10 text-center text-sm font-bold text-[var(--theme-primary)]/35">
                אין סצנה פעילה להצגת היסטוריה.
              </div>
            )}
          </aside>
        </div>

  );
};

export default EditorHistoryPanel;
