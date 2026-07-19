import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { Book, SceneVersion } from '../types';
import { db } from './firebase';
import { isWeb } from './platform';
import { storageManager } from '../storage';
import { logSceneHistoryDebug } from './scene-history-debug';
import { canDeleteSceneVersion, normalizeSceneVersionName } from './scene-history';

const LOCAL_SCENE_VERSIONS_KEY = 'storylines_scene_versions_v1';
export const getSceneVersionDocumentPath = (bookId: string, versionId: string) =>
  ['books', bookId, 'sceneVersions', versionId] as const;

export interface SceneVersionStorageProvider {
  saveSceneVersion(version: SceneVersion): Promise<void>;
  loadSceneVersions(bookId: string, sceneId: string): Promise<SceneVersion[]>;
  renameSceneVersion(bookId: string, versionId: string, name?: string): Promise<void>;
  deleteSceneVersion(bookId: string, versionId: string): Promise<void>;
  deleteSceneVersionsForScene(bookId: string, sceneId: string): Promise<void>;
  loadAllSceneVersionsForBook?(bookId: string): Promise<SceneVersion[]>;
}

const sortNewestFirst = (versions: SceneVersion[]) =>
  [...versions].sort((a, b) => b.createdAt - a.createdAt);

const getStoredVersionKey = (version: SceneVersion) => `${version.bookId}:${version.id}`;

export const stripLegacySceneVersionsFromBook = <T extends Book>(book: T): T => {
  const { sceneVersions: _sceneVersions, ...cleanBook } = book as T & { sceneVersions?: SceneVersion[] };
  return cleanBook as T;
};

export class LocalSceneVersionStorageProvider implements SceneVersionStorageProvider {
  private loadAll(): SceneVersion[] {
    const saved = localStorage.getItem(LOCAL_SCENE_VERSIONS_KEY);
    if (!saved) return [];

    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('[LocalSceneVersionStorageProvider] Failed to parse scene versions', error);
      return [];
    }
  }

  private saveAll(versions: SceneVersion[]) {
    localStorage.setItem(LOCAL_SCENE_VERSIONS_KEY, JSON.stringify(versions));
  }

  async saveSceneVersion(version: SceneVersion): Promise<void> {
    logSceneHistoryDebug('saveSceneVersion called', {
      storage: 'local',
      bookId: version.bookId,
      sceneId: version.sceneId,
      versionId: version.id,
    });
    const versions = this.loadAll();
    const existingIndex = versions.findIndex(item => item.bookId === version.bookId && item.id === version.id);
    if (existingIndex >= 0) {
      versions[existingIndex] = version;
    } else {
      versions.push(version);
    }
    this.saveAll(versions);
    logSceneHistoryDebug('saveSceneVersion success', {
      storage: 'local',
      bookId: version.bookId,
      sceneId: version.sceneId,
      versionId: version.id,
    });
  }

  async saveSceneVersions(versionsToSave: SceneVersion[]): Promise<void> {
    const map = new Map(this.loadAll().map(version => [getStoredVersionKey(version), version]));
    versionsToSave.forEach(version => map.set(getStoredVersionKey(version), version));
    this.saveAll(Array.from(map.values()));
  }

  async loadSceneVersions(bookId: string, sceneId: string): Promise<SceneVersion[]> {
    return sortNewestFirst(
      this.loadAll().filter(version => version.bookId === bookId && version.sceneId === sceneId)
    );
  }

  async loadAllSceneVersionsForBook(bookId: string): Promise<SceneVersion[]> {
    return sortNewestFirst(this.loadAll().filter(version => version.bookId === bookId));
  }

  async renameSceneVersion(bookId: string, versionId: string, name?: string): Promise<void> {
    const normalizedName = normalizeSceneVersionName(name);
    const versions = this.loadAll();
    const versionIndex = versions.findIndex(item => item.bookId === bookId && item.id === versionId);
    if (versionIndex < 0) {
      throw new Error('Scene version was not found.');
    }

    versions[versionIndex] = {
      ...versions[versionIndex],
      name: normalizedName,
    };

    if (!normalizedName) {
      delete versions[versionIndex].name;
    }

    this.saveAll(versions);
  }

  async deleteSceneVersion(bookId: string, versionId: string): Promise<void> {
    const versions = this.loadAll();
    const version = versions.find(item => item.bookId === bookId && item.id === versionId);
    if (!version) {
      throw new Error('Scene version was not found.');
    }
    if (!canDeleteSceneVersion(version)) {
      throw new Error('This scene version cannot be deleted.');
    }
    this.saveAll(versions.filter(item => item.bookId !== bookId || item.id !== versionId));
  }

  async deleteSceneVersionsForScene(bookId: string, sceneId: string): Promise<void> {
    this.saveAll(this.loadAll().filter(version => version.bookId !== bookId || version.sceneId !== sceneId));
  }
}

