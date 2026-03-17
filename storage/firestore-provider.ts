import { Book } from "../types";
import { IStorageProvider } from "./types";
import { db, auth } from "../src/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch, 
  doc
} from "firebase/firestore";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export class FirestoreStorageProvider implements IStorageProvider {
  name = 'Firestore';
  private userId: string | null = null;

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  getUserId(): string {
    if (!this.userId) throw new Error("FirestoreStorageProvider: userId not set");
    return this.userId;
  }

  async loadBooks(includeDeleted = false): Promise<Book[]> {
    if (!this.userId) {
      console.warn("[FirestoreStorageProvider] loadBooks called but userId is null. Returning empty list.");
      return [];
    }

    const path = "books";
    console.log(`[FirestoreStorageProvider] loadBooks: Fetching from path "${path}" where ownerId == "${this.userId}"`);
    const booksRef = collection(db, path);
    const q = query(booksRef, where("ownerId", "==", this.userId));
    
    try {
      const querySnapshot = await getDocs(q);
      console.log(`[FirestoreStorageProvider] loadBooks: Success. Found ${querySnapshot.size} documents.`);
      const books: Book[] = [];
      querySnapshot.forEach((doc) => {
        books.push(doc.data() as Book);
      });

      if (includeDeleted) return books;
      return books.filter(b => !b.deletedAt);
    } catch (error) {
      console.error("[FirestoreStorageProvider] loadBooks: FAILED", error);
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }

  private removeUndefined(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefined(item));
    }

    const newObj: any = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== undefined) {
        newObj[key] = this.removeUndefined(value);
      }
    });
    return newObj;
  }

  async saveBooks(books: Book[]): Promise<void> {
    if (!this.userId) {
      console.warn("[FirestoreStorageProvider] saveBooks called but userId is null. Aborting write.");
      return;
    }

    const path = "books";
    console.log(`[FirestoreStorageProvider] saveBooks: Preparing to write ${books.length} books to path "${path}"`);
    const batch = writeBatch(db);
    
    let count = 0;
    books.forEach(book => {
      if (book.ownerId === this.userId) {
        const bookRef = doc(db, path, book.id);
        // Remove undefined values before saving to Firestore
        const cleanBook = this.removeUndefined(book);
        batch.set(bookRef, cleanBook);
        count++;
      } else {
        console.warn(`[FirestoreStorageProvider] saveBooks: Skipping book "${book.title}" (${book.id}) - ownerId mismatch. Book owner: "${book.ownerId}", Current user: "${this.userId}"`);
      }
    });

    if (count === 0) {
      console.log("[FirestoreStorageProvider] saveBooks: No books matched the current user ID. Nothing to write.");
      return;
    }

    try {
      console.log(`[FirestoreStorageProvider] saveBooks: Committing batch of ${count} documents...`);
      await batch.commit();
      console.log("[FirestoreStorageProvider] saveBooks: SUCCESS. Batch commit complete.");
    } catch (error) {
      console.error("[FirestoreStorageProvider] saveBooks: FAILED", error);
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}
