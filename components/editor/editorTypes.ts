import type { Project, Scene, SceneVersion } from '../../types';

export interface EditorProps {
  project: Project;
  bookId: string;
  user: any;
  visiblePlotlines: string[];
  onUpdateScene: (id: string, updates: Partial<Scene>) => void;
  onDeleteScene: (id: string) => void;
  onOpenBulkAdd: () => void;
  initialFocusedSceneId?: string | null;
  onFocusScene?: (id: string | null, previousSceneSnapshot?: Scene) => Promise<void> | void;
  initialExpandedSceneIds?: string[];
  onExpandedScenesChange?: (ids: string[]) => void;
  initialDisplayMode?: 'full' | 'focus';
  onDisplayModeChange?: (mode: 'full' | 'focus') => void;
  onExport?: () => void;
  sceneVersions?: SceneVersion[];
  onLoadSceneVersions?: (sceneId: string) => Promise<number> | number;
  onCreateManualSceneVersion?: (sceneId: string, name?: string, note?: string) => void;
  onRestoreSceneVersion?: (sceneId: string, versionId: string) => void;
  onCopySceneVersion?: (versionId: string) => Promise<void> | void;
  onDeleteSceneVersion?: (versionId: string) => Promise<void> | void;
  onRenameSceneVersion?: (versionId: string, name?: string) => Promise<void> | void;
  onUpdateChapterMarker?: (id: string, updates: any) => void;
  isLibrarySidebarCollapsed?: boolean;
  externalSearchQuery?: string;
  onExternalSearchQueryChange?: (value: string) => void;
  externalCommand?: { action: 'tips' | 'closeAll'; nonce: number } | null;
  appActiveSceneId?: string | null;
}

export type EditorDisplayMode = 'full' | 'focus';

