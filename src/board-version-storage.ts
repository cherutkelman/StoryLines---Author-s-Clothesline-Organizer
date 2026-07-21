import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import type { BoardVersion } from '../types';
import { storageManager } from '../storage';
import { db } from './firebase';
import { isWeb } from './platform';

const LOCAL_BOARD_VERSIONS_KEY = 'storylines_board_versions_v1';
export const getBoardVersionDocumentPath = (bookId: string, versionId: string) =>
  ['books', bookId, 'boardVersions', versionId] as const;

export interface BoardVersionStorageProvider {
  saveBoardVersion(version: BoardVersion): Promise<void>;
  loadBoardVersions(bookId: string): Promise<BoardVersion[]>;
}

const sortNewestFirst = (versions: BoardVersion[]) =>
  [...versions].sort((a, b) => b.createdAt - a.createdAt);

const removeUndefined = (value: unknown): unknown => {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(item => removeUndefined(item));

  const clean: Record<string, unknown> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, nestedValue]) => {
    if (nestedValue !== undefined) {
      clean[key] = removeUndefined(nestedValue);
    }
  });
  return clean;
};

export class LocalBoardVersionStorageProvider implements BoardVersionStorageProvider {
  private loadAll(): BoardVersion[] {
    const saved = localStorage.getItem(LOCAL_BOARD_VERSIONS_KEY);
    if (!saved) return [];

    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('[LocalBoardVersionStorageProvider] Failed to parse board versions', error);
      return [];
    }
  }

  private saveAll(versions: BoardVersion[]) {
    localStorage.setItem(LOCAL_BOARD_VERSIONS_KEY, JSON.stringify(versions));
  }

  async saveBoardVersion(version: BoardVersion): Promise<void> {
    const versions = this.loadAll();
    const existingIndex = versions.findIndex(item => item.bookId === version.bookId && item.id === version.id);
    if (existingIndex >= 0) {
      versions[existingIndex] = version;
    } else {
      versions.push(version);
    }
    this.saveAll(versions);
  }

  async loadBoardVersions(bookId: string): Promise<BoardVersion[]> {
    return sortNewestFirst(this.loadAll().filter(version => version.bookId === bookId));
  }
}

export class FirestoreBoardVersionStorageProvider implements BoardVersionStorageProvider {
  private getVersionsCollection(bookId: string) {
    return collection(db, 'books', bookId, 'boardVersions');
  }

  async saveBoardVersion(version: BoardVersion): Promise<void> {
    await setDoc(
      doc(db, ...getBoardVersionDocumentPath(version.bookId, version.id)),
      removeUndefined(version)
    );
  }

  async loadBoardVersions(bookId: string): Promise<BoardVersion[]> {
    const versionsQuery = query(this.getVersionsCollection(bookId), where('bookId', '==', bookId));
    const snap = await getDocs(versionsQuery);
    return sortNewestFirst(snap.docs.map(docSnap => docSnap.data() as BoardVersion));
  }
}

export class BoardVersionStorageService {
  constructor(
    private readonly localProvider = new LocalBoardVersionStorageProvider(),
    private readonly remoteProvider = new FirestoreBoardVersionStorageProvider()
  ) {}

  async saveBoardVersion(version: BoardVersion): Promise<void> {
    if (isWeb) {
      await this.remoteProvider.saveBoardVersion(version);
      return;
    }

    await this.localProvider.saveBoardVersion(version);

    if (storageManager.getMode() === 'cloud') {
      try {
        await this.remoteProvider.saveBoardVersion(version);
      } catch (error) {
        console.warn('[BoardVersionStorageService] Remote board version save failed after local save.', error);
      }
    }
  }

  async loadBoardVersions(bookId: string): Promise<BoardVersion[]> {
    if (isWeb) {
      return this.remoteProvider.loadBoardVersions(bookId);
    }

    const localVersions = await this.localProvider.loadBoardVersions(bookId);
    if (storageManager.getMode() !== 'cloud') return localVersions;

    try {
      const remoteVersions = await this.remoteProvider.loadBoardVersions(bookId);
      return this.mergeVersions(localVersions, remoteVersions);
    } catch (error) {
      console.warn('[BoardVersionStorageService] Remote board version load failed; using local versions.', error);
      return localVersions;
    }
  }

  private mergeVersions(...versionGroups: BoardVersion[][]): BoardVersion[] {
    const map = new Map<string, BoardVersion>();
    versionGroups.flat().forEach(version => map.set(`${version.bookId}:${version.id}`, version));
    return sortNewestFirst(Array.from(map.values()));
  }
}

export const boardVersionStorage = new BoardVersionStorageService();
export { LOCAL_BOARD_VERSIONS_KEY };
