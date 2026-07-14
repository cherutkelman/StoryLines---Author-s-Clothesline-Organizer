import { Book } from "../types";
import { IStorageProvider } from "./types";
import { db, auth } from "../src/firebase";
import { isWeb } from "../src/platform";
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
  private quotaExceededUntil: number = 0;

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

    if (Date.now() < this.quotaExceededUntil) {
      console.warn("[FirestoreStorageProvider] Quota recently exceeded. Skipping loadBooks to avoid errors.");
      return [];
    }

    const path = "books";
    console.log(`[FirestoreStorageProvider] loadBooks: Fetching from path "${path}" for owner/member "${this.userId}"`);
    const booksRef = collection(db, path);
    const ownerQuery = query(booksRef, where("ownerId", "==", this.userId));

    try {
      console.log(
        `[FirestoreStorageProvider] loadBooks: Running owner query where ownerId == "${this.userId}"`
      );
      const ownerSnap = await getDocs(ownerQuery);
      console.log(
        `[FirestoreStorageProvider] loadBooks: Owner query OK. Found ${ownerSnap.size} docs.`
      );

      const map = new Map<string, Book>();

      ownerSnap.forEach((docSnap) => {
        const book = docSnap.data() as Book;
        map.set(book.id, book);
      });

      if (!isWeb) {
        const memberQuery = query(booksRef, where("memberIds", "array-contains", this.userId));
        console.log(
          `[FirestoreStorageProvider] loadBooks: Running member query where memberIds array-contains "${this.userId}"`
        );
        const memberSnap = await getDocs(memberQuery);
        console.log(
          `[FirestoreStorageProvider] loadBooks: Member query OK. Found ${memberSnap.size} docs.`
        );

        memberSnap.forEach((docSnap) => {
          const book = docSnap.data() as Book;
          map.set(book.id, book);
        });
      }

      console.log(
        `[FirestoreStorageProvider] loadBooks: Success. Found ${map.size} accessible docs.`
      );

      const books = Array.from(map.values());

      this.quotaExceededUntil = 0; // Reset on success
      if (includeDeleted) return books;
      return books.filter(b => !b.deletedAt);
    } catch (error: any) {
      console.error("[FirestoreStorageProvider] loadBooks: FAILED", error);
      if (error.message?.includes('resource-exhausted') || error.message?.includes('quota')) {
        this.quotaExceededUntil = Date.now() + 3600000; // 1 hour cooldown
      }
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

  async saveBooks(books: Book[], onlyIds?: string[]): Promise<void> {
    if (!this.userId) {
      console.warn("[FirestoreStorageProvider] saveBooks called but userId is null. Aborting write.");
      return;
    }

    if (Date.now() < this.quotaExceededUntil) {
      console.warn("[FirestoreStorageProvider] Quota recently exceeded. Skipping saveBooks to avoid errors.");
      return;
    }

    const path = "books";
    const booksToSave = onlyIds 
      ? books.filter(b => onlyIds.includes(b.id))
      : books;

    if (booksToSave.length === 0) {
      console.log("[FirestoreStorageProvider] saveBooks: No books to save. Skipping.");
      return;
    }

    console.log(`[FirestoreStorageProvider] saveBooks: Preparing to write ${booksToSave.length} books to path "${path}"`);
    const batch = writeBatch(db);
    
    let count = 0;
    booksToSave.forEach(book => {
      const isOwner = book.ownerId === this.userId;
      const isMember = Array.isArray(book.memberIds) && book.memberIds.includes(this.userId!);

      if (isOwner || isMember) {
        const bookRef = doc(db, path, book.id);

        const { sceneVersions: _sceneVersions, ...bookWithoutSceneVersions } = book as Book & { sceneVersions?: unknown };
        const normalizedBook = {
          ...bookWithoutSceneVersions,
          memberIds: Array.isArray(book.members)
            ? book.members
                .map(member => member?.userId)
                .filter((id): id is string => Boolean(id))
            : []
        };

        const cleanBook = this.removeUndefined(normalizedBook);
        batch.set(bookRef, cleanBook);
        count++;
      } else {
        console.warn(
          `[FirestoreStorageProvider] saveBooks: Skipping book "${book.title}" (${book.id}) - user is neither owner nor member. Book owner: "${book.ownerId}", Current user: "${this.userId}"`
        );
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
      this.quotaExceededUntil = 0; // Reset on success
    } catch (error: any) {
      console.error("[FirestoreStorageProvider] saveBooks: FAILED", error);
      if (error.message?.includes('resource-exhausted') || error.message?.includes('quota')) {
        this.quotaExceededUntil = Date.now() + 3600000; // 1 hour cooldown
      }
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}
