import type { BoardVersion, BoardVersionReason, BoardVersionType, Project } from '../types';

export const BOARD_HISTORY_EMPTY_MESSAGE = 'עדיין לא נשמרו גרסאות ללוח העלילה.';

export interface BoardVersionListItem {
  id: string;
  displayName: string;
  dateLabel: string;
  timeLabel: string;
  typeLabel: string;
  reasonLabel: string;
  isLatest: boolean;
  version: BoardVersion;
}

export const getBoardVersionTypeLabel = (versionType: BoardVersionType): string => {
  const labels: Record<BoardVersionType, string> = {
    automatic: 'אוטומטית',
    manual: 'ידנית',
  };
  return labels[versionType];
};

export const getBoardVersionReasonLabel = (reason: BoardVersionReason): string => {
  const labels: Record<BoardVersionReason, string> = {
    board_exit: 'יציאה מלוח העלילה',
    manual: 'שמירה ידנית',
  };
  return labels[reason];
};

export const formatBoardVersionDate = (createdAt: number): string => {
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(createdAt));
};

export const formatBoardVersionTime = (createdAt: number): string => {
  return new Intl.DateTimeFormat('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(createdAt));
};

export const getBoardVersionDisplayName = (version: BoardVersion): string => {
  return version.manualName?.trim() || getBoardVersionTypeLabel(version.versionType);
};

export const prepareBoardVersionList = (versions: BoardVersion[]): BoardVersionListItem[] => {
  return [...versions]
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((version, index) => ({
      id: version.id,
      displayName: getBoardVersionDisplayName(version),
      dateLabel: formatBoardVersionDate(version.createdAt),
      timeLabel: formatBoardVersionTime(version.createdAt),
      typeLabel: getBoardVersionTypeLabel(version.versionType),
      reasonLabel: getBoardVersionReasonLabel(version.reason),
      isLatest: index === 0,
      version,
    }));
};

export const selectBoardVersionId = (
  versions: BoardVersion[],
  requestedVersionId: string | null
): string | null => {
  if (!requestedVersionId) return null;
  return versions.some(version => version.id === requestedVersionId) ? requestedVersionId : null;
};

export const createBoardPreviewProject = (liveProject: Project, version: BoardVersion): Project => {
  return {
    ...liveProject,
    ...version.snapshot,
    scenes: version.snapshot.scenes.map(scene => ({
      ...scene,
      content: '',
    })),
  };
};

export const isBoardVersionPreviewReadOnly = (version: BoardVersion | null): boolean => {
  return Boolean(version);
};

export const runBoardMutationIfEditable = (readOnly: boolean, mutation: () => void): boolean => {
  if (readOnly) return false;
  mutation();
  return true;
};
