import { Book } from "../types";
import { IStorageProvider, SyncState } from "./types";
import { syncLogger } from "./sync-logger";

export class SyncService {
  private local: IStorageProvider;
  private remote: IStorageProvider;
  private state: SyncState = 'idle';
  private onStateChange?: (state: SyncState) => void;
  private lastSyncTime: number | null = null;

  constructor(local: IStorageProvider, remote: IStorageProvider) {
    this.local = local;
    this.remote = remote;
  }

  getState(): SyncState {
    return this.state;
  }

  getLastSyncTime(): number | null {
    return this.lastSyncTime;
  }

  subscribe(callback: (state: SyncState) => void) {
    this.onStateChange = callback;
  }

  private setState(state: SyncState) {
    this.state = state;
    if (this.onStateChange) this.onStateChange(state);
  }

  async sync(): Promise<{ updatedBooks: Book[], conflicts: string[] }> {
    console.log(`[SyncService] sync() called. Current state: ${this.state}`);
    if (this.state === 'syncing') {
      syncLogger.warn("Sync already in progress, skipping.");
      return { updatedBooks: [], conflicts: [] };
    }

    const conflicts: string[] = [];
    let pushedCount = 0;
    let pulledCount = 0;

    try {
      const localBooksForCount = await this.local.loadBooks(true);
      const pendingCount = localBooksForCount.filter(b => b.pendingSync).length;

      syncLogger.info(`Sync started. Remote: ${this.remote.name}. Pending: ${pendingCount}`);
      console.log(`[SyncService] sync() starting. Remote: ${this.remote.name}, Pending: ${pendingCount}`);
      
      this.setState('syncing');

      // 1. Load both sources
      let localBooks = await this.local.loadBooks(true);
      let remoteBooks = await this.remote.loadBooks(true);

      // Deduplicate both sources before starting
      const deduplicate = (books: Book[]) => {
        const map = new Map<string, Book>();
        books.forEach(b => {
          const existing = map.get(b.id);
          if (!existing || b.updatedAt > existing.updatedAt) {
            map.set(b.id, b);
          }
        });
        return Array.from(map.values());
      };

      localBooks = deduplicate(localBooks);
      remoteBooks = deduplicate(remoteBooks);

      const remoteMap = new Map(remoteBooks.map(b => [b.id, b]));
      const updatedLocalBooks = [...localBooks];
      const localIds = new Set(localBooks.map(b => b.id));

      // 2. Process local changes and remote updates
      for (let i = 0; i < updatedLocalBooks.length; i++) {
        const localBook = updatedLocalBooks[i];
        const remoteBook = remoteMap.get(localBook.id);

        const hasLocalChanges: boolean = !!localBook.pendingSync;
        const hasRemoteChanges: boolean = !!(remoteBook && (
          localBook.lastSyncedAt 
            ? remoteBook.updatedAt > localBook.lastSyncedAt 
            : remoteBook.updatedAt !== localBook.updatedAt
        ));

        // Detailed logging for every book being evaluated
        console.log(`[SyncService] Evaluating book "${localBook.title}" (${localBook.id}):`, {
          localUpdatedAt: new Date(localBook.updatedAt).toISOString(),
          remoteUpdatedAt: remoteBook ? new Date(remoteBook.updatedAt).toISOString() : 'N/A',
          lastSyncedAt: localBook.lastSyncedAt ? new Date(localBook.lastSyncedAt).toISOString() : 'Never',
          hasLocalChanges,
          hasRemoteChanges,
          pendingSync: localBook.pendingSync
        });

        syncLogger.info(`Evaluating book: ${localBook.title}`, {
          id: localBook.id,
          hasLocalChanges,
          hasRemoteChanges,
        });

        if (hasLocalChanges || hasRemoteChanges || localBook.forceOverwriteRemote) {
          syncLogger.debug(`Detailed evaluation for: ${localBook.title}`, {
            id: localBook.id,
            local: {
              updatedAt: localBook.updatedAt,
              lastSyncedAt: localBook.lastSyncedAt,
              pendingSync: localBook.pendingSync
            },
            remote: {
              updatedAt: remoteBook?.updatedAt,
              lastSyncedAt: remoteBook?.lastSyncedAt
            }
          });
        }

        if (localBook.forceOverwriteRemote) {
          // Force push to remote
          syncLogger.info(`Force pushing local version to remote (Keep Local): ${localBook.title}`);
          const syncedBook: Book = {
            ...localBook,
            syncStatus: 'synced',
            pendingSync: false,
            lastSyncedAt: localBook.updatedAt,
            forceOverwriteRemote: false // Clear the flag
          };
          
          console.log(`[SyncService] Resolution 'local' (forceOverwriteRemote) for book ${localBook.id}:`, {
            before: {
              updatedAt: new Date(localBook.updatedAt).toISOString(),
              lastSyncedAt: localBook.lastSyncedAt ? new Date(localBook.lastSyncedAt).toISOString() : 'Never',
              pendingSync: localBook.pendingSync
            },
            after: {
              updatedAt: new Date(syncedBook.updatedAt).toISOString(),
              lastSyncedAt: syncedBook.lastSyncedAt ? new Date(syncedBook.lastSyncedAt).toISOString() : 'Never',
              pendingSync: syncedBook.pendingSync,
              forceOverwriteRemote: syncedBook.forceOverwriteRemote
            }
          });

          updatedLocalBooks[i] = syncedBook;
          remoteMap.set(syncedBook.id, syncedBook);
          pushedCount++;
        } else if (remoteBook && hasLocalChanges && hasRemoteChanges) {
          // CONFLICT: Both changed since last sync
          syncLogger.warn(`Conflict detected: ${localBook.title}`, { 
            reason: "Both local and remote have changes since last sync",
            localUpdatedAt: localBook.updatedAt,
            remoteUpdatedAt: remoteBook.updatedAt,
            lastSyncedAt: localBook.lastSyncedAt
          });
          
          console.log(`[SyncService] Conflict detected for book ${localBook.id}:`, {
            localUpdatedAt: new Date(localBook.updatedAt).toISOString(),
            remoteUpdatedAt: new Date(remoteBook.updatedAt).toISOString(),
            lastSyncedAt: localBook.lastSyncedAt ? new Date(localBook.lastSyncedAt).toISOString() : 'Never',
            pendingSync: localBook.pendingSync
          });

          updatedLocalBooks[i] = {
            ...localBook,
            syncStatus: 'conflict'
          };
          conflicts.push(localBook.id);
        } else if (hasLocalChanges) {
          // Push to remote
          syncLogger.debug(`Pushing local changes to remote: ${localBook.title}`);
          const syncedBook: Book = {
            ...localBook,
            syncStatus: 'synced',
            pendingSync: false,
            lastSyncedAt: localBook.updatedAt
          };
          
          console.log(`[SyncService] Pushing local changes for book ${localBook.id}:`, {
            updatedAt: new Date(syncedBook.updatedAt).toISOString(),
            lastSyncedAt: syncedBook.lastSyncedAt ? new Date(syncedBook.lastSyncedAt).toISOString() : 'Never',
            pendingSync: syncedBook.pendingSync
          });

          updatedLocalBooks[i] = syncedBook;
          remoteMap.set(syncedBook.id, syncedBook);
          pushedCount++;
        } else if (remoteBook && hasRemoteChanges) {
          // Pull from remote
          syncLogger.debug(`Pulling newer version from remote: ${localBook.title}`);
          
          console.log(`[SyncService] Pulling remote changes for book ${localBook.id}:`, {
            remoteUpdatedAt: new Date(remoteBook.updatedAt).toISOString(),
            localUpdatedAt: new Date(localBook.updatedAt).toISOString(),
            lastSyncedAt: localBook.lastSyncedAt ? new Date(localBook.lastSyncedAt).toISOString() : 'Never'
          });

          updatedLocalBooks[i] = {
            ...(remoteBook as Book),
            syncStatus: 'synced',
            pendingSync: false,
            lastSyncedAt: remoteBook.updatedAt
          };
          pulledCount++;
        }
      }

      // 3. Add books that are on remote but not on local
      for (const remoteBook of remoteBooks) {
        if (!localIds.has(remoteBook.id)) {
          syncLogger.info(`New book from remote: ${remoteBook.title}`);
          updatedLocalBooks.push({
            ...remoteBook,
            syncStatus: 'synced',
            pendingSync: false,
            lastSyncedAt: remoteBook.updatedAt
          });
          pulledCount++;
        }
      }

      // 4. Save back to remote
      syncLogger.info(`Sync: Saving ${remoteMap.size} books to remote provider (${this.remote.name})`);
      await this.remote.saveBooks(Array.from(remoteMap.values()));
      
      console.log(`Sync: Saving ${updatedLocalBooks.length} books to local provider (${this.local.name})`);
      await this.local.saveBooks(updatedLocalBooks);

      this.lastSyncTime = Date.now();
      syncLogger.info("Sync completed successfully.", { pushed: pushedCount, pulled: pulledCount, conflicts: conflicts.length });
      console.log(`Sync: Success! Pushed: ${pushedCount}, Pulled: ${pulledCount}, Conflicts: ${conflicts.length}`);
      this.setState('success');
      setTimeout(() => this.setState('idle'), 3000);

      return { 
        updatedBooks: updatedLocalBooks.filter(b => !b.deletedAt), 
        conflicts 
      };
    } catch (error) {
      console.error("Sync: Critical error during sync", error);
      syncLogger.error("Sync failed.", error);
      this.setState('error');
      // Note: local data is preserved because we only save updatedLocalBooks at the very end of the try block
      setTimeout(() => this.setState('idle'), 5000);
      throw error;
    }
  }

