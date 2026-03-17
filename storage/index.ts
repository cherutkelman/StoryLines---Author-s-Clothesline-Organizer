import { IStorageProvider, StorageMode } from "./types";
import { LocalStorageProvider } from "./local-provider";
import { FirestoreStorageProvider } from "./firestore-provider";
import { MockCloudProvider } from "./mock-provider";
import { SyncService } from "./sync-service";

class StorageManager {
  private localProvider: LocalStorageProvider;
  private remoteProvider: FirestoreStorageProvider;
  private provider: IStorageProvider;
  private syncService: SyncService;
  private mode: StorageMode = 'local';

  constructor() {
    this.localProvider = new LocalStorageProvider();
    this.remoteProvider = new FirestoreStorageProvider();
    this.provider = this.localProvider; // Default to local
    this.syncService = new SyncService(this.localProvider, this.remoteProvider);
  }

  getProvider(): IStorageProvider {
    return this.provider;
  }

  getSyncService(): SyncService {
    return this.syncService;
  }

  getLocalProvider(): LocalStorageProvider {
    return this.localProvider;
  }

  getRemoteProvider(): FirestoreStorageProvider {
    return this.remoteProvider;
  }

  setMode(mode: StorageMode) {
    console.log(`[StorageManager] Switching mode from "${this.mode}" to "${mode}"`);
    this.mode = mode;
    this.provider = mode === 'cloud' ? this.remoteProvider : this.localProvider;
    console.log(`[StorageManager] Active provider is now: ${this.provider.name}`);
  }

  getMode(): StorageMode {
    return this.mode;
  }

  setUserId(userId: string | null) {
    this.localProvider.setUserId(userId);
    this.remoteProvider.setUserId(userId);
  }

  async migrateLegacyBooks(newUserId: string) {
    await this.localProvider.migrateLegacyBooks(newUserId);
  }
}

export const storageManager = new StorageManager();
export const storageProvider = storageManager.getProvider();
export const syncService = storageManager.getSyncService();

export * from "./types";
export * from "./sync-service";
export * from "./sync-logger";
