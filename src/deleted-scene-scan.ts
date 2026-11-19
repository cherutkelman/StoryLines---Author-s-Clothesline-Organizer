import type { Project, SceneVersion } from '../types';
import { groupMissingSceneVersions, type SceneInventory } from './deleted-scene-history';
import type { SceneVersionPage } from './scene-version-storage';

type ScanRequest = { cursor?: string };

interface ScanState {
  bookId: string;
  versions: SceneVersion[];
  versionsBeforeLastPage?: SceneVersion[];
  scannedCount: number;
  nextCursor?: string;
  request?: ScanRequest;
  error?: 'permission-denied' | 'load-failed';
}

type ScanAction =
  | { type: 'load' }
  | { type: 'success'; request: ScanRequest; page: SceneVersionPage }
  | { type: 'failure'; request: ScanRequest; error: unknown };

export function startDeletedSceneScan(bookId: string): ScanState {
  return { bookId, versions: [], scannedCount: 0, request: {} };
}

export function reduceDeletedSceneScan(state: ScanState, action: ScanAction): ScanState {
  if (action.type === 'load') {
    if (state.request || (!state.error && !state.nextCursor)) return state;
    return { ...state, error: undefined, request: { cursor: state.nextCursor } };
  }
  if (state.request !== action.request) return state;

  if (action.type === 'failure') {
    const code = (action.error as { code?: unknown } | null)?.code;
    const error = code === 'permission-denied' || code === 'firestore/permission-denied'
      ? 'permission-denied'
      : 'load-failed';
    return { ...state, request: undefined, error };
  }

  const { page } = action;
  const byId = new Map(state.versions.map(version => [version.id, version]));
  for (const version of page.versions) {
    if (version.bookId === state.bookId) byId.set(version.id, version);
  }
  return {
    ...state,
    request: undefined,
    nextCursor: page.nextCursor,
    scannedCount: state.scannedCount + page.scannedCount,
    versions: Array.from(byId.values()),
    versionsBeforeLastPage: action.request.cursor && page.scannedCount > 0 ? state.versions : undefined,
  };
}

export function getDeletedSceneScanResults(state: ScanState, project: Project, inventory: SceneInventory) {
  const groups = groupMissingSceneVersions(state.bookId, project, inventory, state.versions);
  const verified = groups.filter(group => group.verified);
  const previouslyVerified = state.versionsBeforeLastPage && new Set(
    groupMissingSceneVersions(state.bookId, project, inventory, state.versionsBeforeLastPage)
      .filter(group => group.verified)
      .map(group => group.sceneId),
  );
  return {
    groups,
    verifiedCount: verified.length,
    noNewMissingScenes: !state.request && !state.error && previouslyVerified !== undefined
      && verified.every(group => previouslyVerified.has(group.sceneId)),
  };
}

export function describeSceneVersionContent(content: unknown): string {
  if (typeof content !== 'string') return 'שדה התוכן חסר או אינו תקין במסמך הגרסה.';
  return content === '' ? 'הגרסה נשמרה עם תוכן ריק.' : content;
}
