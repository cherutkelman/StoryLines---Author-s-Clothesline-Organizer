import { describe, expect, it } from 'vitest';
import type { Book } from '../types';
import {
  createAutomaticBoardVersionOnExit,
  createBoardSnapshot,
  createBoardVersion,
  hasBoardSnapshotChanges,
} from './board-history';

const createBook = (): Book => ({
  id: 'book-1',
  title: 'Book',
  ownerId: 'user-1',
  createdAt: 1,
  updatedAt: 1,
  syncStatus: 'local_only',
  pendingSync: false,
  plotlines: [
    { id: 'p1', name: 'Main', color: '#111' },
    { id: 'p2', name: 'Sub', color: '#222' },
  ],
  scenes: [
    {
      id: 's1',
      plotlineId: 'p1',
      title: 'Scene 1',
      content: 'secret manuscript text',
      summary: 'Board card summary',
      position: 0,
      isCompleted: false,
    },
    {
      id: 's2',
      plotlineId: 'p2',
      title: 'Scene 2',
      content: 'more manuscript text',
      summary: 'Another summary',
      position: 1,
    },
  ],
  chapterMarkers: [{ id: 'c1', position: 1, title: 'Chapter' }],
  characterArcs: [{
    id: 'arc-1',
    characterName: 'Hero',
    steps: [{ id: 'step-1', text: 'Belief' }],
    sceneLinks: [{ id: 'link-1', sceneId: 's1', summary: 'link' }],
  }],
});

