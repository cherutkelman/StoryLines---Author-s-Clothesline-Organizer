import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project, SceneVersion } from '../types';
import BoardVersionHistorySidebar from '../components/BoardVersionHistorySidebar';
import { FirestoreStorageProvider } from '../storage/firestore-provider';
import { FirestoreSceneVersionStorageProvider } from './scene-version-storage';
import { groupMissingSceneVersions, readSceneInventory } from './deleted-scene-history';
import {
  describeSceneVersionContent,
  getDeletedSceneScanResults,
  reduceDeletedSceneScan,
  startDeletedSceneScan,
} from './deleted-scene-scan';

const firestore = vi.hoisted(() => ({
  doc: vi.fn((...path: unknown[]) => path),
  collection: vi.fn((...path: unknown[]) => path),
  getDocFromServer: vi.fn(),
  getDocsFromServer: vi.fn(),
  query: vi.fn((...parts: unknown[]) => parts),
  documentId: vi.fn(() => '__name__'),
  orderBy: vi.fn(),
  startAfter: vi.fn(),
  limit: vi.fn(),
}));
vi.mock('firebase/firestore', async importOriginal => ({
  ...await importOriginal<typeof import('firebase/firestore')>(),
  ...firestore,
}));
vi.mock('./firebase', () => ({ db: {}, auth: {} }));

const emptyProject: Project = { scenes: [], plotlines: [] };
const hiddenScene = { id: 'hidden', plotlineId: 'missing-plotline', title: '', content: '', position: 0 };
const version = (sceneId: string, createdAt = 1, bookId = 'book'): SceneVersion => ({
  id: `${sceneId}-${createdAt}`, sceneId, bookId, createdAt,
  sceneTitle: sceneId, content: 'Full scene text', versionType: 'manual', reason: 'manual',
});
const bookSnapshot = (data: object | undefined, hasPendingWrites = false) => ({
  data: () => data, metadata: { hasPendingWrites },
});

describe('deleted scene history', () => {
  beforeEach(() => vi.resetAllMocks());

  it('excludes hidden and orphaned scenes, groups missing versions newest first and scopes the book', () => {
    const active = { ...emptyProject, scenes: [hiddenScene] };
    const stored = readSceneInventory(emptyProject);
    const groups = groupMissingSceneVersions('book', active, stored, [
      version('hidden'), version('deleted'), version('deleted', 2), version('foreign', 1, 'other'),
    ]);
    expect(groups).toEqual([{
      sceneId: 'deleted', title: 'deleted', verified: true,
      versions: [version('deleted', 2), version('deleted')],
    }]);
  });

  it('does not treat normalized empty arrays as proof when the source book is partial', () => {
    const partial = readSceneInventory({ scenes: [] });
    expect(groupMissingSceneVersions('book', emptyProject, partial, [version('deleted')])[0].verified).toBe(false);
  });

  it('keeps a scene referenced by the current sequence unverified', () => {
    const active: Project = {
      ...emptyProject, bookSequence: [{ id: 'item', type: 'scene', sceneId: 'deleted' }],
    };
    const groups = groupMissingSceneVersions('book', active, readSceneInventory(emptyProject), [version('deleted')]);
    expect(groups[0].verified).toBe(false);
  });

  it('reads both split sources before verifying absence, even if a stored scene is absent from the active project', async () => {
    firestore.getDocFromServer.mockResolvedValueOnce(bookSnapshot({ id: 'book' }))
      .mockResolvedValueOnce(bookSnapshot({ plotlines: [] }));
    firestore.getDocsFromServer.mockResolvedValue({
      docs: [{ id: hiddenScene.id, data: () => hiddenScene }], metadata: { hasPendingWrites: false },
    });

    const stored = await new FirestoreStorageProvider().readBookSceneInventory('book');
    expect(firestore.collection).toHaveBeenCalledWith(expect.any(Array), 'scenes');
    expect(firestore.doc).toHaveBeenCalledWith(expect.any(Array), 'content', 'sceneStructure');
    const groups = groupMissingSceneVersions('book', emptyProject, stored, [version('hidden'), version('deleted')]);
    expect(groups.map(group => [group.sceneId, group.verified])).toEqual([['deleted', true]]);
  });

  it('does not verify absence if the split scene collection could not be read', async () => {
    firestore.getDocFromServer.mockResolvedValue(bookSnapshot({ id: 'book', plotlines: [] }));
    firestore.getDocsFromServer.mockRejectedValue({ code: 'permission-denied' });
    const stored = await new FirestoreStorageProvider().readBookSceneInventory('book');
    expect(stored.complete).toBe(false);
  });

  it('uses one source read for a complete inline book and rejects pending writes as evidence', async () => {
    const provider = new FirestoreStorageProvider();
    firestore.getDocFromServer.mockResolvedValueOnce(bookSnapshot({ id: 'book', ...emptyProject }))
      .mockResolvedValueOnce(bookSnapshot({ id: 'book', ...emptyProject }, true));
    expect((await provider.readBookSceneInventory('book')).complete).toBe(true);
    expect((await provider.readBookSceneInventory('book')).complete).toBe(false);
    expect(firestore.getDocFromServer).toHaveBeenCalledTimes(2);
    expect(firestore.getDocsFromServer).not.toHaveBeenCalled();
  });

  it('requests bounded Firestore pages and resumes after the last document', async () => {
    const provider = new FirestoreSceneVersionStorageProvider();
    const docs = Array.from({ length: 25 }, (_, index) => ({
      id: `version-${index}`, data: () => version('scene', index),
    }));
    firestore.getDocsFromServer.mockResolvedValueOnce({ docs, size: docs.length })
      .mockResolvedValueOnce({ docs: [], size: 0 });
    const first = await provider.loadSceneVersionPage('book');
    expect(first.versions).toHaveLength(25);
    expect(first.scannedCount).toBe(25);
    expect(firestore.limit).toHaveBeenCalledWith(25);
    expect(first.nextCursor).toBe('version-24');
    expect(await provider.loadSceneVersionPage('book', first.nextCursor)).toEqual({ versions: [], scannedCount: 0 });
    expect(firestore.startAfter).toHaveBeenCalledWith('version-24');
    expect(firestore.getDocsFromServer).toHaveBeenCalledTimes(2);
  });

  it('renders the content history inside the sidebar when boardVersions is empty', () => {
    const markup = renderToStaticMarkup(React.createElement(BoardVersionHistorySidebar, {
      isOpen: true,
      boardTitle: 'Book',
      onClose: vi.fn(),
      onLoadVersions: () => [],
      onPreviewVersion: vi.fn(),
      deletedSceneHistory: { bookId: 'book', project: emptyProject },
    }));
    expect(markup).toContain('סצנות שנמחקו');
    expect(markup).toContain('טוען גרסאות תוכן');
  });
});

