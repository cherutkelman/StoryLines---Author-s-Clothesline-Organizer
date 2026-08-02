import type { BoardSnapshot, Book, BookSequenceItem, ChapterMarker, Scene, SceneVersion } from '../types';
import {
  addSceneToBookSequence,
  normalizeBookSequence,
} from './book-sequence';

export type MissingBoardSnapshotScene = Omit<Scene, 'content'>;

export type DeletedBoardSceneRestoreStatus =
  | 'restored'
  | 'already_exists'
  | 'missing_snapshot_scene'
  | 'missing_text_version'
  | 'missing_plotline';

export interface DeletedBoardSceneRestoreResult {
  status: DeletedBoardSceneRestoreStatus;
  updates?: {
    scenes: Scene[];
    bookSequence: BookSequenceItem[];
    chapterMarkers: ChapterMarker[];
  };
  scene?: Scene;
  textVersion?: SceneVersion;
}

const normalizeVersionsNewestFirst = (versions: SceneVersion[]): SceneVersion[] =>
  [...versions].sort((a, b) => b.createdAt - a.createdAt);

const itemKey = (item: BookSequenceItem): string =>
  item.type === 'scene' ? `scene:${item.sceneId}` : `chapter:${item.chapterId}`;

export const findBoardSnapshotScenesMissingFromCurrent = (
  historicalSnapshot: BoardSnapshot,
  currentBook: Pick<Book, 'scenes'>
): MissingBoardSnapshotScene[] => {
  const currentSceneIds = new Set(currentBook.scenes.map(scene => scene.id));
  return historicalSnapshot.scenes.filter(scene => !currentSceneIds.has(scene.id));
};

export const chooseSceneVersionForDeletedSceneRestore = (
  versions: SceneVersion[]
): SceneVersion | null => {
  return normalizeVersionsNewestFirst(versions)[0] ?? null;
};

export const getHistoricalChapterForScene = (
  historicalSnapshot: BoardSnapshot,
  sceneId: string
): ChapterMarker | null => {
  const sequence = normalizeBookSequence(historicalSnapshot);
  const sceneIndex = sequence.findIndex(item => item.type === 'scene' && item.sceneId === sceneId);
  if (sceneIndex < 0) return null;

  const chaptersById = new Map((historicalSnapshot.chapterMarkers || []).map(marker => [marker.id, marker]));
  for (let index = sceneIndex - 1; index >= 0; index -= 1) {
    const item = sequence[index];
    if (item.type !== 'chapter-divider') continue;
    return chaptersById.get(item.chapterId) ?? null;
  }

  return null;
};

const getHistoricalRestoreIndex = (
  historicalSnapshot: BoardSnapshot,
  currentBook: Book,
  sceneId: string
): number => {
  const historicalSequence = normalizeBookSequence(historicalSnapshot);
  const currentSequence = normalizeBookSequence(currentBook);
  const historicalSceneIndex = historicalSequence.findIndex(item => item.type === 'scene' && item.sceneId === sceneId);
  if (historicalSceneIndex < 0) return currentSequence.length;

  const currentSceneIds = new Set(currentBook.scenes.map(scene => scene.id));
  const currentChapterIds = new Set((currentBook.chapterMarkers || []).map(marker => marker.id));
  const survivingHistoricalItemsBeforeScene = new Set(
    historicalSequence
      .slice(0, historicalSceneIndex)
      .filter(item => {
        if (item.type === 'scene') return currentSceneIds.has(item.sceneId);
        return currentChapterIds.has(item.chapterId);
      })
      .map(itemKey)
  );

  return currentSequence.filter(item => survivingHistoricalItemsBeforeScene.has(itemKey(item))).length;
};

export const restoreDeletedSceneFromBoardSnapshot = (
  currentBook: Book,
  historicalSnapshot: BoardSnapshot,
  sceneId: string,
  textVersion: SceneVersion | null
): DeletedBoardSceneRestoreResult => {
  if (currentBook.scenes.some(scene => scene.id === sceneId)) {
    return { status: 'already_exists' };
  }

  const historicalScene = historicalSnapshot.scenes.find(scene => scene.id === sceneId);
  if (!historicalScene) {
    return { status: 'missing_snapshot_scene' };
  }

  if (!textVersion) {
    return { status: 'missing_text_version', scene: { ...historicalScene, content: '' } };
  }

  const historicalPlotlineExists = currentBook.plotlines.some(plotline => plotline.id === historicalScene.plotlineId);
  const fallbackPlotlineId = currentBook.plotlines[0]?.id;
  const plotlineId = historicalPlotlineExists ? historicalScene.plotlineId : fallbackPlotlineId;

  if (!plotlineId) {
    return { status: 'missing_plotline', textVersion };
  }

  const restoredScene: Scene = {
    ...historicalScene,
    plotlineId,
    title: historicalScene.title || textVersion.sceneTitle,
    content: textVersion.content,
    restoredFromVersionId: textVersion.id,
  };

  const targetSequenceIndex = getHistoricalRestoreIndex(historicalSnapshot, currentBook, sceneId);
  const updates = addSceneToBookSequence(currentBook, restoredScene, targetSequenceIndex);

  if (!updates) {
    return { status: 'missing_plotline', scene: restoredScene, textVersion };
  }

  return {
    status: 'restored',
    updates,
    scene: restoredScene,
    textVersion,
  };
};