export class FirestoreSceneVersionStorageProvider implements SceneVersionStorageProvider {
  private getVersionsCollection(bookId: string) {
    return collection(db, 'books', bookId, 'sceneVersions');
  }

  async saveSceneVersion(version: SceneVersion): Promise<void> {
    logSceneHistoryDebug('saveSceneVersion called', {
      storage: 'Firestore',
      bookId: version.bookId,
      sceneId: version.sceneId,
      versionId: version.id,
    });
    try {
      await setDoc(doc(db, 'books', version.bookId, 'sceneVersions', version.id), this.removeUndefined(version));
      logSceneHistoryDebug('saveSceneVersion success', {
        storage: 'Firestore',
        bookId: version.bookId,
        sceneId: version.sceneId,
        versionId: version.id,
      });
    } catch (error) {
      logSceneHistoryDebug('saveSceneVersion error', {
        storage: 'Firestore',
        bookId: version.bookId,
        sceneId: version.sceneId,
        versionId: version.id,
        error,
      });
      throw error;
    }
  }

  async saveSceneVersions(versions: SceneVersion[]): Promise<void> {
    await Promise.all(versions.map(version => this.saveSceneVersion(version)));
  }

  async loadSceneVersions(bookId: string, sceneId: string): Promise<SceneVersion[]> {
    const versionsQuery = query(this.getVersionsCollection(bookId), where('sceneId', '==', sceneId));
    const snap = await getDocs(versionsQuery);
    return sortNewestFirst(snap.docs.map(docSnap => docSnap.data() as SceneVersion));
  }

  async loadAllSceneVersionsForBook(bookId: string): Promise<SceneVersion[]> {
    const snap = await getDocs(this.getVersionsCollection(bookId));
    return sortNewestFirst(snap.docs.map(docSnap => docSnap.data() as SceneVersion));
  }

  async renameSceneVersion(bookId: string, versionId: string, name?: string): Promise<void> {
    const normalizedName = normalizeSceneVersionName(name);
    const versionRef = doc(db, ...getSceneVersionDocumentPath(bookId, versionId));
    const snap = await getDoc(versionRef);
    if (!snap.exists()) {
      throw new Error('Scene version was not found.');
    }

    const version = snap.data() as SceneVersion;
    if (version.bookId !== bookId || version.id !== versionId) {
      throw new Error('Scene version does not match the requested book.');
    }

    await updateDoc(versionRef, {
      name: normalizedName ?? deleteField(),
    });
  }

  async deleteSceneVersion(bookId: string, versionId: string): Promise<void> {
    const versionRef = doc(db, ...getSceneVersionDocumentPath(bookId, versionId));
    const snap = await getDoc(versionRef);
    if (!snap.exists()) {
      throw new Error('Scene version was not found.');
    }

    const version = snap.data() as SceneVersion;
    if (version.bookId !== bookId || version.id !== versionId) {
      throw new Error('Scene version does not match the requested book.');
    }
    if (!canDeleteSceneVersion(version)) {
      throw new Error('This scene version cannot be deleted.');
    }

    await deleteDoc(versionRef);
  }

  async deleteSceneVersionsForScene(bookId: string, sceneId: string): Promise<void> {
    const versions = await this.loadSceneVersions(bookId, sceneId);
    await Promise.all(versions.map(version => deleteDoc(doc(db, 'books', bookId, 'sceneVersions', version.id))));
  }

  private removeUndefined(value: unknown): unknown {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(item => this.removeUndefined(item));

    const clean: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, nestedValue]) => {
      if (nestedValue !== undefined) {
        clean[key] = this.removeUndefined(nestedValue);
      }
    });
    return clean;
  }
}

export class SceneVersionStorageService {
  constructor(
    private readonly localProvider = new LocalSceneVersionStorageProvider(),
    private readonly remoteProvider = new FirestoreSceneVersionStorageProvider()
  ) {}

