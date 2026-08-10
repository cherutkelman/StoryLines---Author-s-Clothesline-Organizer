import React, { useRef, useState, useEffect, useMemo } from 'react';
import { BoardViewMode, BoardVersion } from '../types';
import { History } from 'lucide-react';
import BoardVersionHistorySidebar from './BoardVersionHistorySidebar';
import {
  createBoardPreviewProject,
  formatBoardVersionDate,
  formatBoardVersionTime,
  getBoardVersionDisplayName,
} from '../src/board-version-history-ui';
import { findBoardSnapshotScenesMissingFromCurrent } from '../src/board-deleted-scene-restore';
import { getBoardSequenceColumns } from '../src/book-sequence';
import { BoardProps } from './board/boardTypes';
import ChaptersBoardView from './board/ChaptersBoardView';
import PlotlinesBoardView from './board/PlotlinesBoardView';
import TimelineBoardView from './board/TimelineBoardView';
import BoardToolbar from './board/BoardToolbar';
import BoardSummary from './board/BoardSummary';
import { buildBoardChapters } from './board/boardHelpers';

const Board: React.FC<BoardProps> = ({ 
  project, 
  title, 
  visiblePlotlines, 
  onAddScene, 
  onAddSceneInSequence,
  onMoveSceneInSequence,
  updateScene, 
  onBulkAdd, 
  onDeleteScene, 
  initialZoom, 
  onZoomChange, 
  initialViewMode,
  onViewModeChange,
  onSceneDoubleClick, 
  onUpdateSummary, 
  onAddChapterMarker,
  onUpdateChapterMarker,
  onDeleteChapterMarker,
  onAddChapterDivider,
  onRenameChapter,
  onDeleteChapter,
  onMoveChapterDivider,
  onTimelineChange,
  timelineCollapsedGroupIds,
  onTimelineCollapsedGroupIdsChange,
  onLoadBoardVersions,
  onPreviewVersionChange,
  onRestoreDeletedSceneFromVersion
}) => {
  const dragItem = useRef<{ type: 'scene'; sceneId: string } | { type: 'chapter-divider'; chapterId: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(initialZoom || 1);
  const [viewMode, setViewMode] = useState<BoardViewMode>(initialViewMode || 'plotlines');
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<BoardVersion | null>(null);
  const [restoringDeletedSceneId, setRestoringDeletedSceneId] = useState<string | null>(null);
  const [deletedSceneRestoreError, setDeletedSceneRestoreError] = useState<string | null>(null);
  const [restoredDeletedSceneIds, setRestoredDeletedSceneIds] = useState<Set<string>>(() => new Set());
  const boardRef = useRef<HTMLDivElement>(null);
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const [timelineSelectionControlsHost, setTimelineSelectionControlsHost] = useState<HTMLDivElement | null>(null);
  const pinchGestureRef = useRef<{ distance: number; zoom: number } | null>(null);
  const isPreviewMode = Boolean(previewVersion);
  const boardProject = previewVersion ? createBoardPreviewProject(project, previewVersion) : project;
  const effectiveVisiblePlotlines = isPreviewMode
    ? boardProject.plotlines.map(plotline => plotline.id)
    : visiblePlotlines;

  useEffect(() => {
    onPreviewVersionChange?.(previewVersion);
  }, [previewVersion, onPreviewVersionChange]);

  useEffect(() => {
    return () => {
      onPreviewVersionChange?.(null);
    };
  }, [onPreviewVersionChange]);

  const closeBoardPreview = () => {
    setPreviewVersion(null);
    setDeletedSceneRestoreError(null);
    setRestoredDeletedSceneIds(new Set());
  };

  const showBoardPreview = (version: BoardVersion) => {
    setPreviewVersion(version);
    setDeletedSceneRestoreError(null);
    setRestoredDeletedSceneIds(new Set());
  };

  const currentSceneIds = useMemo(() => new Set(project.scenes.map(scene => scene.id)), [project.scenes]);
  const missingPreviewSceneIds = useMemo(() => {
    if (!previewVersion) return new Set<string>();
    return new Set(findBoardSnapshotScenesMissingFromCurrent(previewVersion.snapshot, project).map(scene => scene.id));
  }, [previewVersion, project]);

  useEffect(() => {
    setRestoredDeletedSceneIds(prev => {
      const next = new Set([...prev].filter(sceneId => currentSceneIds.has(sceneId)));
      return next.size === prev.size ? prev : next;
    });
  }, [currentSceneIds]);

  const handleRestoreDeletedScene = async (sceneId: string) => {
    if (!previewVersion || !onRestoreDeletedSceneFromVersion || restoringDeletedSceneId) return;

    setRestoringDeletedSceneId(sceneId);
    setDeletedSceneRestoreError(null);

    try {
      const result = await onRestoreDeletedSceneFromVersion(previewVersion, sceneId);
      if (result.success) {
        setRestoredDeletedSceneIds(prev => new Set(prev).add(sceneId));
        return;
      }
      if (result.message) {
        setDeletedSceneRestoreError(result.message);
      }
    } catch (error) {
      console.warn('[BoardVersionHistory] Failed to restore deleted scene.', error);
      setDeletedSceneRestoreError('לא ניתן היה להחזיר את הסצנה ללוח הנוכחי.');
    } finally {
      setRestoringDeletedSceneId(null);
    }
  };

  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(newZoom);
    if (!isPreviewMode) {
      onZoomChange?.(newZoom);
    }
  };


  useEffect(() => {
    if (!initialViewMode || initialViewMode === viewMode) return;
    setViewMode(initialViewMode);
  }, [initialViewMode, viewMode]);

  const handleViewModeChange = (newViewMode: BoardViewMode) => {
    setViewMode(newViewMode);
    if (!isPreviewMode) {
      onViewModeChange?.(newViewMode);
    }
  };

  const handleDragStart = (sceneId: string) => {
    if (isPreviewMode) return;
    dragItem.current = { type: 'scene', sceneId };
  };

  const handleChapterDragStart = (chapterId: string) => {
    if (isPreviewMode) return;
    dragItem.current = { type: 'chapter-divider', chapterId };
  };

  const getSceneSequenceIndex = (sceneId: string): number | null => {
    const index = boardColumns.findIndex(column => column.type === 'scene' && column.scene.id === sceneId);
    return index === -1 ? null : index;
  };

  const handleSceneSequenceDrop = (e: React.DragEvent, targetSequenceIndex: number, targetPlotlineId: string) => {
    e.preventDefault();
    if (isPreviewMode) {
      dragItem.current = null;
      return;
    }
    if (dragItem.current?.type === 'scene') {
      onMoveSceneInSequence?.(dragItem.current.sceneId, targetSequenceIndex, targetPlotlineId);
    } else if (dragItem.current?.type === 'chapter-divider') {
      onMoveChapterDivider?.(dragItem.current.chapterId, targetSequenceIndex);
    }
    dragItem.current = null;
  };

  const handleSceneRowDrop = (e: React.DragEvent, targetPlotlineId: string) => {
    e.preventDefault();
    if (isPreviewMode) {
      dragItem.current = null;
      return;
    }
    if (dragItem.current?.type === 'scene') {
      const currentSequenceIndex = getSceneSequenceIndex(dragItem.current.sceneId);
      if (currentSequenceIndex !== null) {
        onMoveSceneInSequence?.(dragItem.current.sceneId, currentSequenceIndex, targetPlotlineId);
      }
    }
    dragItem.current = null;
  };

  const handleChapterDividerDrop = (e: React.DragEvent, targetSequenceIndex: number) => {
    e.preventDefault();
    if (isPreviewMode) {
      dragItem.current = null;
      return;
    }
    if (dragItem.current?.type === 'chapter-divider') {
      onMoveChapterDivider?.(dragItem.current.chapterId, targetSequenceIndex);
    }
    dragItem.current = null;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  useEffect(() => {
    const boardContainer = boardScrollRef.current;
    if (!boardContainer) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        const newZoom = Math.min(Math.max(0.2, zoomLevel + delta), 1.5);
        handleZoomChange(newZoom);
      }
    };

    const getTouchDistance = (touches: TouchList) => {
      const firstTouch = touches[0];
      const secondTouch = touches[1];
      return Math.hypot(
        firstTouch.clientX - secondTouch.clientX,
        firstTouch.clientY - secondTouch.clientY
      );
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) {
        pinchGestureRef.current = null;
        return;
      }

      pinchGestureRef.current = {
        distance: getTouchDistance(e.touches),
        zoom: zoomLevel
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      const pinchGesture = pinchGestureRef.current;
      if (e.touches.length !== 2 || !pinchGesture) return;

      e.preventDefault();
      const nextDistance = getTouchDistance(e.touches);
      const nextZoom = Math.min(Math.max(0.2, pinchGesture.zoom * (nextDistance / pinchGesture.distance)), 1.5);
      handleZoomChange(nextZoom);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchGestureRef.current = null;
      }
    };

    boardContainer.addEventListener('wheel', handleWheel, { passive: false });
    boardContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
    boardContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    boardContainer.addEventListener('touchend', handleTouchEnd);
    boardContainer.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      boardContainer.removeEventListener('wheel', handleWheel);
      boardContainer.removeEventListener('touchstart', handleTouchStart);
      boardContainer.removeEventListener('touchmove', handleTouchMove);
      boardContainer.removeEventListener('touchend', handleTouchEnd);
      boardContainer.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [zoomLevel]);

  const exportBoard = () => {
    let text = `ייצוא לוח עלילה - ${title}\n`;
    text += `תאריך: ${new Date().toLocaleDateString('he-IL')}\n`;
    text += `-----------------------------------\n\n`;

    // Filter scenes to only include those from visible plotlines and sort by position (right to left)
    const exportedScenes = boardProject.scenes
      .filter(s => effectiveVisiblePlotlines.includes(s.plotlineId))
      .sort((a, b) => {
        if (a.position !== b.position) {
          return a.position - b.position;
        }
        // If same position, sort by plotline order
        const plotlineAIndex = boardProject.plotlines.findIndex(p => p.id === a.plotlineId);
        const plotlineBIndex = boardProject.plotlines.findIndex(p => p.id === b.plotlineId);
        return plotlineAIndex - plotlineBIndex;
      });

    if (exportedScenes.length === 0) {
      text += "אין סצנות להצגה בקווי העלילה הנבחרים.\n";
    } else {
      exportedScenes.forEach((scene, index) => {
        const chapterMarker = boardProject.chapterMarkers?.find(m => m.position === scene.position);
        if (chapterMarker) {
          text += `\n=== ${chapterMarker.title} ===\n\n`;
        }
        const plotline = boardProject.plotlines.find(p => p.id === scene.plotlineId);
        text += `סצנה ${index + 1} | קו עלילה: ${plotline?.name || 'ללא'} | מיקום: ${scene.position + 1}\n`;
        text += `כותרת: ${scene.title || 'ללא כותרת'}\n`;
        text += `תמצית:\n${scene.summary || 'לא נכתבה תמצית...'}\n`;
        text += `-----------------------------------\n\n`;
      });
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `board-export-${title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // The number of columns is the number of scenes plus one for adding at the end
  const columnCount = Math.max(boardProject.scenes.length + 1, 10);

  const activePlotlines = boardProject.plotlines.filter(p => effectiveVisiblePlotlines.includes(p.id));
  const boardColumns = useMemo(() => getBoardSequenceColumns(boardProject), [boardProject]);

  const chapters = buildBoardChapters(boardProject, effectiveVisiblePlotlines);

  const renderBoardView = () => {
    switch (viewMode) {
      case 'plotlines':
        return (
          <PlotlinesBoardView
            boardColumns={boardColumns}
            activePlotlines={activePlotlines}
            boardProject={boardProject}
            columnCount={columnCount}
            isPreviewMode={isPreviewMode}
            currentSceneIds={currentSceneIds}
            missingPreviewSceneIds={missingPreviewSceneIds}
            restoredDeletedSceneIds={restoredDeletedSceneIds}
            restoringDeletedSceneId={restoringDeletedSceneId}
            onAddScene={onAddScene}
            onAddSceneInSequence={onAddSceneInSequence}
            updateScene={updateScene}
            onDeleteScene={onDeleteScene}
            onSceneDoubleClick={onSceneDoubleClick}
            onAddChapterMarker={onAddChapterMarker}
            onUpdateChapterMarker={onUpdateChapterMarker}
            onDeleteChapterMarker={onDeleteChapterMarker}
            onAddChapterDivider={onAddChapterDivider}
            onRenameChapter={onRenameChapter}
            onDeleteChapter={onDeleteChapter}
            canRestoreDeletedScene={Boolean(onRestoreDeletedSceneFromVersion)}
            onRestoreDeletedScene={(sceneId) => { void handleRestoreDeletedScene(sceneId); }}
            onDragStart={handleDragStart}
            onChapterDragStart={handleChapterDragStart}
            onDragOver={handleDragOver}
            onChapterDividerDrop={handleChapterDividerDrop}
            onSceneSequenceDrop={handleSceneSequenceDrop}
            onSceneRowDrop={handleSceneRowDrop}
          />
        );
      case 'chapters':
        return (
          <ChaptersBoardView
            chapters={chapters}
            boardProject={boardProject}
            isPreviewMode={isPreviewMode}
            onSceneDoubleClick={onSceneDoubleClick}
            onUpdateChapterMarker={onUpdateChapterMarker}
            updateScene={updateScene}
          />
        );
      case 'timeline':
        return (
          <TimelineBoardView
            project={boardProject}
            selectionControlsHost={timelineSelectionControlsHost}
            onTimelineChange={isPreviewMode ? undefined : onTimelineChange}
            updateScene={isPreviewMode ? undefined : updateScene}
            collapsedGroupIds={timelineCollapsedGroupIds}
            onCollapsedGroupIdsChange={onTimelineCollapsedGroupIdsChange}
          />
        );
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col">
      <BoardToolbar
        zoomLevel={zoomLevel}
        viewMode={viewMode}
        isPreviewMode={isPreviewMode}
        canOpenHistory={Boolean(onLoadBoardVersions)}
        onZoomChange={handleZoomChange}
        onViewModeChange={handleViewModeChange}
        onBulkAdd={() => { if (!isPreviewMode) onBulkAdd(boardProject.plotlines[0]?.id || ''); }}
        onExport={exportBoard}
        onOpenHistory={() => setIsVersionHistoryOpen(true)}
      />

      {onLoadBoardVersions && (
        <BoardVersionHistorySidebar
          isOpen={isVersionHistoryOpen}
          boardTitle={title}
          onClose={() => setIsVersionHistoryOpen(false)}
          onLoadVersions={onLoadBoardVersions}
          activePreviewVersionId={previewVersion?.id ?? null}
          onPreviewVersion={showBoardPreview}
        />
      )}

      {previewVersion && (
        <div className="absolute right-6 top-20 z-40 flex max-w-[calc(100%-3rem)] flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 shadow-xl lg:top-24" dir="rtl">
          <History size={18} />
          <span>
            מציג גרסת לוח היסטורית: {getBoardVersionDisplayName(previewVersion)} ? {formatBoardVersionDate(previewVersion.createdAt)} ? {formatBoardVersionTime(previewVersion.createdAt)}
          </span>
          <button
            onClick={closeBoardPreview}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-black text-amber-900 shadow-sm hover:bg-amber-100"
          >
            חזור ללוח הנוכחי
          </button>
          {deletedSceneRestoreError && (
            <span className="w-full text-xs font-black text-red-700">
              {deletedSceneRestoreError}
            </span>
          )}
        </div>
      )}

      {/* Board Scrollable Area */}
      <div ref={boardScrollRef} className="flex-1 overflow-auto bg-[var(--theme-bg)] cursor-grab active:cursor-grabbing scrollbar-hide">
        {viewMode === 'timeline' && (
          <div
            ref={setTimelineSelectionControlsHost}
            data-timeline-controls-layer
            dir="rtl"
            className="pointer-events-none sticky left-0 right-0 top-4 z-[60] flex w-full max-w-full justify-end px-4 lg:top-24"
          />
        )}
        <div 
          ref={boardRef}
          className="p-32 pb-64 transition-transform duration-200 origin-top-right"
          style={{ 
            transform: `scale(${zoomLevel})`,
            width: `${100 / zoomLevel}%`,
            minWidth: 'max-content'
          }}
        >
          <div className="relative">
            {renderBoardView()}
            {viewMode !== 'timeline' && activePlotlines.length === 0 && (
              <div className="h-96 flex flex-col items-center justify-center text-[var(--theme-primary)]/20">
                <p className="text-xl font-bold">כל קווי העלילה מוסתרים</p>
                <p className="text-sm">השתמש בתפריט הצדדי כדי להציג אותם</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <BoardSummary
        summary={boardProject.summary || ''}
        readOnly={isPreviewMode}
        onUpdateSummary={onUpdateSummary}
      />

    </div>
  );
};

export default Board;
