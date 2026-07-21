import { beforeEach, describe, expect, it } from 'vitest';
import type { BoardVersion, Book, SceneVersion } from '../types';
import { createBoardVersion } from './board-history';
import {
  LOCAL_BOARD_VERSIONS_KEY,
  LocalBoardVersionStorageProvider,
  getBoardVersionDocumentPath,
} from './board-version-storage';
import { LOCAL_SCENE_VERSIONS_KEY, LocalSceneVersionStorageProvider } from './scene-version-storage';

class MemoryStorage {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }
}

const createBook = (id: string): Book => ({
  id,
  title: `Book ${id}`,
  ownerId: 'user-1',
  createdAt: 1,
  updatedAt: 1,
  syncStatus: 'local_only',
  pendingSync: false,
  plotlines: [{ id: 'p1', name: 'Main', color: '#000' }],
  scenes: [{ id: 's1', plotlineId: 'p1', title: 'Scene', content: 'content', position: 0 }],
});

const createSceneVersion = (id: string): SceneVersion => ({
  id,
  bookId: 'book-1',
  sceneId: 's1',
  sceneTitle: 'Scene',
  content: 'scene content',
  createdAt: 1,
  versionType: 'manual',
  reason: 'manual',
});

describe('board version storage', () => {
  let provider: LocalBoardVersionStorageProvider;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: new MemoryStorage(),
      configurable: true,
    });
    provider = new LocalBoardVersionStorageProvider();
  });

  it('saves and loads board versions from local storage', async () => {
    const version = createBoardVersion({
      book: createBook('book-1'),
      versionType: 'automatic',
      reason: 'board_exit',
      now: 2,
      id: 'board-version-1',
    });

    await provider.saveBoardVersion(version);

    expect((await provider.loadBoardVersions('book-1')).map(item => item.id)).toEqual(['board-version-1']);
  });

  it('loads only board versions for the requested book', async () => {
    await provider.saveBoardVersion(createBoardVersion({
      book: createBook('book-1'),
      versionType: 'automatic',
      reason: 'board_exit',
      now: 1,
      id: 'book-1-version',
    }));
    await provider.saveBoardVersion(createBoardVersion({
      book: createBook('book-2'),
      versionType: 'automatic',
      reason: 'board_exit',
      now: 2,
      id: 'book-2-version',
    }));

    expect((await provider.loadBoardVersions('book-1')).map(item => item.id)).toEqual(['book-1-version']);
  });

  it('persists board versions after reloading the provider', async () => {
    await provider.saveBoardVersion(createBoardVersion({
      book: createBook('book-1'),
      versionType: 'automatic',
      reason: 'board_exit',
      now: 1,
      id: 'persisted',
    }));

    const reloadedProvider = new LocalBoardVersionStorageProvider();

    expect((await reloadedProvider.loadBoardVersions('book-1')).map(item => item.id)).toEqual(['persisted']);
  });

  it('keeps board versions isolated from scene versions', async () => {
    const sceneProvider = new LocalSceneVersionStorageProvider();
    await sceneProvider.saveSceneVersion(createSceneVersion('scene-version-1'));
    await provider.saveBoardVersion(createBoardVersion({
      book: createBook('book-1'),
      versionType: 'automatic',
      reason: 'board_exit',
      now: 1,
      id: 'board-version-1',
    }));

    const rawBoardVersions = JSON.parse(localStorage.getItem(LOCAL_BOARD_VERSIONS_KEY) || '[]') as BoardVersion[];
    const rawSceneVersions = JSON.parse(localStorage.getItem(LOCAL_SCENE_VERSIONS_KEY) || '[]') as SceneVersion[];

    expect(rawBoardVersions.map(version => version.id)).toEqual(['board-version-1']);
    expect(rawSceneVersions.map(version => version.id)).toEqual(['scene-version-1']);
  });

  it('uses the exact Firestore document path for a board version', () => {
    expect(getBoardVersionDocumentPath('book-1', 'board-version-1')).toEqual([
      'books',
      'book-1',
      'boardVersions',
      'board-version-1',
    ]);
  });
});
