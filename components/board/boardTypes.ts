import { BoardVersion, BoardViewMode, ChapterMarker, Project, Scene } from '../../types';

export interface BoardProps {
  project: Project;
  title: string;
  visiblePlotlines: string[];
  onAddScene: (plotlineId: string, position: number) => void;
  onAddSceneInSequence?: (plotlineId: string, targetSequenceIndex: number) => void;
  onMoveScene: (id: string, targetGlobalIndex: number, targetPlotlineId: string) => void;
  onMoveSceneInSequence?: (sceneId: string, targetSequenceIndex: number, targetPlotlineId: string) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  onBulkAdd: (plotlineId: string) => void;
  onDeleteScene: (id: string) => void;
  initialZoom?: number;
  onZoomChange?: (zoom: number) => void;
  initialViewMode?: BoardViewMode;
  onViewModeChange?: (viewMode: BoardViewMode) => void;
  onSceneDoubleClick?: (sceneId: string) => void;
  onUpdateSummary: (summary: string) => void;
  onUpdateChapterTitle: (position: number, title: string) => void;
  onAddChapterMarker: (position: number) => void;
  onUpdateChapterMarker: (id: string, updates: Partial<ChapterMarker>) => void;
  onDeleteChapterMarker: (id: string) => void;
  onAddChapterDivider?: (sequenceIndex: number) => void;
  onRenameChapter?: (chapterId: string, title: string) => void;
  onDeleteChapter?: (chapterId: string) => void;
  onMoveChapterDivider?: (chapterId: string, targetSequenceIndex: number) => void;
  onLoadBoardVersions?: () => Promise<BoardVersion[]> | BoardVersion[];
  onPreviewVersionChange?: (version: BoardVersion | null) => void;
  onRestoreDeletedSceneFromVersion?: (version: BoardVersion, sceneId: string) => Promise<{ success: boolean; message?: string }> | { success: boolean; message?: string };
}

export interface BoardChapter {
  id: string;
  title: string;
  scenes: Scene[];
  isEditable?: boolean;
}
