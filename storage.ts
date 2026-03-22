import { storageProvider, syncService, SyncState, SyncStatus, syncLogger, storageManager } from "./storage/index";
import { v4 as uuidv4 } from "uuid";
import type { Book, Project, BookUIState } from "./types";

export { syncService, syncLogger, storageManager };
export type { SyncState, SyncStatus };

export const getOrCreateUserId = (): string => {
  return storageProvider.getUserId();
};

export const setUserId = (userId: string | null) => {
  storageManager.setUserId(userId);
};

export const setStorageMode = (mode: 'local' | 'cloud') => {
  console.log(`Storage: Setting mode to ${mode}`);
  storageManager.setMode(mode);
};

export const migrateLegacyBooks = async (newUserId: string) => {
  await storageManager.migrateLegacyBooks(newUserId);
};

export const deduplicateBooks = (books: Book[]): Book[] => {
  const map = new Map<string, Book>();
  books.forEach(book => {
    const existing = map.get(book.id);
    if (!existing || book.updatedAt > existing.updatedAt) {
      map.set(book.id, book);
    }
  });
  return Array.from(map.values());
};

export const loadBooks = async (includeDeleted = false): Promise<Book[]> => {
  const provider = storageManager.getProvider();
  console.log(`Storage: Loading books using ${provider.name} provider`);
  const books = await provider.loadBooks(includeDeleted);
  return deduplicateBooks(books);
};

export const saveBooks = async (books: Book[], skipCloud = false): Promise<Book[]> => {
  const cleanBooks = deduplicateBooks(books);
  
  // Always save to LocalStorage as our local cache/source for sync
  const localProvider = storageManager.getLocalProvider();
  console.log(`Storage: Saving books to LocalStorage provider`);
  await localProvider.saveBooks(cleanBooks);
  
  let finalBooks = [...cleanBooks];

  // If in cloud mode and not skipping cloud, also save to remote provider
  if (!skipCloud && storageManager.getMode() === 'cloud') {
    const remoteProvider = storageManager.getRemoteProvider();
    const pendingIds = cleanBooks.filter(b => b.pendingSync).map(b => b.id);
    
    if (pendingIds.length > 0) {
      console.log(`Storage: Also saving ${pendingIds.length} pending books to ${remoteProvider.name} provider`);
      await remoteProvider.saveBooks(cleanBooks, pendingIds);
      
      // Update pendingSync flag locally after successful cloud save
      finalBooks = cleanBooks.map(b => 
        pendingIds.includes(b.id) ? { ...b, pendingSync: false, syncStatus: 'synced' as SyncStatus } : b
      );
      
      // Save the updated list back to local storage so it's consistent
      await localProvider.saveBooks(finalBooks);
    } else {
      console.log(`Storage: No pending books to sync to ${remoteProvider.name}`);
    }
  }

  return finalBooks;
};

const UI_STATE_KEY = 'storylines_ui_state_v1';
const GLOBAL_UI_STATE_KEY = 'storylines_global_ui_state_v1';

export const loadUIStates = (): Record<string, BookUIState> => {
  const saved = localStorage.getItem(UI_STATE_KEY);
  if (!saved) return {};
  try {
    return JSON.parse(saved);
  } catch (e) {
    console.error("Failed to load UI states", e);
    return {};
  }
};

export const saveUIStates = (states: Record<string, BookUIState>) => {
  localStorage.setItem(UI_STATE_KEY, JSON.stringify(states));
};

export const loadGlobalUIState = (): { lastActiveBookId?: string } => {
  const saved = localStorage.getItem(GLOBAL_UI_STATE_KEY);
  if (!saved) return {};
  try {
    return JSON.parse(saved);
  } catch (e) {
    console.error("Failed to load global UI state", e);
    return {};
  }
};

export const saveGlobalUIState = (state: { lastActiveBookId?: string }) => {
  localStorage.setItem(GLOBAL_UI_STATE_KEY, JSON.stringify(state));
};

const DEFAULT_PROJECT_DATA: Project = {
  plotlines: [
    { id: 'p1', name: 'עלילה ראשית', color: '#ef4444' },
    { id: 'p2', name: 'עלילת משנה', color: '#3b82f6' }
  ],
  scenes: [
    { id: 's1', plotlineId: 'p1', title: 'התחלה', content: 'הגיבור יוצא לדרך...', position: 0, isCompleted: true },
    { id: 's2', plotlineId: 'p2', title: 'מזימה', content: 'הנבל מתכנן משהו...', position: 1, isCompleted: false },
    { id: 's3', plotlineId: 'p1', title: 'מכשול ראשון', content: 'הדרך נחסמת...', position: 2, isCompleted: false }
  ],
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
};

export const createNewBook = (title: string, userId: string, universeId?: string, sharedData?: Partial<Project>): Book => {
  const now = Date.now();
  return {
    id: uuidv4(),
    ownerId: userId,
    title,
    universeId,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'local_only',
    pendingSync: true,
    ...DEFAULT_PROJECT_DATA,
    ...sharedData,
    theme: (sharedData as any)?.theme || 'classic',
  };
};

export const updateBookInList = (books: Book[], bookId: string, updates: Partial<Book>): Book[] => {
  const now = Date.now();
  return books.map(b => {
    if (b.id === bookId) {
      return {
        ...b,
        ...updates,
        updatedAt: now,
        pendingSync: true,
      };
    }
    return b;
  });
};

export const updateBookAndSharedFields = (books: Book[], bookId: string, updates: Partial<Book>, sharedFields: string[]): Book[] => {
  const now = Date.now();
  const updatedBooks = books.map(b => {
    if (b.id === bookId) {
      return {
        ...b,
        ...updates,
        updatedAt: now,
        pendingSync: true,
      };
    }
    return b;
  });

  const currentBook = updatedBooks.find(b => b.id === bookId);
  if (currentBook?.universeId) {
    const sharedUpdates: any = {};
    let hasSharedUpdates = false;
    
    sharedFields.forEach(field => {
      if (field in updates) {
        sharedUpdates[field] = (updates as any)[field];
        hasSharedUpdates = true;
      }
    });

    if (hasSharedUpdates) {
      return updatedBooks.map(b => 
        b.universeId === currentBook.universeId && b.id !== bookId 
          ? { ...b, ...sharedUpdates, updatedAt: now, pendingSync: true } 
          : b
      );
    }
  }
  
  return updatedBooks;
};

export const softDeleteBookInList = (books: Book[], bookId: string): Book[] => {
  const now = Date.now();
  return books.map(b => {
    if (b.id === bookId) {
      return {
        ...b,
        deletedAt: now,
        updatedAt: now,
        pendingSync: true,
      };
    }
    return b;
  });
};
