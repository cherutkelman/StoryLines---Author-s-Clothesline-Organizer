import { Book } from "../types";
import { IStorageProvider } from "./types";

const MOCK_CLOUD_KEY = 'storylines_mock_cloud_v1';

/**
 * Placeholder for future cloud sync implementation.
 * Persists to a separate localStorage key to simulate a remote source.
 */
export class MockCloudProvider implements IStorageProvider {
  name = 'MockCloud';
  private userId: string = "mock-user-123";

  setUserId(userId: string | null) {
    if (userId) {
      this.userId = userId;
    } else {
      this.userId = "mock-user-123";
    }
  }

  getUserId(): string {
    return this.userId;
  }

  async loadBooks(includeDeleted = false): Promise<Book[]> {
    console.log("MockCloudProvider: Loading books from 'cloud'...");
    const saved = localStorage.getItem(MOCK_CLOUD_KEY);
    if (!saved) return [];

    try {
      const books = JSON.parse(saved);
      const currentUserId = this.getUserId();
      
      // Filter by current user
      const userBooks = books.filter((b: Book) => b.ownerId === currentUserId);

      if (includeDeleted) return userBooks;
      return userBooks.filter((b: Book) => !b.deletedAt);
    } catch (e) {
      console.error("MockCloudProvider: Failed to parse cloud data", e);
      return [];
    }
  }

  async saveBooks(books: Book[]): Promise<void> {
    console.log("MockCloudProvider: Saving books to 'cloud'...", books.length);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const currentUserId = this.getUserId();
    const saved = localStorage.getItem(MOCK_CLOUD_KEY);
    const allBooks: any[] = saved ? JSON.parse(saved) : [];

    // Merge: Keep books from other users, replace books from current user
    const otherUsersBooks = allBooks.filter(b => b.ownerId && b.ownerId !== currentUserId);
    const combined = [...otherUsersBooks, ...books];

    localStorage.setItem(MOCK_CLOUD_KEY, JSON.stringify(combined));
  }
}
