import type { Book, BookSequenceItem, ChapterMarker, Project, Scene } from '../types';

type BookSequenceScene = Pick<Scene, 'id' | 'position'> & Partial<Scene>;
type BookSequenceSource = {
  scenes: BookSequenceScene[];
  chapterMarkers?: ChapterMarker[];
  bookSequence?: BookSequenceItem[];
};
type BookSequenceUpdateSource = Pick<Project, 'scenes' | 'chapterMarkers' | 'bookSequence' | 'plotlines'>;

type IndexedScene = {
  scene: BookSequenceScene;
  index: number;
};

type IndexedChapterMarker = {
  marker: ChapterMarker;
  index: number;
};

export type ChapterDividerLocation = {
  index: number;
  item: Extract<BookSequenceItem, { type: 'chapter-divider' }>;
};

export type BookSequenceDisplayItem =
  | {
      id: string;
      type: 'scene';
      scene: Scene;
    }
  | {
      id: string;
      type: 'chapter-divider';
      chapterMarker: ChapterMarker;
    };

export const BOOK_SEQUENCE_SCENE_COLUMN_WIDTH = 176;
export const BOOK_SEQUENCE_CHAPTER_DIVIDER_WIDTH = 72;

export type BoardSequenceColumn =
  | {
      id: string;
      type: 'scene';
      width: number;
      scene: Scene;
      sceneOrderIndex: number;
    }
  | {
      id: string;
      type: 'chapter-divider';
      width: number;
      chapterMarker: ChapterMarker;
    };

export type BookSequenceChapterUpdate = {
  bookSequence: BookSequenceItem[];
  chapterMarkers: ChapterMarker[];
};

export type BookSequenceSceneMoveUpdate = {
  bookSequence: BookSequenceItem[];
  scenes: Scene[];
  chapterMarkers: ChapterMarker[];
};

const isValidPosition = (position: unknown): position is number =>
  typeof position === 'number' &&
  Number.isFinite(position) &&
  Number.isInteger(position) &&
  position >= 0;

const sceneItemId = (sceneId: string): string => `scene:${sceneId}`;
const chapterItemId = (chapterId: string): string => `chapter:${chapterId}`;

const toSceneItem = (sceneId: string): BookSequenceItem => ({
  id: sceneItemId(sceneId),
  type: 'scene',
  sceneId,
});

const toChapterItem = (chapterId: string): BookSequenceItem => ({
  id: chapterItemId(chapterId),
  type: 'chapter-divider',
  chapterId,
});

const sortByPositionThenIndex = <T extends { index: number }>(
  getPosition: (item: T) => number
) => (a: T, b: T): number => {
  const positionDelta = getPosition(a) - getPosition(b);
  return positionDelta !== 0 ? positionDelta : a.index - b.index;
};

export const createBookSequenceFromLegacyBook = (
  book: BookSequenceSource
): BookSequenceItem[] => {
  const indexedScenes = book.scenes.map((scene, index) => ({ scene, index }));
  const indexedMarkers = (book.chapterMarkers || []).map((marker, index) => ({ marker, index }));

  const validScenes = indexedScenes
    .filter(({ scene }) => isValidPosition(scene.position))
    .sort(sortByPositionThenIndex<IndexedScene>(({ scene }) => scene.position));
  const validMarkers = indexedMarkers
    .filter(({ marker }) => isValidPosition(marker.position))
    .sort(sortByPositionThenIndex<IndexedChapterMarker>(({ marker }) => marker.position));

  const invalidScenes = indexedScenes.filter(({ scene }) => !isValidPosition(scene.position));
  const invalidMarkers = indexedMarkers.filter(({ marker }) => !isValidPosition(marker.position));

  const sequence: BookSequenceItem[] = [];
  let sceneCursor = 0;
  let markerCursor = 0;

  while (sceneCursor < validScenes.length || markerCursor < validMarkers.length) {
    const nextScenePosition = validScenes[sceneCursor]?.scene.position;
    const nextMarkerPosition = validMarkers[markerCursor]?.marker.position;
    const nextPosition = Math.min(
      nextScenePosition ?? Number.POSITIVE_INFINITY,
      nextMarkerPosition ?? Number.POSITIVE_INFINITY
    );

    while (markerCursor < validMarkers.length && validMarkers[markerCursor].marker.position === nextPosition) {
      sequence.push(toChapterItem(validMarkers[markerCursor].marker.id));
      markerCursor += 1;
    }

    while (sceneCursor < validScenes.length && validScenes[sceneCursor].scene.position === nextPosition) {
      sequence.push(toSceneItem(validScenes[sceneCursor].scene.id));
      sceneCursor += 1;
    }
  }

  invalidScenes.forEach(({ scene }) => sequence.push(toSceneItem(scene.id)));
  invalidMarkers.forEach(({ marker }) => sequence.push(toChapterItem(marker.id)));

  return sequence;
};

