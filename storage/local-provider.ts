import { v4 as uuidv4 } from "uuid";
import { Book } from "../types";
import { IStorageProvider } from "./types";

const STORAGE_KEY = 'storylines_library_v2';
const USER_ID_KEY = "storylines_user_id";

export class LocalStorageProvider implements IStorageProvider {
  name = 'LocalStorage';
  private externalUserId: string | null = null;

  setUserId(userId: string | null) {
    this.externalUserId = userId;
  }

  getUserId(): string {
    if (this.externalUserId) return this.externalUserId;
    const existing = localStorage.getItem(USER_ID_KEY);
    if (existing) return existing;
    const newUserId = uuidv4();
    localStorage.setItem(USER_ID_KEY, newUserId);
    return newUserId;
  }

  async migrateLegacyBooks(newUserId: string): Promise<void> {
    console.log(`[LocalStorageProvider] migrateLegacyBooks: Starting migration to new userId: ${newUserId}`);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      console.log("[LocalStorageProvider] migrateLegacyBooks: No local books found to migrate.");
      return;
    }

    try {
      const allBooks: any[] = JSON.parse(saved);
      const oldUserId = localStorage.getItem(USER_ID_KEY);
      console.log(`[LocalStorageProvider] migrateLegacyBooks: Found ${allBooks.length} total books. Old userId from storage: ${oldUserId}`);
      
      let changedCount = 0;
      const updatedBooks = allBooks.map(book => {
        // If book belongs to the old random ID, migrate it to the new Firebase UID
        if (book.ownerId === oldUserId || !book.ownerId) {
          console.log(`[LocalStorageProvider] migrateLegacyBooks: Migrating book "${book.title}" (${book.id}) from ${book.ownerId || 'no-owner'} to ${newUserId}`);
          book.ownerId = newUserId;
          book.pendingSync = true;
          book.updatedAt = Date.now();
          changedCount++;
        }
        return book;
      });

      if (changedCount > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBooks));
        console.log(`[LocalStorageProvider] migrateLegacyBooks: SUCCESS. Migrated ${changedCount} books.`);
      } else {
        console.log("[LocalStorageProvider] migrateLegacyBooks: No books needed migration.");
      }
    } catch (e) {
      console.error("[LocalStorageProvider] migrateLegacyBooks: FAILED", e);
    }
  }

  async loadBooks(includeDeleted = false): Promise<Book[]> {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    try {
      const parsed = JSON.parse(saved);
      const uiStates: Record<string, any> = JSON.parse(localStorage.getItem('storylines_ui_state_v1') || '{}');
      let uiStatesChanged = false;
      const currentUserId = this.getUserId();

      const allBooks = parsed.map((b: any) => {
        // Migration logic
        if (b.characterMapNodes) {
          const nodes = b.characterMapNodes;
          const newCharacters = (b.characters || []).map((char: any) => {
            const node = nodes.find((n: any) => n.id === char.id || n.name === char.name);
            return {
              ...char,
              x: node?.x ?? char.x,
              y: node?.y ?? char.y,
              imageUrl: node?.imageUrl ?? char.imageUrl
            };
          });
          delete b.characterMapNodes;
          b.characters = newCharacters;
        }
        
        // Move uiState to separate storage if it exists on the book
        if (b.uiState) {
          if (!uiStates[b.id]) {
            uiStates[b.id] = b.uiState;
            uiStatesChanged = true;
          }
          // If book doesn't have a theme but uiState does, migrate it
          if (!b.theme && b.uiState.theme) {
            b.theme = b.uiState.theme;
          }
          delete b.uiState;
        }

        // Also check existing uiStates for theme migration
        if (!b.theme && uiStates[b.id]?.theme) {
          b.theme = uiStates[b.id].theme;
        }

        if (!b.createdAt) b.createdAt = b.lastModified || Date.now();
        if (!b.updatedAt) b.updatedAt = b.lastModified || Date.now();
        if (b.lastModified) delete b.lastModified;
        if (!b.syncStatus) b.syncStatus = 'local_only';
        if (b.pendingSync === undefined) b.pendingSync = true;
        
        // Legacy support: Assign ownerId if missing
        if (!b.ownerId) {
          b.ownerId = currentUserId;
        }

        return b;
      });

      if (uiStatesChanged) {
        localStorage.setItem('storylines_ui_state_v1', JSON.stringify(uiStates));
      }

      // Filter by current user
      const userBooks = allBooks.filter((b: Book) => b.ownerId === currentUserId);

      if (includeDeleted) return userBooks;
      return userBooks.filter((b: Book) => !b.deletedAt);
    } catch (error) {
      console.error("Failed to load library from LocalStorage", error);
      return [];
    }
  }

  async saveBooks(books: Book[]): Promise<void> {
    try {
      const currentUserId = this.getUserId();
      console.log(`[LocalStorageProvider] saveBooks: Saving ${books.length} books for user ${currentUserId}`);
      const saved = localStorage.getItem(STORAGE_KEY);
      const allBooks: any[] = saved ? JSON.parse(saved) : [];

      // Ensure we don't save uiState even if it's accidentally present
      const booksToSave = books.map(b => {
        const { uiState, lastModified, ...rest } = b as any;
        // Safety check: ensure ownerId is set
        if (!rest.ownerId) {
          console.log(`[LocalStorageProvider] saveBooks: Setting missing ownerId for book "${b.title}" to ${currentUserId}`);
          rest.ownerId = currentUserId;
        }
        return rest;
      });

      // Merge: Keep books from other users, replace books from current user
      const otherUsersBooks = allBooks.filter(b => b.ownerId && b.ownerId !== currentUserId);
      const combined = [...otherUsersBooks, ...booksToSave];

      // Final deduplication safety check
      const finalMap = new Map<string, any>();
      combined.forEach(b => {
        const existing = finalMap.get(b.id);
        if (!existing || (b.updatedAt || 0) > (existing.updatedAt || 0)) {
          finalMap.set(b.id, b);
        }
      });

      const finalBooks = Array.from(finalMap.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(finalBooks));
      console.log(`[LocalStorageProvider] saveBooks: SUCCESS. Saved ${finalBooks.length} total books to localStorage.`);
    } catch (error) {
      console.error("[LocalStorageProvider] saveBooks: FAILED", error);
      throw error;
    }
  }
}
