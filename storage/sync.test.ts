import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncService } from './sync-service';
import { IStorageProvider } from './types';
import { Book } from '../types';

class MockProvider implements IStorageProvider {
  constructor(public name: string, public books: Book[] = []) {}
  getUserId() { return 'test-user'; }
  async loadBooks(includeDeleted = false) { 
    return includeDeleted ? this.books : this.books.filter(b => !b.deletedAt); 
  }
  async saveBooks(books: Book[]) { this.books = books; }
}

const createBaseBook = (id: string, updatedAt: number): Book => ({
  id,
  title: `Book ${id}`,
  ownerId: 'test-user',
  updatedAt,
  createdAt: updatedAt,
  syncStatus: 'local_only',
  pendingSync: true,
  plotlines: [],
  scenes: [],
  characters: [],
  places: [],
  periods: [],
  twists: [],
  fantasyWorlds: [],
  backgrounds: [],
  summary: '',
  characterMapConnections: [],
  maps: [],
  mindMaps: [],
  chapterMarkers: [],
  plotStructure: 'hero',
  plotStructurePoints: {},
  customPlotPoints: [],
  characterArcs: [],
  relationships: [],
});

describe('SyncService Conflict Detection', () => {
  let local: MockProvider;
  let remote: MockProvider;
  let service: SyncService;

  beforeEach(() => {
    local = new MockProvider('Local');
    remote = new MockProvider('Remote');
    service = new SyncService(local, remote);
  });

  it('Case 1: First sync - local and remote differ (Conflict)', async () => {
    const T1 = 1000;
    const T2 = 2000;
    
    // Local has changes (pendingSync: true)
    const localBook = createBaseBook('book-1', T1);
    localBook.pendingSync = true;
    localBook.lastSyncedAt = undefined;

    // Remote also has a different version
    const remoteBook = createBaseBook('book-1', T2);
    
    local.books = [localBook];
    remote.books = [remoteBook];

    const result = await service.sync();
    
    expect(result.conflicts).toContain('book-1');
    expect(local.books[0].syncStatus).toBe('conflict');
    // Remote should not be overwritten
    expect(remote.books[0].updatedAt).toBe(T2);
  });

  it('Case 2: First sync - only remote differs (Pull)', async () => {
    const T1 = 1000;
    const T2 = 2000;
    
    // Local has NO changes (pendingSync: false)
    const localBook = createBaseBook('book-1', T1);
    localBook.pendingSync = false;
    localBook.lastSyncedAt = undefined;

    // Remote has a newer version
    const remoteBook = createBaseBook('book-1', T2);
    
    local.books = [localBook];
    remote.books = [remoteBook];

    const result = await service.sync();
    
    expect(result.conflicts.length).toBe(0);
    expect(result.updatedBooks.length).toBe(1);
    // Local should be updated to remote version
    expect(local.books[0].updatedAt).toBe(T2);
    expect(local.books[0].lastSyncedAt).toBe(T2);
  });

  it('Case 3: First sync - only local differs (Push)', async () => {
    const T1 = 2000;
    
    // Local has changes
    const localBook = createBaseBook('book-1', T1);
    localBook.pendingSync = true;
    localBook.lastSyncedAt = undefined;

    // Remote has NO version of this book
    local.books = [localBook];
    remote.books = [];

    const result = await service.sync();
    
    expect(result.conflicts.length).toBe(0);
    expect(result.updatedBooks.length).toBe(1);
    // Local should be pushed to remote
    expect(remote.books.length).toBe(1);
    expect(remote.books[0].updatedAt).toBe(T1);
    expect(local.books[0].syncStatus).toBe('synced');
    expect(local.books[0].lastSyncedAt).toBe(T1);
  });

  it('Case 4: Existing sync history - both changed since lastSyncedAt (Conflict)', async () => {
    const T0 = 1000; // Last sync time
    const T1 = 1500; // Local change
    const T2 = 2000; // Remote change
    
    const localBook = createBaseBook('book-1', T1);
    localBook.lastSyncedAt = T0;
    localBook.pendingSync = true;

    const remoteBook = createBaseBook('book-1', T2);
    
    local.books = [localBook];
    remote.books = [remoteBook];

    const result = await service.sync();
    
    expect(result.conflicts).toContain('book-1');
    expect(local.books[0].syncStatus).toBe('conflict');
  });

  it('Case 5: Existing sync history - only local changed (Push)', async () => {
    const T0 = 1000;
    const T1 = 1500;
    
    const localBook = createBaseBook('book-1', T1);
    localBook.lastSyncedAt = T0;
    localBook.pendingSync = true;

    const remoteBook = createBaseBook('book-1', T0); // Remote still at T0
    
    local.books = [localBook];
    remote.books = [remoteBook];

    const result = await service.sync();
    
    expect(result.conflicts.length).toBe(0);
    expect(remote.books[0].updatedAt).toBe(T1);
  });

  it('Case 6: Existing sync history - only remote changed (Pull)', async () => {
    const T0 = 1000;
    const T2 = 2000;
    
    const localBook = createBaseBook('book-1', T0);
    localBook.lastSyncedAt = T0;
    localBook.pendingSync = false; // No local changes

    const remoteBook = createBaseBook('book-1', T2);
    
    local.books = [localBook];
    remote.books = [remoteBook];

    const result = await service.sync();
    
    expect(result.conflicts.length).toBe(0);
    expect(local.books[0].updatedAt).toBe(T2);
  });

  it('Case 7: Remote book deleted while local has changes (Push/Undelete)', async () => {
    const T0 = 1000;
    const T1 = 1500;
    
    // Book was previously synced at T0
    const localBook = createBaseBook('book-1', T1);
    localBook.lastSyncedAt = T0;
    localBook.pendingSync = true; // Local has changes

    // Remote book is MISSING (deleted on remote)
    local.books = [localBook];
    remote.books = [];

    const result = await service.sync();
    
    // Current behavior: Local has changes, remote is missing -> Push local to remote
    // This effectively "undeletes" the book on remote because local has newer work.
    expect(result.conflicts.length).toBe(0);
    expect(remote.books.length).toBe(1);
    expect(remote.books[0].id).toBe('book-1');
    expect(local.books[0].syncStatus).toBe('synced');
  });
});
