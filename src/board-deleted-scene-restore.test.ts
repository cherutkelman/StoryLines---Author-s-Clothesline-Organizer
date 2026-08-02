import { describe, expect, it } from 'vitest';
import type { BoardSnapshot, Book, Scene, SceneVersion } from '../types';
import {
  chooseSceneVersionForDeletedSceneRestore,
  findBoardSnapshotScenesMissingFromCurrent,
  getHistoricalChapterForScene,
  restoreDeletedSceneFromBoardSnapshot,
} from './board-deleted-scene-restore';
import { getOrderedSceneIds } from './book-sequence';

const scene = (id: string, position: number, plotlineId = 'p1', title = id): Scene => ({
  id,
  plotlineId,
  title,
  content: `${title} content`,
  summary: `${title} summary`,
  position,
  isCompleted: false,
});

const stripContent = (item: Scene): Omit<Scene, 'content'> => {
  const { content: _content, ...withoutContent } = item;
  return withoutContent;
};

const book = (overrides: Partial<Book> = {}): Book => ({
  id: 'book-1',
  ownerId: 'user-1',
  title: 'Book',
  createdAt: 1,
  updatedAt: 1,
  syncStatus: 'synced',
  pendingSync: false,
  plotlines: [
    { id: 'p1', name: 'Main', color: '#111' },
    { id: 'p2', name: 'Side', color: '#222' },
  ],
  scenes: [scene('s1', 0), scene('s2', 1), scene('s3', 2)],
  chapterMarkers: [
    { id: 'c1', title: 'Chapter 1', position: 0 },
    { id: 'c2', title: 'Chapter 2', position: 2 },
  ],
  bookSequence: [
    { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
    { id: 'scene:s1', type: 'scene', sceneId: 's1' },
    { id: 'scene:s2', type: 'scene', sceneId: 's2' },
    { id: 'chapter:c2', type: 'chapter-divider', chapterId: 'c2' },
    { id: 'scene:s3', type: 'scene', sceneId: 's3' },
  ],
  ...overrides,
});

const snapshot = (source: Book): BoardSnapshot => ({
  plotlines: source.plotlines,
  scenes: source.scenes.map(stripContent),
  chapterMarkers: source.chapterMarkers,
  bookSequence: source.bookSequence,
});

const version = (overrides: Partial<SceneVersion> = {}): SceneVersion => ({
  id: 'sv-1',
  bookId: 'book-1',
  sceneId: 's2',
  sceneTitle: 'Historical title',
  content: 'Full restored text',
  createdAt: 100,
  versionType: 'before_delete',
  reason: 'before_delete',
  ...overrides,
});

describe('deleted board scene restore helpers', () => {
  it('detects a scene that exists in a board snapshot and is missing from the current book', () => {
    const historical = snapshot(book());
    const current = book({ scenes: [scene('s1', 0), scene('s3', 1)] });

    expect(findBoardSnapshotScenesMissingFromCurrent(historical, current).map(item => item.id)).toEqual(['s2']);
  });

  it('does not mark scenes that exist in both the snapshot and the current book', () => {
    const historical = snapshot(book());
    const current = book();

    expect(findBoardSnapshotScenesMissingFromCurrent(historical, current)).toEqual([]);
  });

  it('uses the newest scene version as the text source', () => {
    expect(chooseSceneVersionForDeletedSceneRestore([
      version({ id: 'old', createdAt: 10, content: 'old' }),
      version({ id: 'new', createdAt: 20, content: 'new' }),
    ])?.content).toBe('new');
  });

  it('restores a missing scene with the same sceneId when there is no collision', () => {
    const historicalBook = book();
    const current = book({
      scenes: [scene('s1', 0), scene('s3', 1)],
      bookSequence: [
        { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'chapter:c2', type: 'chapter-divider', chapterId: 'c2' },
        { id: 'scene:s3', type: 'scene', sceneId: 's3' },
      ],
    });

    const result = restoreDeletedSceneFromBoardSnapshot(current, snapshot(historicalBook), 's2', version());

    expect(result.status).toBe('restored');
    expect(result.scene?.id).toBe('s2');
    expect(result.updates?.scenes.find(item => item.id === 's2')?.content).toBe('Full restored text');
    expect(result.updates?.scenes.find(item => item.id === 's2')?.restoredFromVersionId).toBe('sv-1');
    expect(getOrderedSceneIds({ ...current, ...result.updates })).toEqual(['s1', 's2', 's3']);
  });

  it('keeps existing scene history connected by preserving the historical sceneId', () => {
    const current = book({ scenes: [scene('s1', 0), scene('s3', 1)] });
    const result = restoreDeletedSceneFromBoardSnapshot(current, snapshot(book()), 's2', version({ sceneId: 's2' }));

    expect(result.updates?.bookSequence).toContainEqual({ id: 'scene:s2', type: 'scene', sceneId: 's2' });
  });

  it('returns a clear status when no text version exists', () => {
    const current = book({ scenes: [scene('s1', 0), scene('s3', 1)] });
    const result = restoreDeletedSceneFromBoardSnapshot(current, snapshot(book()), 's2', null);

    expect(result.status).toBe('missing_text_version');
    expect(result.updates).toBeUndefined();
  });

  it('restores to the historical plotline when it still exists', () => {
    const historicalBook = book({
      scenes: [scene('s1', 0), scene('s2', 1, 'p2'), scene('s3', 2)],
    });
    const current = book({ scenes: [scene('s1', 0), scene('s3', 1)] });

    const result = restoreDeletedSceneFromBoardSnapshot(current, snapshot(historicalBook), 's2', version());

    expect(result.updates?.scenes.find(item => item.id === 's2')?.plotlineId).toBe('p2');
  });

  it('falls back to the first current plotline when the historical plotline is missing', () => {
    const historicalBook = book({
      scenes: [scene('s1', 0), scene('s2', 1, 'missing-plotline'), scene('s3', 2)],
    });
    const current = book({
      scenes: [scene('s1', 0), scene('s3', 1)],
      plotlines: [{ id: 'p1', name: 'Main', color: '#111' }],
    });

    const result = restoreDeletedSceneFromBoardSnapshot(current, snapshot(historicalBook), 's2', version());

    expect(result.status).toBe('restored');
    expect(result.updates?.scenes.find(item => item.id === 's2')?.plotlineId).toBe('p1');
  });

  it('falls back safely when the historical chapter no longer exists', () => {
    const historical = snapshot(book());
    const current = book({
      scenes: [scene('s1', 0), scene('s3', 1)],
      chapterMarkers: [{ id: 'c1', title: 'Chapter 1', position: 0 }],
      bookSequence: [
        { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'scene:s3', type: 'scene', sceneId: 's3' },
      ],
    });

    const result = restoreDeletedSceneFromBoardSnapshot(current, historical, 's2', version());

    expect(result.status).toBe('restored');
    expect(result.updates?.bookSequence.map(item => item.id)).toEqual(['chapter:c1', 'scene:s1', 'scene:s2', 'scene:s3']);
    expect(result.updates?.chapterMarkers).toEqual([{ id: 'c1', title: 'Chapter 1', position: 0 }]);
  });

  it('identifies the historical chapter for confirmation copy', () => {
    expect(getHistoricalChapterForScene(snapshot(book()), 's3')?.title).toBe('Chapter 2');
  });

  it('does not restore over an existing scene with the same sceneId', () => {
    const result = restoreDeletedSceneFromBoardSnapshot(book(), snapshot(book()), 's2', version());

    expect(result.status).toBe('already_exists');
    expect(result.updates).toBeUndefined();
  });

  it('does not change other scenes beyond required position normalization', () => {
    const current = book({ scenes: [scene('s1', 0), scene('s3', 1)] });
    const result = restoreDeletedSceneFromBoardSnapshot(current, snapshot(book()), 's2', version());
    const s1 = result.updates?.scenes.find(item => item.id === 's1');
    const s3 = result.updates?.scenes.find(item => item.id === 's3');

    expect(s1).toMatchObject({ id: 's1', title: 's1', content: 's1 content', plotlineId: 'p1' });
    expect(s3).toMatchObject({ id: 's3', title: 's3', content: 's3 content', plotlineId: 'p1' });
  });
});
