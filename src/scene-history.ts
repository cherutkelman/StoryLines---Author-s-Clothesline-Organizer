import type { Project, Scene, SceneVersion, SceneVersionReason, SceneVersionType } from '../types';

export const SCENE_HISTORY_TYPING_IDLE_MS = 60_000;
export const SCENE_HISTORY_TYPING_CHANGE_THRESHOLD = 500;

export interface SceneHistoryCreateInput {
  project: Project;
  versions: SceneVersion[];
  bookId: string;
  sceneId: string;
  userId?: string;
  versionType: SceneVersionType;
  reason: SceneVersionReason;
  name?: string;
  note?: string;
  restoredFromVersionId?: string;
  now?: number;
  id?: string;
}

export interface SceneHistoryCreateFromSceneInput {
  scene: Scene;
  versions: SceneVersion[];
  bookId: string;
  userId?: string;
  versionType: SceneVersionType;
  reason: SceneVersionReason;
  name?: string;
  note?: string;
  restoredFromVersionId?: string;
  now?: number;
  id?: string;
}

export interface SceneHistoryRestoreInput {
  project: Project;
  versions: SceneVersion[];
  bookId: string;
  sceneId: string;
  versionId: string;
  userId?: string;
  now?: number;
  currentVersionId?: string;
}

export interface SceneHistoryCopyInput {
  project: Project;
  version: SceneVersion;
  versionId: string;
  newSceneId: string;
  position?: number;
}

export interface TextDiffPart {
  type: 'same' | 'added' | 'removed';
  text: string;
}

export interface ResolveSceneHistorySceneIdInput {
  displayedSceneId?: string | null;
  focusedSceneId?: string | null;
  expandedSceneIds: string[];
  editorFocusedSceneId?: string | null;
  validSceneIds: string[];
}

export const resolveSceneHistorySceneId = ({
  displayedSceneId,
  focusedSceneId,
  expandedSceneIds,
  editorFocusedSceneId,
  validSceneIds,
}: ResolveSceneHistorySceneIdInput): string | null => {
  const validIds = new Set(validSceneIds);
  if (displayedSceneId && validIds.has(displayedSceneId)) return displayedSceneId;
  if (focusedSceneId && validIds.has(focusedSceneId)) return focusedSceneId;
  const expandedSceneId = expandedSceneIds.find(sceneId => validIds.has(sceneId));
  if (expandedSceneId) return expandedSceneId;
  if (editorFocusedSceneId && validIds.has(editorFocusedSceneId)) return editorFocusedSceneId;
  return null;
};

export const getSceneVersions = (versions: SceneVersion[], sceneId: string): SceneVersion[] => {
  return versions
    .filter(version => version.sceneId === sceneId)
    .sort((a, b) => b.createdAt - a.createdAt);
};

export const getLatestSceneVersion = (versions: SceneVersion[], sceneId: string): SceneVersion | undefined => {
  return getSceneVersions(versions, sceneId)[0];
};

export const getSceneHistoryBaselineContent = (versions: SceneVersion[], scene: Scene): string => {
  return getLatestSceneVersion(versions, scene.id)?.content ?? scene.content;
};

export const calculateChangedCharacters = (previous: string, next: string): number => {
  if (previous === next) return 0;

  let prefixLength = 0;
  const maxPrefixLength = Math.min(previous.length, next.length);
  while (prefixLength < maxPrefixLength && previous[prefixLength] === next[prefixLength]) {
    prefixLength++;
  }

  let previousSuffixIndex = previous.length - 1;
  let nextSuffixIndex = next.length - 1;
  while (
    previousSuffixIndex >= prefixLength &&
    nextSuffixIndex >= prefixLength &&
    previous[previousSuffixIndex] === next[nextSuffixIndex]
  ) {
    previousSuffixIndex--;
    nextSuffixIndex--;
  }

  return (previousSuffixIndex - prefixLength + 1) + (nextSuffixIndex - prefixLength + 1);
};

export const shouldCreateSceneVersion = (versions: SceneVersion[], scene: Scene): boolean => {
  const latest = getLatestSceneVersion(versions, scene.id);
  return !latest || latest.content !== scene.content || latest.sceneTitle !== scene.title;
};

