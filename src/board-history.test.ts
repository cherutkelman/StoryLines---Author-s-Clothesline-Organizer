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

  it('detects board changes by comparing snapshots', () => {
    const before = createBoardSnapshot(createBook());
    const changedBook = {
      ...createBook(),
      plotlines: [{ id: 'p1', name: 'Renamed', color: '#111' }],
    };

    expect(hasBoardSnapshotChanges(before, createBoardSnapshot(changedBook))).toBe(true);
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
    const book = createBook();
    const baseline = createBoardSnapshot(book);

    expect(createAutomaticBoardVersionOnExit(book, baseline, 20, 'exit-version')).toBeNull();
  });
});
