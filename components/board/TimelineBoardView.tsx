import React, { useEffect, useReducer, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Check, ChevronDown, ChevronLeft, Clock3, MousePointer2, Plus, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Project, Scene, TimelineData } from '../../types';
import {
  createTimelineGroup,
  detachSceneFromTimelinePoint,
  addScenesToTimelineGroup,
  getEffectiveTimelinePoints,
  getEffectiveTimelineItems,
  getEligibleTimelineGroupTargets,
  getUnplacedTimelineScenes,
  moveSceneToTimelinePoint,
  placeSceneInTimeline,
  renameTimelineGroup,
  removeScenesFromTimelineGroup,
  type TimelineItemPlacement,
  ungroupTimelineGroup,
  validateTimelineGroupSceneRemoval,
  validateTimelineGroupSelection,
} from '../../src/timeline-sequence';
import {
  initialTimelineSelectionState,
  timelineSelectionReducer,
} from '../../src/timeline-selection';
import { toggleTimelineCollapsedGroupId } from '../../src/timeline-collapse';
import { normalizeSceneTimeLabel } from '../../src/scene-time-label';
import {
  commitTimelinePointPointerReorder,
  commitTimelineSingletonPointBlockPointerReorder,
  getTimelineDropPlacement,
  hasCrossedTimelineDragThreshold,
} from '../../src/timeline-pointer-reorder';

interface TimelineBoardViewProps {
  project: Project;
  selectionControlsHost?: HTMLElement | null;
  onTimelineChange?: (timeline: TimelineData) => void;
  updateScene?: (sceneId: string, updates: Partial<Scene>) => void;
  collapsedGroupIds?: string[];
  onCollapsedGroupIdsChange?: (groupIds: string[]) => void;
}

interface TimelineDropTarget {
  itemId: string;
  placement: TimelineItemPlacement;
}

interface TimelinePointerGesture {
  itemId: string;
  pointIds: string[];
  sceneIds: string[];
  pointerId: number;
  startX: number;
  startY: number;
  isDragging: boolean;
  captureElement: HTMLElement;
}

const TimelineDialogPortal: React.FC<React.PropsWithChildren> = ({ children }) => {
  if (typeof document === 'undefined') return <>{children}</>;
  return createPortal(children, document.body);
};

interface TimelineSceneCardProps {
  scene: Scene;
  project: Project;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelection: (sceneId: string) => void;
  onUpdateTimeLabel?: (sceneId: string, timeLabel: string | undefined) => void;
  timeLabelSuggestions: string[];
  onStartSameTime?: (scene: Scene) => void;
  onDetachFromPoint?: (scene: Scene) => void;
}

const TimelineSceneCard: React.FC<TimelineSceneCardProps> = ({
  scene,
  project,
  isSelectionMode,
  isSelected,
  onToggleSelection,
  onUpdateTimeLabel,
  timeLabelSuggestions,
  onStartSameTime,
  onDetachFromPoint,
}) => {
  const plotline = project.plotlines.find(item => item.id === scene.plotlineId);
  const displayedTimeLabel = scene.timeLabel?.trim();

  const toggleSelection = () => {
    if (isSelectionMode) onToggleSelection(scene.id);
  };

  return (
    <article
      data-timeline-scene-id={scene.id}
      data-selected={isSelected ? 'true' : 'false'}
      role={isSelectionMode ? 'button' : undefined}
      tabIndex={isSelectionMode ? 0 : undefined}
      aria-pressed={isSelectionMode ? isSelected : undefined}
      aria-label={isSelectionMode ? `${isSelected ? 'בטל בחירה של' : 'בחר את'} ${scene.title}` : undefined}
      onClick={toggleSelection}
      onKeyDown={event => {
        if (isSelectionMode && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onToggleSelection(scene.id);
        }
      }}
      className={`relative flex h-64 w-52 shrink-0 flex-col rounded-sm border-t-8 bg-[var(--theme-card)] p-5 shadow-xl transition-all ${
        isSelectionMode ? 'cursor-pointer touch-manipulation' : ''
      } ${
        isSelected
          ? 'ring-4 ring-[var(--theme-accent)] ring-offset-4 ring-offset-[var(--theme-bg)] shadow-2xl'
          : ''
      }`}
      style={{ borderTopColor: plotline?.color }}
    >
      {isSelected && (
        <div className="absolute -right-3 -top-3 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--theme-accent)] text-white shadow-lg" aria-hidden="true">
          <Check size={18} strokeWidth={3} />
        </div>
      )}
      <div className="absolute -top-7 left-1/2 z-20 flex h-10 w-4 -translate-x-1/2 flex-col items-center gap-1 rounded-full border border-[var(--theme-border)]/50 bg-[var(--theme-secondary)] py-1 shadow-md">
        <div className="h-1 w-1 rounded-full bg-[var(--theme-primary)]/20" />
        <div className="h-4 w-2 rounded-full bg-[var(--theme-primary)]/5" />
      </div>
      <h3 className="mt-4 w-full text-center text-xl font-bold text-[var(--theme-primary)] handwritten">
        {scene.title}
      </h3>
      <div className="my-5 h-px bg-[var(--theme-secondary)]" />
      <div
        data-scene-time-label={displayedTimeLabel ? scene.id : undefined}
        data-scene-time-label-editor
        className="flex items-center gap-2 border-b border-[var(--theme-secondary)] pb-3"
      >
        <label htmlFor={`timeline-scene-time-${scene.id}`} className="shrink-0 text-sm font-black text-[var(--theme-primary)]">
          זמן
        </label>
        <input
          id={`timeline-scene-time-${scene.id}`}
          type="text"
          list={`timeline-time-label-options-${scene.id}`}
          value={scene.timeLabel || ''}
          readOnly={isSelectionMode || !onUpdateTimeLabel}
          placeholder="למשל: למחרת בבוקר"
          onPointerDown={event => event.stopPropagation()}
          onClick={event => event.stopPropagation()}
          onChange={event => onUpdateTimeLabel?.(scene.id, event.target.value || undefined)}
          onBlur={event => {
            const timeLabel = normalizeSceneTimeLabel(event.currentTarget.value);
            if (timeLabel !== scene.timeLabel) onUpdateTimeLabel?.(scene.id, timeLabel);
          }}
          className={`min-w-0 flex-1 bg-transparent p-0 text-right text-sm font-bold text-[var(--theme-accent)] placeholder:text-[var(--theme-primary)]/30 border-none focus:ring-0 ${
            isSelectionMode ? 'pointer-events-none' : ''
          }`}
        />
        <datalist id={`timeline-time-label-options-${scene.id}`}>
          {timeLabelSuggestions.map(suggestion => <option key={suggestion} value={suggestion} />)}
        </datalist>
      </div>
      <div className="mt-auto flex flex-col items-center justify-center gap-2 pt-4">
        {onStartSameTime && (
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              onStartSameTime(scene);
            }}
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg px-2 text-xs font-bold text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]"
          >
            <Clock3 size={11} />
            <span>מתרחש באותו זמן כמו...</span>
          </button>
        )}
        {onDetachFromPoint && (
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              onDetachFromPoint(scene);
            }}
            className="flex min-h-8 w-full items-center justify-center gap-1 rounded-lg px-1.5 text-[9px] font-bold text-[var(--theme-primary)]/55 hover:bg-[var(--theme-secondary)]"
          >
            <ArrowLeft size={11} />
            <span>הפרד מנקודת הזמן</span>
          </button>
        )}
        {plotline && (
          <span
            className="text-sm font-black"
            style={{ color: plotline.color }}
          >
            {plotline.name}
          </span>
        )}
      </div>
    </article>
  );
};

