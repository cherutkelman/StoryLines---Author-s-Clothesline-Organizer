import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('board UI source', () => {
  it('does not show the add-chapter button on scene slots while keeping the marker row action', () => {
    const source = readFileSync('components/Board.tsx', 'utf8');

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
  });

  it('keeps board version compare and restore UI out of the final board preview flow', () => {
    const boardSource = readFileSync('components/Board.tsx', 'utf8');
    const sidebarSource = readFileSync('components/BoardVersionHistorySidebar.tsx', 'utf8');

    expect(boardSource).not.toContain('compareVersion');
    expect(boardSource).not.toContain('compareResult');
    expect(boardSource).not.toContain('onRestoreSceneTitleFromVersion');
    expect(boardSource).not.toContain('onRestoreScenePositionFromVersion');
    expect(sidebarSource).not.toContain('onCompareVersion');
    expect(sidebarSource).not.toContain('השווה לגרסה הנוכחית');
  });

  it('allows only deleted-scene restore actions inside historical board preview cards', () => {
    const boardSource = readFileSync('components/Board.tsx', 'utf8');

    expect(boardSource).toContain('findBoardSnapshotScenesMissingFromCurrent');
    expect(boardSource).toContain('החזר סצנה ללוח הנוכחי');
    expect(boardSource).toContain('הוחזרה ללוח הנוכחי');
    expect(boardSource).not.toContain('שחזר שם');
    expect(boardSource).not.toContain('שחזר מיקום');
    expect(boardSource).not.toContain('שחזר החלפה');
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
