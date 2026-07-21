import type { BoardSnapshot, BoardVersion, BoardVersionReason, BoardVersionType, Book } from '../types';

export interface BoardVersionCreateInput {
  book: Book;
  versionType: BoardVersionType;
  reason: BoardVersionReason;
  manualName?: string;
  now?: number;
  id?: string;
}

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const createBoardSnapshot = (book: Book): BoardSnapshot => {
  const {
    id: _id,
    ownerId: _ownerId,
    members: _members,
    memberIds: _memberIds,
    title: _title,
    universeId: _universeId,
    theme: _theme,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    lastSyncedAt: _lastSyncedAt,
    syncStatus: _syncStatus,
    pendingSync: _pendingSync,
    deletedAt: _deletedAt,
    forceOverwriteRemote: _forceOverwriteRemote,
    sceneVersions: _sceneVersions,
    ...projectSnapshot
  } = cloneJson(book) as Book & { sceneVersions?: unknown };

  const scenesWithoutContent = projectSnapshot.scenes.map(scene => {
    const { content: _content, ...sceneWithoutContent } = scene;
    return sceneWithoutContent;
  });

  return {
    ...projectSnapshot,
    scenes: scenesWithoutContent,
  };
};

export const serializeBoardSnapshot = (snapshot: BoardSnapshot): string => {
  return JSON.stringify(snapshot);
};

export const hasBoardSnapshotChanges = (before: BoardSnapshot, after: BoardSnapshot): boolean => {
  return serializeBoardSnapshot(before) !== serializeBoardSnapshot(after);
};

export const createBoardVersion = ({
  book,
  versionType,
  reason,
  manualName,
  now = Date.now(),
  id = `bv-${now}-${Math.random().toString(36).slice(2, 10)}`,
}: BoardVersionCreateInput): BoardVersion => ({
  id,
  bookId: book.id,
  createdAt: now,
  versionType,
  manualName: manualName?.trim() || undefined,
  reason,
  snapshot: createBoardSnapshot(book),
});

export const createAutomaticBoardVersionOnExit = (
  book: Book,
  baseline: BoardSnapshot,
  now?: number,
  id?: string
): BoardVersion | null => {
  if (!hasBoardSnapshotChanges(baseline, createBoardSnapshot(book))) return null;

  return createBoardVersion({
    book,
    versionType: 'automatic',
    reason: 'board_exit',
    now,
    id,
  });
};