const TimelineArrow = () => (
  <div data-timeline-arrow className="flex w-14 shrink-0 items-center justify-center text-[var(--theme-primary)]/25" aria-hidden="true">
    <div className="h-px flex-1 bg-[var(--theme-border)]" />
    <ArrowLeft size={18} />
  </div>
);

const TimelinePlacementPoint: React.FC<{ targetIndex: number; onPlace: (targetIndex: number) => void }> = ({
  targetIndex,
  onPlace,
}) => (
  <button
    type="button"
    data-timeline-placement-index={targetIndex}
    onClick={() => onPlace(targetIndex)}
    className="mx-2 flex min-h-20 w-24 shrink-0 touch-manipulation flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--theme-accent)] bg-[var(--theme-card)]/90 px-2 py-3 text-xs font-black text-[var(--theme-accent)] shadow-md"
    aria-label={`שבץ כאן במיקום ${targetIndex + 1}`}
  >
    <Plus size={22} />
    <span>שבץ כאן</span>
  </button>
);

const TimelineBoardView: React.FC<TimelineBoardViewProps> = ({
  project,
  selectionControlsHost,
  onTimelineChange,
  updateScene,
  collapsedGroupIds = [],
  onCollapsedGroupIdsChange,
}) => {
  const [selection, dispatchSelection] = useReducer(
    timelineSelectionReducer,
    undefined,
    initialTimelineSelectionState
  );
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');
  const [pendingUngroupGroupId, setPendingUngroupGroupId] = useState<string | null>(null);
  const [pendingRenameGroupId, setPendingRenameGroupId] = useState<string | null>(null);
  const [renameGroupTitle, setRenameGroupTitle] = useState('');
  const [isAddToGroupDialogOpen, setIsAddToGroupDialogOpen] = useState(false);
  const [addToGroupTargetId, setAddToGroupTargetId] = useState('');
  const [isRemoveFromGroupDialogOpen, setIsRemoveFromGroupDialogOpen] = useState(false);
  const [placingSceneId, setPlacingSceneId] = useState<string | null>(null);
  const [sameTimeSource, setSameTimeSource] = useState<{ sceneId: string; pointId: string } | null>(null);
  const [pendingDetachSceneId, setPendingDetachSceneId] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TimelineDropTarget | null>(null);
  const pointerGestureRef = useRef<TimelinePointerGesture | null>(null);
  const suppressNextTimelineClickRef = useRef(false);
  const dropTargetRef = useRef<TimelineDropTarget | null>(null);
  const points = getEffectiveTimelinePoints(project);
  const selectedSingletonPoints = points.filter(point =>
    point.sceneIds.length === 1 && selection.selectedSceneIds.has(point.sceneIds[0])
  );
  const canReorderSelection = selection.selectedSceneIds.size >= 2
    && selectedSingletonPoints.length === selection.selectedSceneIds.size;
  const unplacedScenes = getUnplacedTimelineScenes(project);
  const scenesById = new Map(project.scenes.map(scene => [scene.id, scene]));
  const getTimeLabelSuggestionsForScene = (sceneId: string) => Array.from(new Set(
    project.scenes
      .filter(scene => scene.id !== sceneId)
      .map(scene => normalizeSceneTimeLabel(scene.timeLabel || ''))
      .filter((label): label is string => Boolean(label))
  ));
  const placingScene = placingSceneId ? scenesById.get(placingSceneId) : undefined;
  const sameTimeSourceScene = sameTimeSource ? scenesById.get(sameTimeSource.sceneId) : undefined;
  const pendingDetachScene = pendingDetachSceneId ? scenesById.get(pendingDetachSceneId) : undefined;
  const groupSelectionValidation = validateTimelineGroupSelection(
    project,
    selection.selectedSceneIds
  );
  const canCreateGroup = groupSelectionValidation.isValid && Boolean(onTimelineChange);
  const eligibleGroupTargets = getEligibleTimelineGroupTargets(project, selection.selectedSceneIds);
  const canAddToGroup = eligibleGroupTargets.length > 0 && Boolean(onTimelineChange);
  const groupRemovalValidation = validateTimelineGroupSceneRemoval(project, selection.selectedSceneIds);
  const canRemoveFromGroup = groupRemovalValidation.isValid && Boolean(onTimelineChange);

  const groupSelectionReason = (() => {
    switch (groupSelectionValidation.reason) {
      case 'minimum-scenes':
        return 'יש לבחור לפחות שתי סצנות רצופות';
      case 'not-top-level-scenes':
        return 'אפשר לקבץ כרגע רק סצנות עצמאיות שאינן בתוך קבוצה';
      case 'not-consecutive':
        return 'אפשר ליצור קבוצה רק מסצנות רצופות בציר הזמן';
      default:
        return undefined;
    }
  })();

  const closeCreateGroupDialog = () => {
    setIsCreateGroupDialogOpen(false);
    setGroupTitle('');
  };

  const submitTimelineGroup = (event: React.FormEvent) => {
    event.preventDefault();
    if (!onTimelineChange) return;

    const timeline = createTimelineGroup(
      project,
      selection.selectedSceneIds,
      groupTitle,
      `timeline-group-${uuidv4()}`
    );
    if (!timeline) return;

    onTimelineChange(timeline);
    closeCreateGroupDialog();
    dispatchSelection({ type: 'exit' });
  };

  const resetPointerDrag = () => {
    pointerGestureRef.current = null;
    dropTargetRef.current = null;
    setDraggedItemId(null);
    setDropTarget(null);
  };

  const updateDropTarget = (target: TimelineDropTarget | null) => {
    dropTargetRef.current = target;
    setDropTarget(target);
  };

  const handleReorderPointerDown = (
    event: React.PointerEvent<HTMLElement>,
    pointId: string,
    pointSceneIds: string[]
  ) => {
    if (placingSceneId || sameTimeSource || !onTimelineChange) return;
    if (selection.isSelectionMode && (!canReorderSelection
      || !pointSceneIds.some(sceneId => selection.selectedSceneIds.has(sceneId)))) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, input, textarea, select, a, [contenteditable="true"]')) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Window-level listeners below keep the gesture reliable when capture is unavailable.
    }
    pointerGestureRef.current = {
      itemId: pointId,
      pointIds: selection.isSelectionMode
        ? selectedSingletonPoints.map(point => point.id)
        : [pointId],
      sceneIds: selection.isSelectionMode ? [...selection.selectedSceneIds] : [...pointSceneIds],
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      isDragging: false,
      captureElement: event.currentTarget,
    };
  };

  const handleReorderPointerMove = (event: PointerEvent) => {
    const gesture = pointerGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || placingSceneId) return;

    if (!gesture.isDragging) {
      if (!hasCrossedTimelineDragThreshold(
        gesture.startX,
        gesture.startY,
        event.clientX,
        event.clientY
      )) return;
      gesture.isDragging = true;
      suppressNextTimelineClickRef.current = true;
      setDraggedItemId(gesture.itemId);
    }

    event.preventDefault();
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const targetElement = element?.closest<HTMLElement>('[data-timeline-point-id]');
    const targetPointId = targetElement?.dataset.timelinePointId;
    if (!targetElement || !targetPointId || gesture.pointIds.includes(targetPointId)) {
      updateDropTarget(null);
      return;
    }

    const bounds = targetElement.getBoundingClientRect();
    const placement = getTimelineDropPlacement(event.clientX, bounds);
    updateDropTarget({ itemId: targetPointId, placement });
  };

  const handleReorderPointerEnd = (event: PointerEvent) => {
    const gesture = pointerGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const activeDropTarget = dropTargetRef.current;
    if (gesture.isDragging && activeDropTarget && onTimelineChange) {
      const changed = gesture.pointIds.length === 1
        ? commitTimelinePointPointerReorder(
          project,
          gesture.pointIds[0],
          activeDropTarget.itemId,
          activeDropTarget.placement,
          onTimelineChange
        )
        : commitTimelineSingletonPointBlockPointerReorder(
          project,
          gesture.sceneIds,
          activeDropTarget.itemId,
          activeDropTarget.placement,
          onTimelineChange
        );
      if (changed && gesture.pointIds.length > 1) {
        dispatchSelection({ type: 'exit' });
      }
    }
    try {
      if (gesture.captureElement.hasPointerCapture(event.pointerId)) {
        gesture.captureElement.releasePointerCapture(event.pointerId);
      }
    } catch {
      // The handle may have been detached during a render; the gesture is still reset below.
    }
    resetPointerDrag();
  };

  const handleReorderPointerCancel = (event: PointerEvent) => {
    const gesture = pointerGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    try {
      if (gesture.captureElement.hasPointerCapture(event.pointerId)) {
        gesture.captureElement.releasePointerCapture(event.pointerId);
      }
    } catch {
      // The handle may have been detached during a render; cancellation remains safe.
    }
    resetPointerDrag();
  };

  useEffect(() => {
    window.addEventListener('pointermove', handleReorderPointerMove, { passive: false });
    window.addEventListener('pointerup', handleReorderPointerEnd);
    window.addEventListener('pointercancel', handleReorderPointerCancel);
    return () => {
      window.removeEventListener('pointermove', handleReorderPointerMove);
      window.removeEventListener('pointerup', handleReorderPointerEnd);
      window.removeEventListener('pointercancel', handleReorderPointerCancel);
    };
  });

  const confirmUngroupTimelineGroup = () => {
    if (!pendingUngroupGroupId || !onTimelineChange) return;
    const timeline = ungroupTimelineGroup(project, pendingUngroupGroupId);
    if (!timeline) return;

    onTimelineChange(timeline);
    setPendingUngroupGroupId(null);
  };

  const openRenameGroupDialog = (groupId: string, currentTitle: string) => {
    setPendingRenameGroupId(groupId);
    setRenameGroupTitle(currentTitle);
  };

  const closeRenameGroupDialog = () => {
    setPendingRenameGroupId(null);
    setRenameGroupTitle('');
  };

  const submitRenameTimelineGroup = (event: React.FormEvent) => {
    event.preventDefault();
    if (!pendingRenameGroupId || !onTimelineChange) return;

    const timeline = renameTimelineGroup(project, pendingRenameGroupId, renameGroupTitle);
    if (timeline) onTimelineChange(timeline);
    closeRenameGroupDialog();
  };

  const openAddToGroupDialog = () => {
    if (!eligibleGroupTargets.length) return;
    setAddToGroupTargetId(eligibleGroupTargets[0].groupId);
    setIsAddToGroupDialogOpen(true);
  };

  const closeAddToGroupDialog = () => {
    setIsAddToGroupDialogOpen(false);
    setAddToGroupTargetId('');
  };

  const submitAddToTimelineGroup = (event: React.FormEvent) => {
    event.preventDefault();
    if (!onTimelineChange || !addToGroupTargetId) return;
    const timeline = addScenesToTimelineGroup(
      project,
      addToGroupTargetId,
      selection.selectedSceneIds
    );
    if (!timeline) return;

    onTimelineChange(timeline);
    closeAddToGroupDialog();
    dispatchSelection({ type: 'exit' });
  };

  const closeRemoveFromGroupDialog = () => setIsRemoveFromGroupDialogOpen(false);

  const submitRemoveFromTimelineGroup = (event: React.FormEvent) => {
    event.preventDefault();
    if (!onTimelineChange || !groupRemovalValidation.groupId) return;
    const timeline = removeScenesFromTimelineGroup(
      project,
      groupRemovalValidation.groupId,
      selection.selectedSceneIds
    );
    if (!timeline) return;

    onTimelineChange(timeline);
    closeRemoveFromGroupDialog();
    dispatchSelection({ type: 'exit' });
  };

  useEffect(() => {
    if (placingSceneId && !unplacedScenes.some(scene => scene.id === placingSceneId)) {
      setPlacingSceneId(null);
    }
  }, [placingSceneId, project.scenes, project.timeline]);

  const startPlacingScene = (sceneId: string) => {
    if (sameTimeSource) return;
    dispatchSelection({ type: 'exit' });
    setPlacingSceneId(sceneId);
  };

  const placeSceneAtIndex = (targetIndex: number) => {
    if (!placingSceneId || !onTimelineChange || sameTimeSource) return;
    const timeline = placeSceneInTimeline(project, placingSceneId, targetIndex);
    if (!timeline) return;

    onTimelineChange(timeline);
    setPlacingSceneId(null);
  };

  const groupRemovalReason = (() => {
    switch (groupRemovalValidation.reason) {
      case 'not-consecutive':
      case 'not-at-edge':
        return 'ניתן להוציא רק סצנות רצופות מתחילת הקבוצה או מסופה';
      case 'minimum-remaining':
        return 'בקבוצה חייבות להישאר לפחות שתי סצנות';
      case 'not-one-group':
        return 'כל הסצנות חייבות להיות בתוך אותה קבוצת זמן';
      default:
        return undefined;
    }
  })();

  const startSameTimeMode = (sceneId: string, pointId: string) => {
    if (!onTimelineChange || placingSceneId) return;
    dispatchSelection({ type: 'exit' });
    setSameTimeSource({ sceneId, pointId });
  };

  const chooseSameTimeTarget = (targetPointId: string) => {
    if (!sameTimeSource || !onTimelineChange || targetPointId === sameTimeSource.pointId) return;
    const timeline = moveSceneToTimelinePoint(project, sameTimeSource.sceneId, targetPointId);
    if (!timeline) return;
    onTimelineChange(timeline);
    setSameTimeSource(null);
  };

  const confirmDetachScene = (placement: TimelineItemPlacement) => {
    if (!pendingDetachSceneId || !onTimelineChange) return;
    const timeline = detachSceneFromTimelinePoint(project, pendingDetachSceneId, placement);
    if (!timeline) return;
    onTimelineChange(timeline);
    setPendingDetachSceneId(null);
  };

  const renderSceneCard = (scene: Scene, sameTimePointId?: string) => (
    <TimelineSceneCard
      scene={scene}
      project={project}
      isSelectionMode={selection.isSelectionMode}
      isSelected={selection.selectedSceneIds.has(scene.id)}
      onToggleSelection={sceneId => dispatchSelection({ type: 'toggle', sceneId })}
      onUpdateTimeLabel={updateScene
        ? (sceneId, timeLabel) => updateScene(sceneId, { timeLabel })
        : undefined}
      timeLabelSuggestions={getTimeLabelSuggestionsForScene(scene.id)}
      onStartSameTime={!selection.isSelectionMode && !sameTimeSource && !placingSceneId && sameTimePointId
        ? () => startSameTimeMode(scene.id, sameTimePointId)
        : undefined}
      onDetachFromPoint={!selection.isSelectionMode && !sameTimeSource && !placingSceneId && !sameTimePointId
        ? () => setPendingDetachSceneId(scene.id)
        : undefined}
    />
  );

  const renderUnplacedSceneCard = (scene: Scene) => (
    <TimelineSceneCard
      scene={scene}
      project={project}
      isSelectionMode={false}
      isSelected={false}
      onToggleSelection={() => undefined}
      onUpdateTimeLabel={updateScene
        ? (sceneId, timeLabel) => updateScene(sceneId, { timeLabel })
        : undefined}
      timeLabelSuggestions={getTimeLabelSuggestionsForScene(scene.id)}
    />
  );

  const legacyGroupedItems = getEffectiveTimelineItems(project).flatMap(item => {
    if (item.type === 'scene') {
      const scene = scenesById.get(item.sceneId);
      return scene
        ? [{ key: item.id, content: renderSceneCard(scene) }]
        : [];
    }

    if (item.type === 'point') return [];

    const groupScenes = item.sceneIds
      .map(sceneId => scenesById.get(sceneId))
      .filter((scene): scene is Scene => Boolean(scene));
    const isCollapsed = collapsedGroupIds.includes(item.id);

    return [{
      key: item.id,
      content: (
        <section
          data-timeline-group-id={item.id}
          className="shrink-0 rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-secondary)]/35 px-8 pb-8 pt-6 shadow-sm"
        >
          <div className={`${isCollapsed ? '' : 'mb-9'} flex items-center gap-3 text-[var(--theme-primary)]`}>
            {onCollapsedGroupIdsChange && (
              <button
                type="button"
                onClick={event => {
                  event.stopPropagation();
                  onCollapsedGroupIdsChange(toggleTimelineCollapsedGroupId(collapsedGroupIds, item.id));
                }}
                className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)]/80 text-[var(--theme-primary)] hover:bg-[var(--theme-card)]"
                aria-label={isCollapsed ? `פתח את הקבוצה ${item.title}` : `כווץ את הקבוצה ${item.title}`}
                aria-expanded={!isCollapsed}
              >
                {isCollapsed ? <ChevronLeft size={20} /> : <ChevronDown size={20} />}
              </button>
            )}
            <Clock3 size={20} />
            <h2 className="text-xl font-black handwritten">{item.title}</h2>
            {isCollapsed && (
              <span data-timeline-group-scene-count={groupScenes.length} className="rounded-full bg-[var(--theme-card)]/75 px-3 py-1 text-xs font-black text-[var(--theme-primary)]/60">
                {groupScenes.length} סצנות
              </span>
            )}
            {onTimelineChange && (
              <div className="mr-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openRenameGroupDialog(item.id, item.title)}
                  className="min-h-10 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)]/80 px-3 py-2 text-xs font-bold text-[var(--theme-primary)]/70 hover:bg-[var(--theme-card)]"
                >
                  שינוי כותרת
                </button>
                <button
                  type="button"
                  onClick={() => setPendingUngroupGroupId(item.id)}
                  className="min-h-10 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)]/80 px-3 py-2 text-xs font-bold text-[var(--theme-primary)]/70 hover:bg-[var(--theme-card)]"
                >
                  פירוק קבוצה
                </button>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <div className="flex items-center" dir="rtl">
              {groupScenes.map((scene, index) => (
                <React.Fragment key={`${item.id}-${scene.id}`}>
                  {index > 0 && <TimelineArrow />}
                  {renderSceneCard(scene)}
                </React.Fragment>
              ))}
            </div>
          )}
        </section>
      ),
    }];
  });

  void legacyGroupedItems;
  const renderedPoints = points.flatMap(point => {
    const pointScenes = point.sceneIds
      .map(sceneId => scenesById.get(sceneId))
      .filter((scene): scene is Scene => Boolean(scene));
    if (pointScenes.length === 0) return [];

    const plotlineSections = pointScenes.reduce<Array<{ plotlineId: string; scenes: Scene[] }>>(
      (sections, scene) => {
        const existingSection = sections.find(section => section.plotlineId === scene.plotlineId);
        if (existingSection) existingSection.scenes.push(scene);
        else sections.push({ plotlineId: scene.plotlineId, scenes: [scene] });
        return sections;
      },
      []
    );

    return [{
      key: point.id,
      sceneIds: pointScenes.map(scene => scene.id),
      isMultiScene: pointScenes.length > 1,
      content: pointScenes.length === 1
        ? renderSceneCard(pointScenes[0], point.id)
        : (
          <section
            data-timeline-multi-scene-point
            className="flex shrink-0 flex-col gap-5 rounded-3xl border border-[var(--theme-border)]/70 bg-[var(--theme-secondary)]/20 p-5 shadow-sm"
            aria-label="סצנות שמתרחשות באותו זמן"
          >
            <span className="self-center rounded-full bg-[var(--theme-card)] px-3 py-1 text-[10px] font-black text-[var(--theme-primary)]/55 shadow-sm">
              באותו זמן
            </span>
            {plotlineSections.map(section => {
              const plotline = project.plotlines.find(item => item.id === section.plotlineId);
              return (
                <div key={section.plotlineId} data-timeline-point-plotline={section.plotlineId} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 px-1 text-xs font-black text-[var(--theme-primary)]/60">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: plotline?.color || '#999' }} />
                    <span>{plotline?.name || 'ללא קו עלילה'}</span>
                  </div>
                  <div className="flex flex-col gap-6">
                    {section.scenes.map(scene => (
                      <React.Fragment key={scene.id}>{renderSceneCard(scene)}</React.Fragment>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        ),
    }];
  });

  if (renderedPoints.length === 0 && unplacedScenes.length === 0) {
    return (
      <div className="flex h-96 min-w-[36rem] items-center justify-center rounded-3xl border-2 border-dashed border-[var(--theme-border)] bg-[var(--theme-card)]/30 px-12 text-center">
        <p className="text-xl font-bold text-[var(--theme-primary)]/40">אין עדיין סצנות בציר הזמן</p>
      </div>
    );
  }

  return (
    <section className="w-full min-w-0" aria-label="ציר זמן" dir="rtl">
      {selectionControlsHost && createPortal(
      <div
        data-timeline-selection-toolbar
        className="pointer-events-auto flex min-h-14 w-fit max-w-full flex-wrap items-center gap-2 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)]/95 p-1.5 shadow-xl backdrop-blur-md sm:gap-3 sm:p-2"
        aria-label="בקרי בחירת סצנות"
      >
        {sameTimeSource ? (
          <>
            <span className="px-3 text-sm font-black text-[var(--theme-primary)]" aria-live="polite">
              בחרי נקודת זמן עבור „{sameTimeSourceScene?.title || ''}”
            </span>
            <button
              type="button"
              onClick={() => setSameTimeSource(null)}
              className="min-h-11 rounded-xl border border-[var(--theme-border)] px-4 py-2 text-sm font-bold text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]"
            >
              ביטול
            </button>
          </>
        ) : !selection.isSelectionMode ? (
          <button
            type="button"
            disabled={Boolean(placingSceneId)}
            onClick={() => dispatchSelection({ type: 'enter' })}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-[var(--theme-card)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <MousePointer2 size={18} />
            <span>בחירת סצנות</span>
          </button>
        ) : (
          <>
            <span data-selected-count={selection.selectedSceneIds.size} className="px-3 text-sm font-black text-[var(--theme-primary)]" aria-live="polite">
              {selection.selectedSceneIds.size} סצנות נבחרו
            </span>
            <button
              type="button"
              onClick={() => dispatchSelection({ type: 'clear' })}
              className="min-h-11 rounded-xl border border-[var(--theme-border)] px-4 py-2 text-sm font-bold text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]"
            >
              ביטול בחירה
            </button>
            {false && <>
            <button
              type="button"
              disabled={!canCreateGroup}
              onClick={() => setIsCreateGroupDialogOpen(true)}
              className="min-h-11 rounded-xl bg-[var(--theme-accent)] px-4 py-2 text-sm font-bold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
            >
              צור קבוצת זמן
            </button>
            <button
              type="button"
              disabled={!canAddToGroup}
              onClick={openAddToGroupDialog}
              className="min-h-11 rounded-xl bg-[var(--theme-accent)] px-4 py-2 text-sm font-bold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
            >
              הוסף לקבוצת זמן
            </button>
            <button
              type="button"
              disabled={!canRemoveFromGroup}
              onClick={() => setIsRemoveFromGroupDialogOpen(true)}
              className="min-h-11 rounded-xl border border-[var(--theme-accent)] px-4 py-2 text-sm font-bold text-[var(--theme-accent)] transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
            >
              הוצא מקבוצת זמן
            </button>
            <button
              type="button"
              onClick={() => dispatchSelection({ type: 'exit' })}
              className="flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-[var(--theme-primary)]/70 hover:bg-[var(--theme-secondary)]"
            >
              <X size={18} />
              <span>יציאה ממצב בחירה</span>
            </button>
            {!canCreateGroup && !canRemoveFromGroup && groupSelectionReason && (
              <span className="max-w-52 px-2 text-xs font-bold text-[var(--theme-primary)]/50">
                {groupSelectionReason}
              </span>
            )}
            {selection.selectedSceneIds.size > 0 && !canAddToGroup && !canRemoveFromGroup && (
              <span className="max-w-52 px-2 text-xs font-bold text-[var(--theme-primary)]/50">
                אפשר להוסיף רק סצנות עצמאיות ורצופות שצמודות ישירות לקבוצה
              </span>
            )}
            {selection.selectedSceneIds.size > 0 && !canRemoveFromGroup && groupRemovalReason && (
              <span className="max-w-52 px-2 text-xs font-bold text-[var(--theme-primary)]/50">
                {groupRemovalReason}
              </span>
            )}
            </>}
            {canReorderSelection && (
              <span className="max-w-52 px-2 text-xs font-bold text-[var(--theme-primary)]/50">
                גררו אחת מהסצנות שנבחרו כדי להזיז את כולן יחד
              </span>
            )}
          </>
        )}
      </div>,
      selectionControlsHost
      )}
      <div data-timeline-wide-content className="min-w-max px-8 py-12">
      {placingSceneId && placingScene && (
        <div className="sticky right-8 z-30 mb-8 flex w-fit items-center gap-4 rounded-2xl border border-[var(--theme-accent)] bg-[var(--theme-card)] px-5 py-3 text-sm font-bold text-[var(--theme-primary)] shadow-xl">
          <span>משבצים כעת: „{placingScene.title}”</span>
          <button type="button" onClick={() => setPlacingSceneId(null)} className="min-h-11 rounded-xl border border-[var(--theme-border)] px-4 py-2 text-sm font-bold hover:bg-[var(--theme-secondary)]">
            ביטול שיבוץ
          </button>
        </div>
      )}
      <div className="mb-12 flex items-center text-xs font-black uppercase tracking-widest text-[var(--theme-primary)]/35">
        <span>תחילת הציר</span>
        <div className="mx-4 h-px flex-1 bg-[var(--theme-border)]" />
      </div>
      <div className="flex items-center">
        {renderedPoints.length === 0 && !placingSceneId && (
          <div className="flex h-44 w-80 items-center justify-center rounded-3xl border-2 border-dashed border-[var(--theme-border)] text-sm font-bold text-[var(--theme-primary)]/35">
            אין סצנות משובצות בציר הזמן
          </div>
        )}
        {renderedPoints.map((point, index) => (
          <React.Fragment key={point.key}>
            {placingSceneId ? (
              <TimelinePlacementPoint targetIndex={index} onPlace={placeSceneAtIndex} />
            ) : index > 0 ? (
              <TimelineArrow />
            ) : null}
            <div
              data-timeline-point-id={point.key}
              data-timeline-point-scene-count={point.sceneIds.length}
              data-timeline-top-level-item-id={point.key}
              data-timeline-scene-id={point.isMultiScene ? undefined : point.sceneIds[0]}
              data-timeline-drag-surface
              onPointerDown={event => handleReorderPointerDown(event, point.key, point.sceneIds)}
              onClickCapture={event => {
                if (!suppressNextTimelineClickRef.current) return;
                suppressNextTimelineClickRef.current = false;
                event.preventDefault();
                event.stopPropagation();
              }}
              className={`relative shrink-0 rounded-3xl transition-all ${
                !sameTimeSource && !placingSceneId && onTimelineChange
                  ? 'touch-none cursor-grab active:cursor-grabbing'
                  : ''
              } ${
                draggedItemId === point.key
                || (draggedItemId && point.sceneIds.some(sceneId => selection.selectedSceneIds.has(sceneId)))
                  ? 'opacity-45'
                  : ''
              } ${sameTimeSource?.pointId === point.key
                ? 'ring-4 ring-[var(--theme-accent)] ring-offset-4 ring-offset-[var(--theme-bg)]'
                : sameTimeSource
                  ? 'ring-2 ring-[var(--theme-border)] ring-offset-4 ring-offset-[var(--theme-bg)]'
                  : ''
              }`}
            >
              {sameTimeSource && sameTimeSource.pointId !== point.key && (
                <button
                  type="button"
                  data-same-time-target-point-id={point.key}
                  onClick={() => chooseSameTimeTarget(point.key)}
                  className="mb-4 flex min-h-11 w-full touch-manipulation items-center justify-center rounded-xl bg-[var(--theme-accent)] px-4 py-2 text-sm font-black text-white shadow-md"
                >
                  באותו זמן עם
                </button>
              )}
              {dropTarget?.itemId === point.key && (
                <div
                  data-timeline-drop-indicator={dropTarget.placement}
                  className={`pointer-events-none absolute -top-4 bottom-[-1rem] z-50 w-1 rounded-full bg-[var(--theme-accent)] shadow-lg ${
                    dropTarget.placement === 'before' ? '-right-7' : '-left-7'
                  }`}
                />
              )}
              {point.content}
            </div>
          </React.Fragment>
        ))}
        {placingSceneId && (
          <TimelinePlacementPoint targetIndex={renderedPoints.length} onPlace={placeSceneAtIndex} />
        )}
      </div>
      <div className="mt-12 flex items-center text-xs font-black uppercase tracking-widest text-[var(--theme-primary)]/35">
        <div className="ml-4 h-px flex-1 bg-[var(--theme-border)]" />
        <span>סוף הציר</span>
      </div>
      {unplacedScenes.length > 0 && (
        <aside data-unplaced-timeline-scenes className="mt-20 border-t-4 border-dashed border-[var(--theme-border)] pt-10" aria-label="סצנות שטרם שובצו בציר הזמן">
          <div className="mb-10 max-w-2xl rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)]/70 px-6 py-5 shadow-sm">
            <h2 className="text-2xl font-black text-[var(--theme-primary)] handwritten">סצנות שטרם שובצו בציר הזמן</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--theme-primary)]/55">
              סצנות אלה נוספו לאחר שנקבע סדר כרונולוגי ועדיין לא שובצו בו. סדר הצגתן כאן הוא סדר הספר בלבד ואינו מיקום כרונולוגי.
            </p>
          </div>
          <div className="flex items-start gap-8 rounded-3xl bg-[var(--theme-secondary)]/25 p-8">
            {unplacedScenes.map(scene => (
              <div key={scene.id} data-unplaced-timeline-scene-id={scene.id} className="relative shrink-0 rounded-xl border-2 border-dashed border-[var(--theme-border)] p-3">
                <span className="mb-8 block rounded-full bg-[var(--theme-primary)]/10 px-3 py-1 text-center text-[10px] font-black text-[var(--theme-primary)]/55">
                  טרם שובצה
                </span>
                {renderUnplacedSceneCard(scene)}
                {onTimelineChange && (
                  <button
                    type="button"
                    disabled={Boolean(sameTimeSource) || Boolean(placingSceneId && placingSceneId !== scene.id)}
                    onClick={() => startPlacingScene(scene.id)}
                    className="mt-3 flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary)] px-3 py-2 text-sm font-bold text-[var(--theme-card)] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Plus size={17} />
                    <span>שבץ בציר הזמן</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>
      )}
      </div>
      <TimelineDialogPortal>
      {pendingDetachSceneId && pendingDetachScene && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4" role="presentation" onMouseDown={event => {
          if (event.target === event.currentTarget) setPendingDetachSceneId(null);
        }}>
          <div
            className="w-full max-w-md rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 text-right shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="timeline-detach-scene-dialog-title"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 id="timeline-detach-scene-dialog-title" className="text-xl font-black text-[var(--theme-primary)]">
                הפרדת „{pendingDetachScene.title}” מנקודת הזמן
              </h2>
              <button type="button" onClick={() => setPendingDetachSceneId(null)} className="rounded-xl p-2 text-[var(--theme-primary)]/60 hover:bg-[var(--theme-secondary)]" aria-label="סגור">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-[var(--theme-primary)]/70">
              היכן למקם את נקודת הזמן העצמאית של הסצנה?
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => confirmDetachScene('before')} className="min-h-11 rounded-xl bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-[var(--theme-card)]">
                לפני נקודת הזמן
              </button>
              <button type="button" onClick={() => confirmDetachScene('after')} className="min-h-11 rounded-xl bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-[var(--theme-card)]">
                אחרי נקודת הזמן
              </button>
            </div>
            <button type="button" onClick={() => setPendingDetachSceneId(null)} className="mt-3 min-h-11 w-full rounded-xl px-4 py-2 text-sm font-bold text-[var(--theme-primary)]/65 hover:bg-[var(--theme-secondary)]">
              ביטול
            </button>
          </div>
        </div>
      )}
      {isCreateGroupDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4" role="presentation" onMouseDown={event => {
          if (event.target === event.currentTarget) closeCreateGroupDialog();
        }}>
          <form
            onSubmit={submitTimelineGroup}
            className="w-full max-w-md rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 text-right shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="timeline-group-dialog-title"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 id="timeline-group-dialog-title" className="text-xl font-black text-[var(--theme-primary)]">
                יצירת קבוצת זמן
              </h2>
              <button type="button" onClick={closeCreateGroupDialog} className="rounded-xl p-2 text-[var(--theme-primary)]/60 hover:bg-[var(--theme-secondary)]" aria-label="סגור">
                <X size={20} />
              </button>
            </div>
            <label className="mb-2 block text-sm font-bold text-[var(--theme-primary)]" htmlFor="timeline-group-title">
              כותרת הקבוצה
            </label>
            <input
              id="timeline-group-title"
              autoFocus
              value={groupTitle}
              onChange={event => setGroupTitle(event.target.value)}
              className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-3 text-[var(--theme-primary)] outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/40"
              placeholder="למשל: לפני התאונה"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeCreateGroupDialog} className="min-h-11 rounded-xl px-4 py-2 text-sm font-bold text-[var(--theme-primary)]/65 hover:bg-[var(--theme-secondary)]">
                ביטול
              </button>
              <button type="submit" disabled={!groupTitle.trim()} className="min-h-11 rounded-xl bg-[var(--theme-primary)] px-5 py-2 text-sm font-bold text-[var(--theme-card)] disabled:cursor-not-allowed disabled:opacity-35">
                צור קבוצה
              </button>
            </div>
          </form>
        </div>
      )}
      {pendingUngroupGroupId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4" role="presentation" onMouseDown={event => {
          if (event.target === event.currentTarget) setPendingUngroupGroupId(null);
        }}>
          <div
            className="w-full max-w-md rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 text-right shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="timeline-ungroup-dialog-title"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 id="timeline-ungroup-dialog-title" className="text-xl font-black text-[var(--theme-primary)]">
                פירוק קבוצת זמן
              </h2>
              <button type="button" onClick={() => setPendingUngroupGroupId(null)} className="rounded-xl p-2 text-[var(--theme-primary)]/60 hover:bg-[var(--theme-secondary)]" aria-label="סגור">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-[var(--theme-primary)]/70">
              הקבוצה עצמה תוסר, אך הסצנות לא יימחקו. הן יישארו בדיוק באותו מקום בציר הזמן ובאותו סדר כרונולוגי.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setPendingUngroupGroupId(null)} className="min-h-11 rounded-xl px-4 py-2 text-sm font-bold text-[var(--theme-primary)]/65 hover:bg-[var(--theme-secondary)]">
                ביטול
              </button>
              <button type="button" onClick={confirmUngroupTimelineGroup} className="min-h-11 rounded-xl bg-[var(--theme-primary)] px-5 py-2 text-sm font-bold text-[var(--theme-card)]">
                פירוק קבוצה
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingRenameGroupId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4" role="presentation" onMouseDown={event => {
          if (event.target === event.currentTarget) closeRenameGroupDialog();
        }}>
          <form
            onSubmit={submitRenameTimelineGroup}
            className="w-full max-w-md rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 text-right shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="timeline-rename-dialog-title"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 id="timeline-rename-dialog-title" className="text-xl font-black text-[var(--theme-primary)]">
                שינוי כותרת קבוצת זמן
              </h2>
              <button type="button" onClick={closeRenameGroupDialog} className="rounded-xl p-2 text-[var(--theme-primary)]/60 hover:bg-[var(--theme-secondary)]" aria-label="סגור">
                <X size={20} />
              </button>
            </div>
            <label className="mb-2 block text-sm font-bold text-[var(--theme-primary)]" htmlFor="timeline-rename-group-title">
              כותרת הקבוצה
            </label>
            <input
              id="timeline-rename-group-title"
              autoFocus
              value={renameGroupTitle}
              onChange={event => setRenameGroupTitle(event.target.value)}
              className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-3 text-[var(--theme-primary)] outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/40"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeRenameGroupDialog} className="min-h-11 rounded-xl px-4 py-2 text-sm font-bold text-[var(--theme-primary)]/65 hover:bg-[var(--theme-secondary)]">
                ביטול
              </button>
              <button type="submit" disabled={!renameGroupTitle.trim()} className="min-h-11 rounded-xl bg-[var(--theme-primary)] px-5 py-2 text-sm font-bold text-[var(--theme-card)] disabled:cursor-not-allowed disabled:opacity-35">
                שמור כותרת
              </button>
            </div>
          </form>
        </div>
      )}
      {isAddToGroupDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4" role="presentation" onMouseDown={event => {
          if (event.target === event.currentTarget) closeAddToGroupDialog();
        }}>
          <form
            onSubmit={submitAddToTimelineGroup}
            className="w-full max-w-md rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 text-right shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="timeline-add-to-group-dialog-title"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 id="timeline-add-to-group-dialog-title" className="text-xl font-black text-[var(--theme-primary)]">
                הוספה לקבוצת זמן
              </h2>
              <button type="button" onClick={closeAddToGroupDialog} className="rounded-xl p-2 text-[var(--theme-primary)]/60 hover:bg-[var(--theme-secondary)]" aria-label="סגור">
                <X size={20} />
              </button>
            </div>
            <p className="mb-4 text-sm text-[var(--theme-primary)]/65">בחרו את קבוצת היעד הצמודה לסצנות:</p>
            <div className="space-y-2">
              {eligibleGroupTargets.map(target => (
                <label key={target.groupId} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[var(--theme-border)] px-4 py-3 text-sm font-bold text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]">
                  <input
                    type="radio"
                    name="timeline-target-group"
                    value={target.groupId}
                    checked={addToGroupTargetId === target.groupId}
                    onChange={() => setAddToGroupTargetId(target.groupId)}
                    className="accent-[var(--theme-accent)]"
                  />
                  <span>{target.title}</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeAddToGroupDialog} className="min-h-11 rounded-xl px-4 py-2 text-sm font-bold text-[var(--theme-primary)]/65 hover:bg-[var(--theme-secondary)]">
                ביטול
              </button>
              <button type="submit" disabled={!addToGroupTargetId} className="min-h-11 rounded-xl bg-[var(--theme-primary)] px-5 py-2 text-sm font-bold text-[var(--theme-card)] disabled:cursor-not-allowed disabled:opacity-35">
                הוסף לקבוצה
              </button>
            </div>
          </form>
        </div>
      )}
      {isRemoveFromGroupDialogOpen && groupRemovalValidation.isValid && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4" role="presentation" onMouseDown={event => {
          if (event.target === event.currentTarget) closeRemoveFromGroupDialog();
        }}>
          <form
            onSubmit={submitRemoveFromTimelineGroup}
            className="w-full max-w-md rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 text-right shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="timeline-remove-from-group-dialog-title"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 id="timeline-remove-from-group-dialog-title" className="text-xl font-black text-[var(--theme-primary)]">
                הוצאה מקבוצת זמן
              </h2>
              <button type="button" onClick={closeRemoveFromGroupDialog} className="rounded-xl p-2 text-[var(--theme-primary)]/60 hover:bg-[var(--theme-secondary)]" aria-label="סגור">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-[var(--theme-primary)]/70">
              {groupRemovalValidation.orderedSceneIds.length} סצנות יוצאו מהקבוצה „{groupRemovalValidation.groupTitle}”. הסצנות לא יימחקו ויישארו בדיוק באותו מקום כרונולוגי בציר.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeRemoveFromGroupDialog} className="min-h-11 rounded-xl px-4 py-2 text-sm font-bold text-[var(--theme-primary)]/65 hover:bg-[var(--theme-secondary)]">
                ביטול
              </button>
              <button type="submit" className="min-h-11 rounded-xl bg-[var(--theme-primary)] px-5 py-2 text-sm font-bold text-[var(--theme-card)]">
                הוצא מהקבוצה
              </button>
            </div>
          </form>
        </div>
      )}
      </TimelineDialogPortal>
    </section>
  );
};

export default TimelineBoardView;