  getProvider(): SceneVersionStorageProvider {
    return isWeb || storageManager.getMode() === 'cloud' ? this.remoteProvider : this.localProvider;
  }

  getLocalProvider(): LocalSceneVersionStorageProvider {
    return this.localProvider;
  }

  async saveSceneVersion(version: SceneVersion): Promise<void> {
    if (isWeb) {
      await this.remoteProvider.saveSceneVersion(version);
      return;
    }

    await this.localProvider.saveSceneVersion(version);

    if (storageManager.getMode() === 'cloud') {
      try {
        await this.remoteProvider.saveSceneVersion(version);
      } catch (error) {
        console.warn('[SceneVersionStorageService] Remote scene version save failed after local save.', error);
      }
    }
  }

  async loadSceneVersions(bookId: string, sceneId: string): Promise<SceneVersion[]> {
    if (isWeb) {
      return this.remoteProvider.loadSceneVersions(bookId, sceneId);
    }

    const localVersions = await this.localProvider.loadSceneVersions(bookId, sceneId);
    if (storageManager.getMode() !== 'cloud') return localVersions;

    try {
      const remoteVersions = await this.remoteProvider.loadSceneVersions(bookId, sceneId);
      return this.mergeVersions(localVersions, remoteVersions);
    } catch (error) {
      console.warn('[SceneVersionStorageService] Remote scene version load failed; using local versions.', error);
      return localVersions;
    }
  }

  async deleteSceneVersionsForScene(bookId: string, sceneId: string): Promise<void> {
    if (isWeb) {
      await this.remoteProvider.deleteSceneVersionsForScene(bookId, sceneId);
      return;
    }

    await this.localProvider.deleteSceneVersionsForScene(bookId, sceneId);
    if (storageManager.getMode() === 'cloud') {
      try {
        await this.remoteProvider.deleteSceneVersionsForScene(bookId, sceneId);
      } catch (error) {
        console.warn('[SceneVersionStorageService] Remote scene version delete failed after local delete.', error);
      }
    }
  }

  async renameSceneVersion(bookId: string, versionId: string, name?: string): Promise<void> {
    if (isWeb) {
      await this.remoteProvider.renameSceneVersion(bookId, versionId, name);
      return;
    }

    if (storageManager.getMode() === 'cloud') {
      await this.remoteProvider.renameSceneVersion(bookId, versionId, name);
      try {
        await this.localProvider.renameSceneVersion(bookId, versionId, name);
      } catch (error) {
        console.warn('[SceneVersionStorageService] Local scene version cache rename failed after remote rename.', error);
      }
      return;
    }

    await this.localProvider.renameSceneVersion(bookId, versionId, name);
  }

  async deleteSceneVersion(bookId: string, versionId: string): Promise<void> {
    if (isWeb) {
      await this.remoteProvider.deleteSceneVersion(bookId, versionId);
      return;
    }

    if (storageManager.getMode() === 'cloud') {
      await this.remoteProvider.deleteSceneVersion(bookId, versionId);
      try {
        await this.localProvider.deleteSceneVersion(bookId, versionId);
      } catch (error) {
        console.warn('[SceneVersionStorageService] Local scene version cache delete failed after remote delete.', error);
      }
      return;
    }

    await this.localProvider.deleteSceneVersion(bookId, versionId);
  }

  async migrateLegacySceneVersionsFromBooks<T extends Book>(books: T[]): Promise<T[]> {
    const migratedBooks: T[] = [];

    for (const book of books) {
      const legacyVersions = (book as T & { sceneVersions?: SceneVersion[] }).sceneVersions;
      if (legacyVersions?.length) {
        for (const version of legacyVersions) {
          await this.saveSceneVersion({
            ...version,
            bookId: version.bookId || book.id,
          });
        }
      }
      migratedBooks.push(stripLegacySceneVersionsFromBook(book));
    }

    return migratedBooks;
  }

  private mergeVersions(...versionGroups: SceneVersion[][]): SceneVersion[] {
    const map = new Map<string, SceneVersion>();
    versionGroups.flat().forEach(version => map.set(version.id, version));
    return sortNewestFirst(Array.from(map.values()));
  }
}

export const sceneVersionStorage = new SceneVersionStorageService();
export { LOCAL_SCENE_VERSIONS_KEY };