export const normalizeBookSequence = (book: BookSequenceSource): BookSequenceItem[] => {
  if (!book.bookSequence) {
    return createBookSequenceFromLegacyBook(book);
  }

  const sceneIds = new Set(book.scenes.map(scene => scene.id));
  const chapterIds = new Set((book.chapterMarkers || []).map(marker => marker.id));
  const includedSceneIds = new Set<string>();
  const includedChapterIds = new Set<string>();
  const normalized: BookSequenceItem[] = [];

  book.bookSequence.forEach((item) => {
    if (item.type === 'scene') {
      if (!sceneIds.has(item.sceneId) || includedSceneIds.has(item.sceneId)) return;
      includedSceneIds.add(item.sceneId);
      normalized.push({ ...item, id: sceneItemId(item.sceneId) });
      return;
    }

    if (item.type === 'chapter-divider') {
      if (!chapterIds.has(item.chapterId) || includedChapterIds.has(item.chapterId)) return;
      includedChapterIds.add(item.chapterId);
      normalized.push({ ...item, id: chapterItemId(item.chapterId) });
    }
  });

  book.scenes.forEach((scene) => {
    if (includedSceneIds.has(scene.id)) return;
    includedSceneIds.add(scene.id);
    normalized.push(toSceneItem(scene.id));
  });

  (book.chapterMarkers || []).forEach((marker) => {
    if (includedChapterIds.has(marker.id)) return;
    includedChapterIds.add(marker.id);
    normalized.push(toChapterItem(marker.id));
  });

  return normalized;
};

export const getOrderedSceneIds = (book: BookSequenceSource): string[] =>
  normalizeBookSequence(book)
    .filter((item): item is Extract<BookSequenceItem, { type: 'scene' }> => item.type === 'scene')
    .map(item => item.sceneId);

export const getOrderedScenes = <T extends BookSequenceSource>(book: T): Scene[] => {
  const scenesById = new Map(book.scenes.map(scene => [scene.id, scene]));
  return getOrderedSceneIds(book)
    .map(sceneId => scenesById.get(sceneId))
    .filter(Boolean) as Scene[];
};

export const getChapterDividerLocation = (
  book: BookSequenceSource,
  chapterId: string
): ChapterDividerLocation | null => {
  const sequence = normalizeBookSequence(book);
  const index = sequence.findIndex(item => item.type === 'chapter-divider' && item.chapterId === chapterId);
  if (index === -1) return null;

  return {
    index,
    item: sequence[index] as Extract<BookSequenceItem, { type: 'chapter-divider' }>,
  };
};

export const getBookSequenceDisplayItems = (book: BookSequenceSource): BookSequenceDisplayItem[] => {
  const scenesById = new Map(book.scenes.map(scene => [scene.id, scene]));
  const chaptersById = new Map((book.chapterMarkers || []).map(marker => [marker.id, marker]));

  return normalizeBookSequence(book)
    .map((item): BookSequenceDisplayItem | null => {
      if (item.type === 'scene') {
        const scene = scenesById.get(item.sceneId);
        return scene ? { id: item.id, type: 'scene', scene: scene as Scene } : null;
      }

      const chapterMarker = chaptersById.get(item.chapterId);
      return chapterMarker ? { id: item.id, type: 'chapter-divider', chapterMarker } : null;
    })
    .filter((item): item is BookSequenceDisplayItem => Boolean(item));
};