  getDiagnostics() {
    return {
      state: this.state,
      lastSyncTime: this.lastSyncTime,
      remoteProvider: this.remote.name,
      localProvider: this.local.name,
    };
  }

  /**
   * Developer-only: Simulates a change on the remote provider to test conflict detection.
   */
  async simulateRemoteChange(bookId: string) {
    syncLogger.info(`Simulating remote change for book: ${bookId} on provider: ${this.remote.name}`);
    // DO NOT set state to 'syncing' as it might trigger unwanted UI behaviors or confuse the user
    
    try {
      // 1. Load local book to get current state and timestamp
      console.log(`[SyncService] simulateRemoteChange: Loading local book ${bookId}`);
      const localBooks = await this.local.loadBooks(true);
      const localBook = localBooks.find(b => b.id === bookId);
      
      if (!localBook) {
        syncLogger.error(`Local book ${bookId} not found. Cannot simulate conflict.`);
        return;
      }

      // 2. Load remote books
      console.log(`[SyncService] simulateRemoteChange: Loading remote books from ${this.remote.name}`);
      const remoteBooks = await this.remote.loadBooks(true);
      const remoteBookIndex = remoteBooks.findIndex(b => b.id === bookId);
      
      // 3. Create/Update remote version with newer timestamp
      const baseBook = remoteBookIndex >= 0 ? remoteBooks[remoteBookIndex] : localBook;
      
      // Ensure remote timestamp is significantly newer than local and lastSyncedAt
      const guaranteedRemoteUpdatedAt =
        Math.max(
        Date.now(),
        localBook.updatedAt,
        localBook.lastSyncedAt ?? 0
      ) + 120000; // 2 minutes in the future

      const updatedBook: Book = {
        ...baseBook,
        title: `${baseBook.title} (Remote Update ${new Date().toLocaleTimeString()})`,
        updatedAt: guaranteedRemoteUpdatedAt,
        pendingSync: false,
        syncStatus: 'synced'
      };

      console.log(`[SyncService] simulateRemoteChange: Target book state BEFORE simulation:`, {
        id: localBook.id,
        localUpdatedAt: new Date(localBook.updatedAt).toISOString(),
        lastSyncedAt: localBook.lastSyncedAt ? new Date(localBook.lastSyncedAt).toISOString() : 'Never',
        pendingSync: localBook.pendingSync
      });
      
      let updatedRemoteBooks: Book[];
      if (remoteBookIndex >= 0) {
        updatedRemoteBooks = remoteBooks.map(b => b.id === bookId ? updatedBook : b);
      } else {
        updatedRemoteBooks = [...remoteBooks, updatedBook];
      }
      
      // 4. Save back to remote ONLY
      await this.remote.saveBooks(updatedRemoteBooks);
      
      console.log(`[SyncService] simulateRemoteChange: Target book state AFTER simulation (Remote Only):`, {
        id: updatedBook.id,
        remoteUpdatedAt: new Date(updatedBook.updatedAt).toISOString(),
        expectedConflict: localBook.pendingSync ? "YES" : "NO (local has no pending changes)"
      });

      syncLogger.info("Remote change simulated successfully. Local pending change remains untouched. Click Sync to detect conflict.");
    } catch (error) {
      console.error("[SyncService] simulateRemoteChange: FAILED", error);
      syncLogger.error("Failed to simulate remote change.", error);
    }
  }

  async getRemoteBook(bookId: string): Promise<Book | null> {
    try {
      const remoteBooks = await this.remote.loadBooks(true);
      return remoteBooks.find(b => b.id === bookId) || null;
    } catch (error) {
      syncLogger.error(`Failed to fetch remote book ${bookId}`, error);
      return null;
    }
  }
}
