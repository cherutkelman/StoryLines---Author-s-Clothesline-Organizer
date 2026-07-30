import { describe, expect, it } from 'vitest';
import type { BoardVersion } from '../types';
import {
  BOARD_HISTORY_EMPTY_MESSAGE,
  createBoardPreviewProject,
  getBoardVersionDisplayName,
  isBoardVersionPreviewReadOnly,
  prepareBoardVersionList,
  runBoardMutationIfEditable,
  selectBoardVersionId,
} from './board-version-history-ui';

const createVersion = (
  id: string,
  createdAt: number,
  versionType: BoardVersion['versionType'] = 'automatic',
  manualName?: string
): BoardVersion => ({
  id,
  bookId: 'book-1',
  createdAt,
  versionType,
  manualName,
  reason: versionType === 'manual' ? 'manual' : 'board_exit',
  snapshot: {
    plotlines: [],
    scenes: [],
  },
});

describe('board version history UI helpers', () => {
  it('exposes the empty state text for an empty sidebar list', () => {
    expect(prepareBoardVersionList([])).toEqual([]);
    expect(BOARD_HISTORY_EMPTY_MESSAGE).toBe('עדיין לא נשמרו גרסאות ללוח העלילה.');
  });

  it('sorts board versions newest first', () => {
    const items = prepareBoardVersionList([
      createVersion('old', 100),
      createVersion('new', 300),
      createVersion('middle', 200),
    ]);

    expect(items.map(item => item.id)).toEqual(['new', 'middle', 'old']);
  });

  it('marks only the newest board version as the latest version', () => {
    const items = prepareBoardVersionList([
      createVersion('old', 100),
      createVersion('new', 300),
    ]);

    expect(items.map(item => [item.id, item.isLatest])).toEqual([
      ['new', true],
      ['old', false],
    ]);
  });

  it('uses manual names when they exist', () => {
    expect(getBoardVersionDisplayName(createVersion('manual', 100, 'manual', 'Before chapter move'))).toBe('Before chapter move');
  });

  it('falls back to automatic or manual labels when there is no manual name', () => {
    expect(getBoardVersionDisplayName(createVersion('auto', 100, 'automatic'))).toBe('אוטומטית');
    expect(getBoardVersionDisplayName(createVersion('manual', 100, 'manual'))).toBe('ידנית');
  });

  it('selects an existing board version id', () => {
    const versions = [createVersion('v1', 100), createVersion('v2', 200)];

    expect(selectBoardVersionId(versions, 'v2')).toBe('v2');
  });

  it('clears selection for a missing board version id', () => {
    const versions = [createVersion('v1', 100)];

    expect(selectBoardVersionId(versions, 'missing')).toBeNull();
  });

  it('creates a read-only preview project from a historical board snapshot', () => {
    const liveProject = {
      plotlines: [{ id: 'live-line', name: 'Live line', color: '#111' }],
      scenes: [{ id: 'live-scene', plotlineId: 'live-line', title: 'Live scene', content: 'live content', position: 0 }],
    };
    const version = {
      ...createVersion('historical', 100),
      snapshot: {
        plotlines: [{ id: 'old-line', name: 'Old line', color: '#222' }],
        scenes: [{ id: 'old-scene', plotlineId: 'old-line', title: 'Old scene', position: 1 }],
      },
    };

    const previewProject = createBoardPreviewProject(liveProject, version);

    expect(previewProject.plotlines[0].id).toBe('old-line');
    expect(previewProject.scenes[0].title).toBe('Old scene');
    expect(previewProject.scenes[0].content).toBe('');
    expect(liveProject.scenes[0].title).toBe('Live scene');
  });

  it('marks board version preview as read-only only while a version is active', () => {
    expect(isBoardVersionPreviewReadOnly(createVersion('preview', 100))).toBe(true);
    expect(isBoardVersionPreviewReadOnly(null)).toBe(false);
  });

  it('does not call board mutation callbacks while preview is read-only', () => {
    let renameCalls = 0;
    let addCalls = 0;

    expect(runBoardMutationIfEditable(true, () => { renameCalls += 1; })).toBe(false);
    expect(runBoardMutationIfEditable(true, () => { addCalls += 1; })).toBe(false);

    expect(renameCalls).toBe(0);
    expect(addCalls).toBe(0);
  });
});
