import type { Project, TimelineData } from '../types';
import {
  moveTimelineItem,
  moveTimelinePoint,
  moveTimelineScenesAsBlock,
  moveTimelineSingletonPointsAsBlock,
  type TimelineItemPlacement,
} from './timeline-sequence';

export const TIMELINE_DRAG_THRESHOLD_PX = 6;

export const hasCrossedTimelineDragThreshold = (
  startX: number,
  startY: number,
  clientX: number,
  clientY: number
): boolean => Math.hypot(clientX - startX, clientY - startY) >= TIMELINE_DRAG_THRESHOLD_PX;

export const getTimelineDropPlacement = (
  clientX: number,
  bounds: Pick<DOMRect, 'left' | 'width'>
): TimelineItemPlacement => clientX >= bounds.left + bounds.width / 2 ? 'before' : 'after';

export const commitTimelinePointerReorder = (
  project: Project,
  itemId: string,
  targetItemId: string,
  placement: TimelineItemPlacement,
  onTimelineChange: (timeline: TimelineData) => void
): boolean => {
  const timeline = moveTimelineItem(project, itemId, targetItemId, placement);
  if (!timeline) return false;
  onTimelineChange(timeline);
  return true;
};

export const commitTimelineSceneBlockPointerReorder = (
  project: Project,
  selectedSceneIds: Iterable<string>,
  targetSceneId: string,
  placement: TimelineItemPlacement,
  onTimelineChange: (timeline: TimelineData) => void
): boolean => {
  const timeline = moveTimelineScenesAsBlock(project, selectedSceneIds, targetSceneId, placement);
  if (!timeline) return false;
  onTimelineChange(timeline);
  return true;
};

export const commitTimelinePointPointerReorder = (
  project: Project,
  pointId: string,
  targetPointId: string,
  placement: TimelineItemPlacement,
  onTimelineChange: (timeline: TimelineData) => void
): boolean => {
  const timeline = moveTimelinePoint(project, pointId, targetPointId, placement);
  if (!timeline) return false;
  onTimelineChange(timeline);
  return true;
};

export const commitTimelineSingletonPointBlockPointerReorder = (
  project: Project,
  selectedSceneIds: Iterable<string>,
  targetPointId: string,
  placement: TimelineItemPlacement,
  onTimelineChange: (timeline: TimelineData) => void
): boolean => {
  const timeline = moveTimelineSingletonPointsAsBlock(
    project,
    selectedSceneIds,
    targetPointId,
    placement
  );
  if (!timeline) return false;
  onTimelineChange(timeline);
  return true;
};