export const getBoardSequenceColumns = (book: BookSequenceSource): BoardSequenceColumn[] => {
  let sceneOrderIndex = 0;

  return getBookSequenceDisplayItems(book).map((item): BoardSequenceColumn => {
    if (item.type === 'scene') {
      const column: BoardSequenceColumn = {
        id: item.id,
        type: 'scene',
        width: BOOK_SEQUENCE_SCENE_COLUMN_WIDTH,
        scene: item.scene,
        sceneOrderIndex,
      };
      sceneOrderIndex += 1;
      return column;
    }

    return {
      id: item.id,
      type: 'chapter-divider',
      width: BOOK_SEQUENCE_CHAPTER_DIVIDER_WIDTH,
      chapterMarker: item.chapterMarker,
    };
  });
};

export const normalizeChapterMarkerPositionsForSequence = (
  chapterMarkers: ChapterMarker[] = [],
  bookSequence: BookSequenceItem[]
): ChapterMarker[] => {
  const sceneCountBeforeChapter = new Map<string, number>();
  let sceneCount = 0;

  bookSequence.forEach((item) => {
    if (item.type === 'scene') {
      sceneCount += 1;
      return;
    }

    if (!sceneCountBeforeChapter.has(item.chapterId)) {
      sceneCountBeforeChapter.set(item.chapterId, sceneCount);
    }
  });

  return chapterMarkers.map(marker => {
    const nextPosition = sceneCountBeforeChapter.get(marker.id);
    return typeof nextPosition === 'number'
      ? { ...marker, position: nextPosition }
      : marker;
  });
};

export const normalizeScenePositionsForSequence = (
  scenes: Scene[],
  bookSequence: BookSequenceItem[]
): Scene[] => {
  const scenesById = new Map(scenes.map(scene => [scene.id, scene]));
  const includedSceneIds = new Set<string>();
  const orderedScenes: Scene[] = [];

  bookSequence.forEach((item) => {
    if (item.type !== 'scene') return;
    const scene = scenesById.get(item.sceneId);
    if (!scene || includedSceneIds.has(scene.id)) return;
    includedSceneIds.add(scene.id);
    orderedScenes.push(scene);
  });

  scenes.forEach((scene) => {
    if (includedSceneIds.has(scene.id)) return;
    includedSceneIds.add(scene.id);
    orderedScenes.push(scene);
  });

  return orderedScenes.map((scene, position) => ({ ...scene, position }));
};

export const createNextChapterTitle = (chapterMarkers: ChapterMarker[] = []): string =>
  `פרק ${chapterMarkers.length + 1}`;

export const addChapterDividerToBookSequence = (
  book: BookSequenceUpdateSource,
  sequenceIndex: number,
  chapterId: string,
  title = createNextChapterTitle(book.chapterMarkers)
): BookSequenceChapterUpdate => {
  const sequence = normalizeBookSequence(book);
  const insertIndex = Math.max(0, Math.min(sequenceIndex, sequence.length));
  const chapterItem = toChapterItem(chapterId);
  const nextSequence = [
    ...sequence.slice(0, insertIndex),
    chapterItem,
    ...sequence.slice(insertIndex),
  ];
  const nextMarkers = [
    ...(book.chapterMarkers || []),
    { id: chapterId, title, position: 0 },
  ];

  return {
    bookSequence: nextSequence,
    chapterMarkers: normalizeChapterMarkerPositionsForSequence(nextMarkers, nextSequence),
  };
};