export const createSceneVersion = ({
  project,
  versions,
  bookId,
  sceneId,
  userId,
  versionType,
  reason,
  name,
  note,
  restoredFromVersionId,
  now = Date.now(),
  id = `sv-${now}-${Math.random().toString(36).slice(2, 10)}`,
}: SceneHistoryCreateInput): SceneVersion | null => {
  const scene = project.scenes.find(item => item.id === sceneId);
  if (!scene || !shouldCreateSceneVersion(versions, scene)) return null;

  return {
    id,
    bookId,
    sceneId,
    sceneTitle: scene.title,
    content: scene.content,
    createdAt: now,
    createdByUserId: userId,
    versionType,
    reason,
    name: name?.trim() || undefined,
    note: note?.trim() || undefined,
    restoredFromVersionId,
  };
};

export const createSceneVersionFromScene = ({
  scene,
  versions,
  bookId,
  userId,
  versionType,
  reason,
  name,
  note,
  restoredFromVersionId,
  now = Date.now(),
  id = `sv-${now}-${Math.random().toString(36).slice(2, 10)}`,
}: SceneHistoryCreateFromSceneInput): SceneVersion | null => {
  if (!shouldCreateSceneVersion(versions, scene)) return null;

  return {
    id,
    bookId,
    sceneId: scene.id,
    sceneTitle: scene.title,
    content: scene.content,
    createdAt: now,
    createdByUserId: userId,
    versionType,
    reason,
    name: name?.trim() || undefined,
    note: note?.trim() || undefined,
    restoredFromVersionId,
  };
};

export const restoreSceneVersion = ({
  project,
  versions,
  bookId,
  sceneId,
  versionId,
  userId,
  now = Date.now(),
  currentVersionId,
}: SceneHistoryRestoreInput): { project: Project; currentVersion: SceneVersion | null } => {
  const version = versions.find(item => item.id === versionId);
  const scene = project.scenes.find(item => item.id === sceneId);
  if (!version || !scene) return { project, currentVersion: null };

  const currentVersion = createSceneVersion({
    project,
    versions,
    bookId,
    sceneId,
    userId,
    versionType: 'automatic',
    reason: 'restore',
    now,
    id: currentVersionId,
  });

  return {
    currentVersion,
    project: {
      ...project,
      scenes: project.scenes.map(item =>
        item.id === sceneId
          ? {
              ...item,
              title: version.sceneTitle,
              content: version.content,
              restoredFromVersionId: version.id,
            }
          : item
      ),
    },
  };
};

export const copySceneVersionToNewScene = ({
  project,
  version,
  versionId,
  newSceneId,
  position,
}: SceneHistoryCopyInput): Project => {
  const sourceScene = version ? project.scenes.find(item => item.id === version.sceneId) : undefined;
  if (!sourceScene || version.id !== versionId) return project;

  const insertPosition = position ?? project.scenes.length;
  const newScene: Scene = {
    ...sourceScene,
    id: newSceneId,
    title: `עותק של ${version.sceneTitle}`,
    content: version.content,
    position: insertPosition,
    isCompleted: false,
    restoredFromVersionId: undefined,
  };

  const scenes = [...project.scenes];
  scenes.splice(insertPosition, 0, newScene);

  return {
    ...project,
    scenes: scenes.map((scene, index) => ({ ...scene, position: index })),
  };
};

const splitForDiff = (text: string): string[] => {
  const parts = text.match(/\s+|\S+/g);
  return parts || [];
};

export const diffText = (from: string, to: string): TextDiffPart[] => {
  const a = splitForDiff(from);
  const b = splitForDiff(to);
  const lengths: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lengths[i][j] = a[i] === b[j]
        ? lengths[i + 1][j + 1] + 1
        : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }

  const result: TextDiffPart[] = [];
  let i = 0;
  let j = 0;

  const pushPart = (type: TextDiffPart['type'], text: string) => {
    const last = result[result.length - 1];
    if (last?.type === type) {
      last.text += text;
    } else {
      result.push({ type, text });
    }
  };

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      pushPart('same', a[i]);
      i++;
      j++;
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
      pushPart('removed', a[i]);
      i++;
    } else {
      pushPart('added', b[j]);
      j++;
    }
  }

  while (i < a.length) {
    pushPart('removed', a[i]);
    i++;
  }

  while (j < b.length) {
    pushPart('added', b[j]);
    j++;
  }

  return result;
};
