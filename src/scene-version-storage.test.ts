import { beforeEach, describe, expect, it } from 'vitest';
import type { Book, SceneVersion } from '../types';
import {
  createSceneVersionFromScene,
} from './scene-history';
import {
  LOCAL_SCENE_VERSIONS_KEY,
  LocalSceneVersionStorageProvider,
  SceneVersionStorageService,
  getSceneVersionDocumentPath,
} from './scene-version-storage';

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

class SpyLocalSceneVersionStorageProvider extends LocalSceneVersionStorageProvider {
  saveCalls: SceneVersion[] = [];

  async saveSceneVersion(version: SceneVersion): Promise<void> {
    this.saveCalls.push(version);
    await super.saveSceneVersion(version);
  }
}

const createVersion = (
  id: string,
  bookId: string,
  sceneId: string,
  createdAt: number,
  versionType: SceneVersion['versionType'] = 'manual'
): SceneVersion => ({
  id,
  bookId,
  sceneId,
  sceneTitle: `Scene ${sceneId}`,
  content: `content ${id}`,
  createdAt,
  versionType,
  reason: 'manual',
});

const createBook = (id: string): Book => ({
  id,
  title: `Book ${id}`,
  ownerId: 'user-1',
  updatedAt: 1,
  createdAt: 1,
  syncStatus: 'local_only',
  pendingSync: false,
  plotlines: [],
  scenes: [],
});

