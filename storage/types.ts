import { Book, Project, SyncStatus } from "../types";

export interface IStorageProvider {
  name: string;
  getUserId(): string;
  loadBooks(includeDeleted?: boolean): Promise<Book[]>;
  saveBooks(books: Book[], onlyIds?: string[]): Promise<void>;
}

export type StorageMode = 'local' | 'cloud';
export type { SyncStatus };

export type SyncState = 'idle' | 'syncing' | 'success' | 'error';
