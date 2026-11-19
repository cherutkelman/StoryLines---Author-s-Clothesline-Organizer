import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('board UI source', () => {
  it('does not show the add-chapter button on scene slots while keeping the marker row action', () => {
    const source = readFileSync('components/board/PlotlinesBoardView.tsx', 'utf8');

    expect(source).toContain('group/marker-btn');
    expect(source).toContain('onAddChapterMarker(i)');
    expect(source).not.toContain('onAddChapterMarker(colIdx)');
  });

  it('opens board version preview directly from a version card without a separate show button', () => {
    const sidebarSource = readFileSync('components/BoardVersionHistorySidebar.tsx', 'utf8');
    const boardSource = readFileSync('components/Board.tsx', 'utf8');

    expect(sidebarSource).toContain('onClick={() => onPreviewVersion(item.version)}');
    expect(sidebarSource).toContain('activePreviewVersionId');
    expect(sidebarSource).toContain('aria-pressed={isActive}');
    expect(sidebarSource).toContain('מוצגת עכשיו');
    expect(sidebarSource).not.toContain('setSelectedVersionId');
    expect(sidebarSource).not.toContain('<Eye');
    expect(sidebarSource).not.toContain('<span>הצג</span>');
    expect(boardSource).toContain('activePreviewVersionId={previewVersion?.id ?? null}');
  });

  it('keeps the board version sidebar open while switching preview versions', () => {
    const boardSource = readFileSync('components/Board.tsx', 'utf8');
    const showPreviewBody = boardSource.match(/const showBoardPreview = \(version: BoardVersion\) => \{([\s\S]*?)\n  \};/);

    expect(showPreviewBody?.[1]).toContain('setPreviewVersion(version);');
    expect(showPreviewBody?.[1]).not.toContain('setIsVersionHistoryOpen(false)');
  });

  it('renders board version history as a non-blocking side panel without a backdrop', () => {
    const sidebarSource = readFileSync('components/BoardVersionHistorySidebar.tsx', 'utf8');

    expect(sidebarSource).toContain('className="fixed bottom-0 right-0 top-0');
    expect(sidebarSource).not.toContain('fixed inset-0');
    expect(sidebarSource).not.toContain('bg-black/35');
    expect(sidebarSource).not.toContain('backdrop-blur');
    expect(sidebarSource).not.toContain('className="absolute inset-0 cursor-default"');
    expect(sidebarSource).toContain('max-h-[100dvh]');
    expect(sidebarSource).toContain('overflow-y-auto overscroll-contain');
    expect(sidebarSource).toContain('dir="rtl"');
  });

  it('offers history under the active mobile board only with access and closes the drawer without writing', () => {
    const app = readFileSync('App.tsx', 'utf8');
    const mobileBoard = app.slice(app.indexOf('{isBoardItem && isActive && ('), app.indexOf('{isEditorItem && isActive && activeBook && ('));
    expect(mobileBoard).toContain('{canOpenBoardHistory && (');
    expect(mobileBoard).toContain('היסטוריית גרסאות');
    expect(mobileBoard).toContain('onClick={() => handleBoardHistoryOpenChange(true)}');
    const handler = app.slice(app.indexOf('const handleBoardHistoryOpenChange'), app.indexOf('const handleQuestionnaireTabChange'));
    expect(handler).toContain('setIsMobileLibraryOpen(false)');
    expect(handler).toContain('setBoardHistoryBookId(historyBookId)');
    expect(handler).toContain('setBoardHistoryBookId(null)');
    expect(handler).not.toMatch(/updateActiveBook|save|flush|handleViewChange/);
  });

  it('connects both entry points to a single sidebar and scopes its open state and preview to the current book', () => {
    const app = readFileSync('App.tsx', 'utf8');
    const board = readFileSync('components/Board.tsx', 'utf8');
    expect(board.match(/<BoardVersionHistorySidebar\b/g)).toHaveLength(1);
    expect(board).toContain('onOpenHistory={() => onVersionHistoryOpenChange(true)}');
    expect(board).toContain('onClose={() => onVersionHistoryOpenChange(false)}');
    expect(board).toMatch(/<BoardVersionHistorySidebar\s+key=\{sceneHistoryBookId\}/);
    expect(board).toContain('selectedPreviewVersion?.bookId === sceneHistoryBookId');
    expect(app).toContain('isVersionHistoryOpen={canOpenBoardHistory && boardHistoryBookId === activeBook.id}');
    expect(app).toContain("activeView === 'board' && canOpenBoardHistory && openBookId === historyBookId");
  });

  it('moves mobile quick add into the board drawer and keeps historical previews read-only', () => {
    const app = readFileSync('App.tsx', 'utf8');
    const toolbar = readFileSync('components/board/BoardToolbar.tsx', 'utf8');
    const mobileBoard = app.slice(app.indexOf('{isBoardItem && isActive && ('), app.indexOf('{isEditorItem && isActive && activeBook && ('));
    const open = app.slice(app.indexOf('const openBoardBulkAdd'), app.indexOf('const handleQuestionnaireTabChange'));
    expect(toolbar).toMatch(/hidden items-center gap-3 lg:flex">\s*<button onClick=\{props.onBulkAdd\}/);
    expect(mobileBoard).toContain('הוספה מהירה');
    expect(mobileBoard).toContain('disabled={isBoardPreviewActive}');
    expect(mobileBoard).toContain('openBoardBulkAdd(activeBook.plotlines[0]?.id');
    expect(open).toContain('if (!activeBook || isBoardPreviewActive) return');
    expect(open).toContain('setIsMobileLibraryOpen(false)');
    expect(open).toContain('setIsBulkAddOpen(true)');
    expect(app).toContain('onBulkAdd={openBoardBulkAdd}');
    expect(app).toContain('onPreviewVersionChange={setBoardPreviewVersion}');
  });

  it('exposes plotline management in the mobile board drawer with the existing handlers', () => {
    const app = readFileSync('App.tsx', 'utf8');
    const mobileBoard = app.slice(app.indexOf('{isBoardItem && isActive && ('), app.indexOf('{isEditorItem && isActive && activeBook && ('));
    expect(mobileBoard).toContain('קווי עלילה</summary>');
    expect(mobileBoard).toContain('onClick={addPlotline}');
    expect(mobileBoard).toContain('renamePlotline(plotline.id, event.target.value)');
    expect(mobileBoard).toContain('onClick={() => deletePlotline(plotline.id)}');
    expect(mobileBoard).toContain('disabled={activeBook.plotlines.length <= 1}');
    expect(mobileBoard).toContain('<fieldset disabled={isBoardPreviewActive}');
    expect(app).toContain('תמחק גם את כל הסצנות המשויכות אליו');
  });

  it('keeps board version compare and restore UI out of the final board preview flow', () => {
    const boardSource = readFileSync('components/board/PlotlinesBoardView.tsx', 'utf8');
    const sidebarSource = readFileSync('components/BoardVersionHistorySidebar.tsx', 'utf8');

    expect(boardSource).not.toContain('compareVersion');
    expect(boardSource).not.toContain('compareResult');
    expect(boardSource).not.toContain('onRestoreSceneTitleFromVersion');
    expect(boardSource).not.toContain('onRestoreScenePositionFromVersion');
    expect(sidebarSource).not.toContain('onCompareVersion');
    expect(sidebarSource).not.toContain('השווה לגרסה הנוכחית');
  });

  it('marks deleted scenes in historical cards without offering a restore action', () => {
    const boardSource = readFileSync('components/Board.tsx', 'utf8');
    const plotlinesViewSource = readFileSync('components/board/PlotlinesBoardView.tsx', 'utf8');

    expect(boardSource).toContain('findBoardSnapshotScenesMissingFromCurrent');
    expect(plotlinesViewSource).toContain('נמחקה');
    expect(plotlinesViewSource).not.toContain('החזר סצנה ללוח הנוכחי');
    expect(plotlinesViewSource).not.toContain('הוחזרה ללוח הנוכחי');
    expect(plotlinesViewSource).not.toMatch(/canRestoreDeletedScene|onRestoreDeletedScene/);
    expect(plotlinesViewSource).not.toContain('שחזר שם');
    expect(plotlinesViewSource).not.toContain('שחזר מיקום');
    expect(plotlinesViewSource).not.toContain('שחזר החלפה');
  });

  it('keeps the legacy restore implementation disconnected from the board UI', () => {
    const appSource = readFileSync('App.tsx', 'utf8');
    const boardSource = readFileSync('components/Board.tsx', 'utf8');
    const boardTypes = readFileSync('components/board/boardTypes.ts', 'utf8');

    expect(appSource.match(/\brestoreDeletedBoardSceneFromVersion\b/g)).toEqual(['restoreDeletedBoardSceneFromVersion']);
    expect(boardSource).not.toMatch(/onRestoreDeletedScene|handleRestoreDeletedScene/);
    expect(boardTypes).not.toContain('onRestoreDeletedSceneFromVersion');
  });

  it('keeps deleted-scene history and clipboard controls connected to the selected versions', () => {
    const boardSource = readFileSync('components/Board.tsx', 'utf8');
    const sidebarSource = readFileSync('components/BoardVersionHistorySidebar.tsx', 'utf8');
    const deletedHistorySource = readFileSync('components/DeletedSceneHistory.tsx', 'utf8');
    const editorHistorySource = readFileSync('components/editor/EditorHistoryPanel.tsx', 'utf8');

    expect(boardSource).toContain('deletedSceneHistory={sceneHistoryBookId');
    expect(sidebarSource).toContain('<DeletedSceneHistory key={deletedSceneHistory.bookId}');
    expect(deletedHistorySource).toContain('<CopySceneVersionTextButton key={selected.id} content={selected.content}');
    expect(editorHistorySource).toContain('<CopySceneVersionTextButton');
    expect(editorHistorySource).toContain('content={selectedVersion.content}');
  });

  it('backs up the current board before restoring a deleted scene', () => {
    const appSource = readFileSync('App.tsx', 'utf8');
    const backupIndex = appSource.indexOf('boardVersionStorage.saveBoardVersion(createBoardVersion');
    const updateIndex = appSource.indexOf('updateActiveBook(restoreResult.updates)');

    expect(appSource).toContain('window.confirm(confirmText)');
    expect(backupIndex).toBeGreaterThan(-1);
    expect(updateIndex).toBeGreaterThan(-1);
    expect(backupIndex).toBeLessThan(updateIndex);
  });
});