describe('scene version storage', () => {
  let provider: LocalSceneVersionStorageProvider;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: new MemoryStorage(),
      configurable: true,
    });
    provider = new LocalSceneVersionStorageProvider();
  });

  it('saving a version does not change the book object', async () => {
    const book = createBook('book-1');
    const before = JSON.stringify(book);

    await provider.saveSceneVersion(createVersion('v1', 'book-1', 'scene-1', 1));

    expect(JSON.stringify(book)).toBe(before);
  });

  it('loading a book does not load scene history into the book object', async () => {
    const book = createBook('book-1');
    await provider.saveSceneVersion(createVersion('v1', 'book-1', 'scene-1', 1));

    expect('sceneVersions' in book).toBe(false);
  });

  it('loads only versions for the requested book and scene', async () => {
    await provider.saveSceneVersion(createVersion('v1', 'book-1', 'scene-1', 1));
    await provider.saveSceneVersion(createVersion('v2', 'book-1', 'scene-2', 2));
    await provider.saveSceneVersion(createVersion('v3', 'book-2', 'scene-1', 3));
    await provider.saveSceneVersion(createVersion('v4', 'book-1', 'scene-1', 4));

    const versions = await provider.loadSceneVersions('book-1', 'scene-1');

    expect(versions.map(version => version.id)).toEqual(['v4', 'v1']);
  });

  it('keeps versions from different books and scenes separate', async () => {
    await provider.saveSceneVersion(createVersion('v1', 'book-1', 'scene-1', 1));
    await provider.saveSceneVersion(createVersion('v2', 'book-1', 'scene-2', 2));
    await provider.saveSceneVersion(createVersion('v3', 'book-2', 'scene-1', 3));

    expect(await provider.loadSceneVersions('book-1', 'scene-2')).toHaveLength(1);
    expect(await provider.loadSceneVersions('book-2', 'scene-1')).toHaveLength(1);
    expect(await provider.loadSceneVersions('book-2', 'scene-2')).toHaveLength(0);
  });

  it('migrates legacy book-embedded versions without losing data and strips the book field', async () => {
    const service = new SceneVersionStorageService(provider, provider as unknown as never);
    const legacyBook = {
      ...createBook('book-1'),
      sceneVersions: [
        createVersion('v1', 'book-1', 'scene-1', 1),
        createVersion('v2', 'book-1', 'scene-2', 2),
      ],
    };

    const migrated = await service.migrateLegacySceneVersionsFromBooks([legacyBook]);
    const rawVersions = JSON.parse(localStorage.getItem(LOCAL_SCENE_VERSIONS_KEY) || '[]') as SceneVersion[];

    expect(migrated[0]).not.toHaveProperty('sceneVersions');
    expect(rawVersions.map(version => version.id).sort()).toEqual(['v1', 'v2']);
  });

  it('persists a small scene-change snapshot before switching the active scene', async () => {
    const order: string[] = [];
    const sceneSnapshot = {
      id: 'scene-old',
      plotlineId: 'plotline-1',
      title: 'Old scene',
      content: 'last typed words',
      position: 0,
    };
    const version = createSceneVersionFromScene({
      scene: sceneSnapshot,
      versions: [],
      bookId: 'book-1',
      versionType: 'automatic',
      reason: 'scene_change',
      id: 'scene-change',
      now: 10,
    });

    expect(version).not.toBeNull();

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        void provider.saveSceneVersion(version!).then(() => {
          order.push('saved');
          resolve();
        });
      }, 0);
    });
    order.push('active-scene-changed');

    const oldSceneHistory = await provider.loadSceneVersions('book-1', 'scene-old');
    const newSceneHistory = await provider.loadSceneVersions('book-1', 'scene-new');

    expect(order).toEqual(['saved', 'active-scene-changed']);
    expect(oldSceneHistory).toHaveLength(1);
    expect(oldSceneHistory[0].content).toBe('last typed words');
    expect(newSceneHistory).toHaveLength(0);
  });

  it('calls saveSceneVersion and loadSceneVersions returns the saved version', async () => {
    const spyProvider = new SpyLocalSceneVersionStorageProvider();
    const version = createVersion('saved-version', 'book-1', 'scene-1', 20);

    await spyProvider.saveSceneVersion(version);
    const loaded = await spyProvider.loadSceneVersions('book-1', 'scene-1');

    expect(spyProvider.saveCalls.map(call => call.id)).toEqual(['saved-version']);
    expect(loaded.map(item => item.id)).toEqual(['saved-version']);
  });

  it('deletes an automatic scene version', async () => {
    await provider.saveSceneVersion(createVersion('auto-version', 'book-1', 'scene-1', 1, 'automatic'));

    await provider.deleteSceneVersion('book-1', 'auto-version');

    expect(await provider.loadSceneVersions('book-1', 'scene-1')).toHaveLength(0);
  });

  it('deletes a manual scene version', async () => {
    await provider.saveSceneVersion(createVersion('manual-version', 'book-1', 'scene-1', 1, 'manual'));

    await provider.deleteSceneVersion('book-1', 'manual-version');

    expect(await provider.loadSceneVersions('book-1', 'scene-1')).toHaveLength(0);
  });

  it('does not delete before_delete scene versions', async () => {
    await provider.saveSceneVersion(createVersion('protected-version', 'book-1', 'scene-1', 1, 'before_delete'));

    await expect(provider.deleteSceneVersion('book-1', 'protected-version')).rejects.toThrow('cannot be deleted');
    expect(await provider.loadSceneVersions('book-1', 'scene-1')).toHaveLength(1);
  });

  it('does not delete restored scene versions', async () => {
    await provider.saveSceneVersion(createVersion('restored-version', 'book-1', 'scene-1', 1, 'restored'));

    await expect(provider.deleteSceneVersion('book-1', 'restored-version')).rejects.toThrow('cannot be deleted');
    expect(await provider.loadSceneVersions('book-1', 'scene-1')).toHaveLength(1);
  });

  it('deletes only the requested version and keeps other books and scenes intact', async () => {
    await provider.saveSceneVersion(createVersion('delete-me', 'book-1', 'scene-1', 1));
    await provider.saveSceneVersion(createVersion('keep-scene', 'book-1', 'scene-2', 2));
    await provider.saveSceneVersion(createVersion('keep-book', 'book-2', 'scene-1', 3));

    await provider.deleteSceneVersion('book-1', 'delete-me');

    expect(await provider.loadSceneVersions('book-1', 'scene-1')).toHaveLength(0);
    expect((await provider.loadSceneVersions('book-1', 'scene-2')).map(version => version.id)).toEqual(['keep-scene']);
    expect((await provider.loadSceneVersions('book-2', 'scene-1')).map(version => version.id)).toEqual(['keep-book']);
  });

  it('keeps local deletion persisted after reloading the provider', async () => {
    await provider.saveSceneVersion(createVersion('delete-me', 'book-1', 'scene-1', 1));
    await provider.deleteSceneVersion('book-1', 'delete-me');

    const reloadedProvider = new LocalSceneVersionStorageProvider();

    expect(await reloadedProvider.loadSceneVersions('book-1', 'scene-1')).toHaveLength(0);
  });

  it('throws when deleting a version that does not exist', async () => {
    await expect(provider.deleteSceneVersion('book-1', 'missing-version')).rejects.toThrow('not found');
  });

  it('uses the exact Firestore document path for a single scene version delete', () => {
    expect(getSceneVersionDocumentPath('book-1', 'version-1')).toEqual([
      'books',
      'book-1',
      'sceneVersions',
      'version-1',
    ]);
  });

  it.each(['automatic', 'manual', 'before_delete', 'restored'] as const)(
    'renames a %s scene version',
    async (versionType) => {
      await provider.saveSceneVersion(createVersion(`rename-${versionType}`, 'book-1', 'scene-1', 1, versionType));

      await provider.renameSceneVersion('book-1', `rename-${versionType}`, 'New name');

      const [renamed] = await provider.loadSceneVersions('book-1', 'scene-1');
      expect(renamed.name).toBe('New name');
      expect(renamed.versionType).toBe(versionType);
      expect(renamed.content).toBe(`content rename-${versionType}`);
    }
  );

  it('persists renamed scene version names after reloading the provider', async () => {
    await provider.saveSceneVersion(createVersion('rename-me', 'book-1', 'scene-1', 1));

    await provider.renameSceneVersion('book-1', 'rename-me', '  Trimmed name  ');

    const reloadedProvider = new LocalSceneVersionStorageProvider();
    const [renamed] = await reloadedProvider.loadSceneVersions('book-1', 'scene-1');
    expect(renamed.name).toBe('Trimmed name');
  });

  it('removes a previous scene version name when renaming to empty', async () => {
    await provider.saveSceneVersion({
      ...createVersion('clear-name', 'book-1', 'scene-1', 1),
      name: 'Old name',
    });

    await provider.renameSceneVersion('book-1', 'clear-name', '   ');

    const [renamed] = await provider.loadSceneVersions('book-1', 'scene-1');
    expect(renamed.name).toBeUndefined();
  });

  it('renaming does not change scene version content, reason, version type, or createdAt', async () => {
    const original = {
      ...createVersion('metadata-only', 'book-1', 'scene-1', 12, 'automatic'),
      reason: 'scene_change' as const,
    };
    await provider.saveSceneVersion(original);

    await provider.renameSceneVersion('book-1', 'metadata-only', 'Metadata only');

    const [renamed] = await provider.loadSceneVersions('book-1', 'scene-1');
    expect(renamed).toMatchObject({
      content: original.content,
      reason: original.reason,
      versionType: original.versionType,
      createdAt: original.createdAt,
      name: 'Metadata only',
    });
  });

  it('renaming does not create a new scene version', async () => {
    await provider.saveSceneVersion(createVersion('single-version', 'book-1', 'scene-1', 1));

    await provider.renameSceneVersion('book-1', 'single-version', 'Renamed');

    expect(await provider.loadSceneVersions('book-1', 'scene-1')).toHaveLength(1);
  });

  it('does not rename versions from another book', async () => {
    await provider.saveSceneVersion(createVersion('same-id', 'book-1', 'scene-1', 1));
    await provider.saveSceneVersion(createVersion('same-id', 'book-2', 'scene-1', 2));

    await provider.renameSceneVersion('book-1', 'same-id', 'Book one');

    expect((await provider.loadSceneVersions('book-1', 'scene-1'))[0].name).toBe('Book one');
    expect((await provider.loadSceneVersions('book-2', 'scene-1'))[0].name).toBeUndefined();
  });

  it('keeps the old name when renaming fails validation', async () => {
    await provider.saveSceneVersion({
      ...createVersion('invalid-name', 'book-1', 'scene-1', 1),
      name: 'Old name',
    });

    await expect(provider.renameSceneVersion('book-1', 'invalid-name', '<script>bad</script>')).rejects.toThrow('HTML');

    const [version] = await provider.loadSceneVersions('book-1', 'scene-1');
    expect(version.name).toBe('Old name');
  });
});