describe('board history', () => {
  it('preserves timeline point items in board snapshots', () => {
    const book = {
      ...createBook(),
      timeline: { items: [{ id: 'point-1', type: 'point' as const, sceneIds: ['s1', 's2'] }] },
    };

    expect(createBoardSnapshot(book).timeline).toEqual(book.timeline);
  });

  it('creates a board snapshot without scene content or legacy scene history', () => {
    const book = {
      ...createBook(),
      sceneVersions: [{ id: 'legacy' }],
    } as unknown as Book;

    const snapshot = createBoardSnapshot(book);

    expect(snapshot.plotlines).toEqual(book.plotlines);
    expect(snapshot.chapterMarkers).toEqual(book.chapterMarkers);
    expect(snapshot.characterArcs).toEqual(book.characterArcs);
    expect('updatedAt' in snapshot).toBe(false);
    expect('pendingSync' in snapshot).toBe(false);
    expect(snapshot.scenes[0]).toMatchObject({
      id: 's1',
      title: 'Scene 1',
      summary: 'Board card summary',
      position: 0,
    });
    expect('content' in snapshot.scenes[0]).toBe(false);
    expect('sceneVersions' in snapshot).toBe(false);
  });

  it('keeps bookSequence and chapter marker locations in a board snapshot', () => {
    const book = {
      ...createBook(),
      bookSequence: [
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
      ],
    } as Book;

    const snapshot = createBoardSnapshot(book);

    expect(snapshot.bookSequence).toEqual(book.bookSequence);
    expect(snapshot.chapterMarkers).toEqual([{ id: 'c1', position: 1, title: 'Chapter' }]);
  });

  it('detects board changes by comparing snapshots', () => {
    const before = createBoardSnapshot(createBook());
    const changedBook = {
      ...createBook(),
      plotlines: [{ id: 'p1', name: 'Renamed', color: '#111' }],
    };

    expect(hasBoardSnapshotChanges(before, createBoardSnapshot(changedBook))).toBe(true);
  });

  it('includes a newly materialized timeline group in board change detection', () => {
    const before = createBoardSnapshot(createBook());
    const changedBook: Book = {
      ...createBook(),
      timeline: {
        items: [{ id: 'timeline-group-1', type: 'group', title: 'Childhood', sceneIds: ['s1', 's2'] }],
      },
    };
    const after = createBoardSnapshot(changedBook);

    expect(after.timeline).toEqual(changedBook.timeline);
    expect(hasBoardSnapshotChanges(before, after)).toBe(true);
  });

  it('detects a timeline-only reorder as a board change', () => {
    const timelineItems = [
      { id: 'timeline-s1', type: 'scene' as const, sceneId: 's1' },
      { id: 'timeline-s2', type: 'scene' as const, sceneId: 's2' },
    ];
    const before = createBoardSnapshot({
      ...createBook(),
      timeline: { items: timelineItems },
    });
    const after = createBoardSnapshot({
      ...createBook(),
      timeline: { items: [...timelineItems].reverse() },
    });

    expect(hasBoardSnapshotChanges(before, after)).toBe(true);
  });

  it('detects ungrouping as a board change', () => {
    const before = createBoardSnapshot({
      ...createBook(),
      timeline: {
        items: [{ id: 'group', type: 'group', title: 'Past', sceneIds: ['s1', 's2'] }],
      },
    });
    const after = createBoardSnapshot({
      ...createBook(),
      timeline: {
        items: [
          { id: 'timeline-scene-s1', type: 'scene', sceneId: 's1' },
          { id: 'timeline-scene-s2', type: 'scene', sceneId: 's2' },
        ],
      },
    });

    expect(hasBoardSnapshotChanges(before, after)).toBe(true);
  });

  it('detects a real group title change as a board change', () => {
    const before = createBoardSnapshot({
      ...createBook(),
      timeline: {
        items: [{ id: 'group', type: 'group', title: 'Past', sceneIds: ['s1', 's2'] }],
      },
    });
    const after = createBoardSnapshot({
      ...createBook(),
      timeline: {
        items: [{ id: 'group', type: 'group', title: 'Childhood', sceneIds: ['s1', 's2'] }],
      },
    });

    expect(hasBoardSnapshotChanges(before, after)).toBe(true);
  });

  it('detects a scene timeLabel change as a board change', () => {
    const before = createBoardSnapshot(createBook());
    const after = createBoardSnapshot({
      ...createBook(),
      scenes: createBook().scenes.map(scene => scene.id === 's1'
        ? { ...scene, timeLabel: 'Three years earlier' }
        : scene),
    });

    expect(after.scenes[0]).toMatchObject({ timeLabel: 'Three years earlier' });
    expect(hasBoardSnapshotChanges(before, after)).toBe(true);
  });

  it('detects adding independent scenes to a timeline group as a board change', () => {
    const before = createBoardSnapshot({
      ...createBook(),
      timeline: {
        items: [
          { id: 'timeline-s1', type: 'scene', sceneId: 's1' },
          { id: 'group', type: 'group', title: 'Period', sceneIds: ['s2'] },
        ],
      },
    });
    const after = createBoardSnapshot({
      ...createBook(),
      timeline: {
        items: [{ id: 'group', type: 'group', title: 'Period', sceneIds: ['s1', 's2'] }],
      },
    });

    expect(hasBoardSnapshotChanges(before, after)).toBe(true);
  });

  it('detects extracting scenes from a timeline group as a board change', () => {
    const before = createBoardSnapshot({
      ...createBook(),
      timeline: {
        items: [{ id: 'group', type: 'group', title: 'Period', sceneIds: ['s1', 's2'] }],
      },
    });
    const after = createBoardSnapshot({
      ...createBook(),
      timeline: {
        items: [
          { id: 'timeline-scene-s1', type: 'scene', sceneId: 's1' },
          { id: 'group', type: 'group', title: 'Period', sceneIds: ['s2'] },
        ],
      },
    });

    expect(hasBoardSnapshotChanges(before, after)).toBe(true);
  });

  it('detects placing an unplaced scene as a board change', () => {
    const before = createBoardSnapshot({
      ...createBook(),
      timeline: { items: [{ id: 'timeline-s1', type: 'scene', sceneId: 's1' }] },
    });
    const after = createBoardSnapshot({
      ...createBook(),
      timeline: {
        items: [
          { id: 'timeline-s1', type: 'scene', sceneId: 's1' },
          { id: 'timeline-s2', type: 'scene', sceneId: 's2' },
        ],
      },
    });

    expect(hasBoardSnapshotChanges(before, after)).toBe(true);
  });

  it('does not detect scene content-only edits as board changes', () => {
    const before = createBoardSnapshot(createBook());
    const changedBook = {
      ...createBook(),
      scenes: createBook().scenes.map(scene => ({ ...scene, content: `${scene.content} changed` })),
    };

    expect(hasBoardSnapshotChanges(before, createBoardSnapshot(changedBook))).toBe(false);
  });

  it('does not detect book sync metadata changes as board changes', () => {
    const before = createBoardSnapshot(createBook());
    const changedBook = {
      ...createBook(),
      updatedAt: 99,
      pendingSync: true,
    };

    expect(hasBoardSnapshotChanges(before, createBoardSnapshot(changedBook))).toBe(false);
  });

  it('creates an automatic board version with a full board snapshot', () => {
    const version = createBoardVersion({
      book: createBook(),
      versionType: 'automatic',
      reason: 'board_exit',
      now: 10,
      id: 'bv-1',
    });

    expect(version).toMatchObject({
      id: 'bv-1',
      bookId: 'book-1',
      createdAt: 10,
      versionType: 'automatic',
      reason: 'board_exit',
    });
    expect(version.snapshot.scenes).toHaveLength(2);
    expect('content' in version.snapshot.scenes[0]).toBe(false);
  });

  it('creates an automatic board version when leaving the board after changes', () => {
    const baseline = createBoardSnapshot(createBook());
    const changedBook = {
      ...createBook(),
      chapterMarkers: [{ id: 'c1', position: 1, title: 'Renamed chapter' }],
    };

    const version = createAutomaticBoardVersionOnExit(changedBook, baseline, 20, 'exit-version');

    expect(version?.id).toBe('exit-version');
    expect(version?.reason).toBe('board_exit');
    expect(version?.versionType).toBe('automatic');
  });

  it('does not create an automatic board version when leaving without board changes', () => {
    const book = {
      ...createBook(),
      bookSequence: [
        { id: 'scene:s1', type: 'scene' as const, sceneId: 's1' },
        { id: 'scene:s2', type: 'scene' as const, sceneId: 's2' },
      ],
    };
    const baseline = createBoardSnapshot(book);

    expect(createAutomaticBoardVersionOnExit(book, baseline, 20, 'exit-version')).toBeNull();
  });
});