export const renameChapterInBookSequence = (
  book: BookSequenceUpdateSource,
  chapterId: string,
  title: string
): BookSequenceChapterUpdate => {
  const sequence = normalizeBookSequence(book);
  const nextMarkers = normalizeChapterMarkerPositionsForSequence(
    (book.chapterMarkers || []).map(marker =>
      marker.id === chapterId ? { ...marker, title } : marker
    ),
    sequence
  );

  return {
    bookSequence: sequence,
    chapterMarkers: nextMarkers,
  };
};

export const deleteChapterDividerFromBookSequence = (
  book: BookSequenceUpdateSource,
  chapterId: string
): BookSequenceChapterUpdate => {
  const sequence = normalizeBookSequence(book).filter(item =>
    item.type !== 'chapter-divider' || item.chapterId !== chapterId
  );
  const nextMarkers = (book.chapterMarkers || []).filter(marker => marker.id !== chapterId);

  return {
    bookSequence: sequence,
    chapterMarkers: normalizeChapterMarkerPositionsForSequence(nextMarkers, sequence),
  };
};

export const moveChapterDividerInBookSequence = (
  book: BookSequenceUpdateSource,
  chapterId: string,
  targetSequenceIndex: number
): BookSequenceChapterUpdate => {
  const sequence = normalizeBookSequence(book);
  const currentIndex = sequence.findIndex(item => item.type === 'chapter-divider' && item.chapterId === chapterId);
  if (currentIndex === -1) {
    return {
      bookSequence: sequence,
      chapterMarkers: normalizeChapterMarkerPositionsForSequence(book.chapterMarkers || [], sequence),
    };
  }

  const [chapterItem] = sequence.splice(currentIndex, 1);
  const adjustedTargetIndex = currentIndex < targetSequenceIndex ? targetSequenceIndex - 1 : targetSequenceIndex;
  const insertIndex = Math.max(0, Math.min(adjustedTargetIndex, sequence.length));
  const nextSequence = [
    ...sequence.slice(0, insertIndex),
    chapterItem,
    ...sequence.slice(insertIndex),
  ];

  return {
    bookSequence: nextSequence,
    chapterMarkers: normalizeChapterMarkerPositionsForSequence(book.chapterMarkers || [], nextSequence),
  };
};

export const moveSceneInBookSequence = (
  book: BookSequenceUpdateSource,
  sceneId: string,
  targetSequenceIndex: number,
  targetPlotlineId: string
): BookSequenceSceneMoveUpdate | null => {
  const scene = book.scenes.find(item => item.id === sceneId);
  if (!scene) return null;
  if (!book.plotlines.some(plotline => plotline.id === targetPlotlineId)) return null;

  const sequence = normalizeBookSequence(book);
  const currentIndex = sequence.findIndex(item => item.type === 'scene' && item.sceneId === sceneId);
  if (currentIndex === -1) return null;

  const [sceneItem] = sequence.splice(currentIndex, 1);
  const adjustedTargetIndex = currentIndex < targetSequenceIndex ? targetSequenceIndex - 1 : targetSequenceIndex;
  const insertIndex = Math.max(0, Math.min(adjustedTargetIndex, sequence.length));
  const nextSequence = [
    ...sequence.slice(0, insertIndex),
    sceneItem,
    ...sequence.slice(insertIndex),
  ];

  const currentSequence = normalizeBookSequence(book);
  const sequenceUnchanged = currentSequence.length === nextSequence.length &&
    currentSequence.every((item, index) => item.id === nextSequence[index].id);
  const plotlineUnchanged = scene.plotlineId === targetPlotlineId;
  if (sequenceUnchanged && plotlineUnchanged) return null;

  const nextScenes = normalizeScenePositionsForSequence(
    book.scenes.map(item =>
      item.id === sceneId ? { ...item, plotlineId: targetPlotlineId } : item
    ),
    nextSequence
  );

  return {
    bookSequence: nextSequence,
    scenes: nextScenes,
    chapterMarkers: normalizeChapterMarkerPositionsForSequence(book.chapterMarkers || [], nextSequence),
  };
};