describe('deleted scene scan progress', () => {
  const activeProject = { ...emptyProject, scenes: [hiddenScene] };
  const inventory = readSceneInventory(activeProject);
  const summarize = (state: ReturnType<typeof startDeletedSceneScan>) =>
    getDeletedSceneScanResults(state, activeProject, inventory);
  const load = (state: ReturnType<typeof startDeletedSceneScan>) =>
    reduceDeletedSceneScan(state, { type: 'load' });
  const receive = (
    state: ReturnType<typeof startDeletedSceneScan>, versions: SceneVersion[], nextCursor?: string,
  ) => reduceDeletedSceneScan(state, {
    type: 'success', request: state.request!,
    page: { versions, nextCursor, scannedCount: versions.length },
  });

  it('counts three pages even when the second adds no candidates, then exposes the older untitled version', () => {
    const initial = startDeletedSceneScan('book');
    const first = receive(initial, [version('deleted', 10)], 'first');
    const loadingSecond = load(first);
    expect(loadingSecond.request?.cursor).toBe('first');
    expect(load(loadingSecond)).toBe(loadingSecond);

    const second = receive(loadingSecond, [version('hidden'), version('deleted', 9)], 'second');
    expect(second.scannedCount).toBe(3);
    expect(summarize(second)).toMatchObject({ verifiedCount: 1, noNewMissingScenes: true });

    const loadingThird = load(second);
    expect(loadingThird.request?.cursor).toBe('second');
    const old: SceneVersion = {
      ...version('older'), sceneTitle: '', reason: 'scene_change', versionType: 'automatic',
    };
    const third = receive(loadingThird, [old]);
    expect(third.scannedCount).toBe(4);
    expect(third.nextCursor).toBeUndefined();
    expect(summarize(third)).toMatchObject({ verifiedCount: 2, noNewMissingScenes: false });
    expect(summarize(third).groups.find(group => group.sceneId === 'older')?.versions).toEqual([old]);
  });

  it('completes after an empty page following 25 results and keeps the earlier results', () => {
    const full = receive(startDeletedSceneScan('book'),
      Array.from({ length: 25 }, (_, index) => version('deleted', index)), 'last-doc');
    const complete = receive(load(full), []);
    expect(complete.scannedCount).toBe(25);
    expect(complete.nextCursor).toBeUndefined();
    expect(summarize(complete)).toMatchObject({ verifiedCount: 1, noNewMissingScenes: false });
    expect(load(complete)).toBe(complete);
  });

  it('keeps scanned documents on a permissions failure and retries the same cursor', () => {
    const first = receive(startDeletedSceneScan('book'), [version('deleted')], 'cursor');
    const pending = load(first);
    const failed = reduceDeletedSceneScan(pending, {
      type: 'failure', request: pending.request!, error: { code: 'permission-denied' },
    });
    expect(failed.error).toBe('permission-denied');
    expect(failed.scannedCount).toBe(1);
    expect(summarize(failed).verifiedCount).toBe(1);

    const retry = load(failed);
    expect(retry.request?.cursor).toBe(pending.request?.cursor);
    expect(retry.request).not.toBe(pending.request);
    expect(retry.error).toBeUndefined();
    expect(summarize(receive(retry, [version('second')])).verifiedCount).toBe(2);
  });

  it('ignores a response from the previous book after switching during loading', () => {
    const previousBook = load(receive(startDeletedSceneScan('book'), [version('old')], 'cursor'));
    const nextBook = startDeletedSceneScan('next-book');
    const lateResult = reduceDeletedSceneScan(nextBook, {
      type: 'success', request: previousBook.request!,
      page: { versions: [version('late')], scannedCount: 1, nextCursor: 'old-next' },
    });
    expect(lateResult).toBe(nextBook);
    expect(lateResult.scannedCount).toBe(0);
    const nextResult = receive(nextBook, [version('new', 1, 'next-book')]);
    expect(summarize(nextResult).groups.map(group => group.sceneId)).toEqual(['new']);
  });

  it('distinguishes an empty string from a missing field and preserves full text', () => {
    expect(describeSceneVersionContent('')).toBe('הגרסה נשמרה עם תוכן ריק.');
    expect(describeSceneVersionContent(undefined)).toBe('שדה התוכן חסר או אינו תקין במסמך הגרסה.');
    expect(describeSceneVersionContent('Full scene text\nSecond line')).toBe('Full scene text\nSecond line');
  });
});
