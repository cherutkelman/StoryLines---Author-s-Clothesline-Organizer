import type { Project, Scene, TimelineData, TimelineItem, TimelineSceneItem } from '../types';
import { getOrderedSceneIds, normalizeBookSequence } from './book-sequence';

const toDefaultTimelineSceneItem = (sceneId: string): TimelineSceneItem => ({
  id: `timeline-scene-${sceneId}`,
  type: 'scene',
  sceneId,
});

export const getEffectiveTimelineItems = (project: Project): TimelineItem[] => {
  if (project.timeline) {
    return project.timeline.items;
  }

  return normalizeBookSequence(project)
    .filter(item => item.type === 'scene')
    .map(item => toDefaultTimelineSceneItem(item.sceneId));
};

export interface EffectiveTimelinePoint {
  id: string;
  sceneIds: string[];
}

export const getEffectiveTimelinePoints = (project: Project): EffectiveTimelinePoint[] => {
  const existingSceneIds = new Set(project.scenes.map(scene => scene.id));
  const items = getEffectiveTimelineItems(project);

  return items.flatMap(item => {
    if (item.type === 'scene') {
      return existingSceneIds.has(item.sceneId)
        ? [{ id: item.id, sceneIds: [item.sceneId] }]
        : [];
    }

    if (item.type === 'point') {
      const sceneIds = item.sceneIds.filter(sceneId => existingSceneIds.has(sceneId));
      return sceneIds.length > 0 ? [{ id: item.id, sceneIds }] : [];
    }

    return item.sceneIds.flatMap((sceneId, index) =>
      existingSceneIds.has(sceneId)
        ? [{ id: `${item.id}-scene-${index}-${sceneId}`, sceneIds: [sceneId] }]
        : []
    );
  });
};

export const getFlatEffectiveTimelineSceneItems = (project: Project): TimelineSceneItem[] =>
  flattenTimelineSceneIds(getEffectiveTimelineItems(project)).map(toDefaultTimelineSceneItem);

export const getUnplacedTimelineScenes = (project: Project): Scene[] => {
  if (!project.timeline) return [];

  const placedSceneIds = new Set(flattenTimelineSceneIds(project.timeline.items));
  const scenesById = new Map(project.scenes.map(scene => [scene.id, scene]));
  return getOrderedSceneIds(project)
    .filter(sceneId => !placedSceneIds.has(sceneId))
    .map(sceneId => scenesById.get(sceneId))
    .filter((scene): scene is Scene => Boolean(scene));
};

export const placeSceneInTimeline = (
  project: Project,
  sceneId: string,
  targetPointIndex: number
): TimelineData | null => {
  if (!project.timeline) return null;
  if (!project.scenes.some(scene => scene.id === sceneId)) return null;
  const points = getEffectiveTimelinePoints(project);
  if (!Number.isInteger(targetPointIndex)
    || targetPointIndex < 0
    || targetPointIndex > points.length) {
    return null;
  }

  const placedSceneIds = new Set(flattenTimelineSceneIds(project.timeline.items));
  if (placedSceneIds.has(sceneId)) return null;

  const existingPointIds = new Set(points.map(point => point.id));
  const baseId = `timeline-scene-${sceneId}`;
  let pointId = baseId;
  let suffix = 1;
  while (existingPointIds.has(pointId)) {
    pointId = `${baseId}-${suffix}`;
    suffix += 1;
  }
  const newPoint: EffectiveTimelinePoint = { id: pointId, sceneIds: [sceneId] };
  const nextPoints = [
    ...points.slice(0, targetPointIndex),
    newPoint,
    ...points.slice(targetPointIndex),
  ];
  return serializeEffectiveTimelinePoints(project, nextPoints);
};

export interface TimelineGroupSelectionValidation {
  isValid: boolean;
  reason?: 'minimum-scenes' | 'not-top-level-scenes' | 'not-consecutive';
  orderedSceneIds: string[];
  startIndex: number | null;
}

export const validateTimelineGroupSelection = (
  project: Project,
  selectedSceneIds: Iterable<string>
): TimelineGroupSelectionValidation => {
  const selectedIds = new Set(selectedSceneIds);
  if (selectedIds.size < 2) {
    return { isValid: false, reason: 'minimum-scenes', orderedSceneIds: [], startIndex: null };
  }

  const items = getEffectiveTimelineItems(project);
  const selectedEntries = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.type === 'scene' && selectedIds.has(item.sceneId));

  if (selectedEntries.length !== selectedIds.size) {
    return { isValid: false, reason: 'not-top-level-scenes', orderedSceneIds: [], startIndex: null };
  }

  const startIndex = selectedEntries[0].index;
  const areConsecutive = selectedEntries.every(({ index }, offset) => index === startIndex + offset);
  if (!areConsecutive) {
    return { isValid: false, reason: 'not-consecutive', orderedSceneIds: [], startIndex: null };
  }

  return {
    isValid: true,
    orderedSceneIds: selectedEntries.map(({ item }) => item.type === 'scene' ? item.sceneId : ''),
    startIndex,
  };
};

export const createTimelineGroup = (
  project: Project,
  selectedSceneIds: Iterable<string>,
  title: string,
  groupId: string
): TimelineData | null => {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return null;

  const validation = validateTimelineGroupSelection(project, selectedSceneIds);
  if (!validation.isValid || validation.startIndex === null) return null;

  const items = getEffectiveTimelineItems(project);
  const selectedIds = new Set(validation.orderedSceneIds);
  const nextItems: TimelineItem[] = [];

  items.forEach((item, index) => {
    if (index === validation.startIndex) {
      nextItems.push({
        id: groupId,
        type: 'group',
        title: trimmedTitle,
        sceneIds: validation.orderedSceneIds,
      });
    }
    if (item.type === 'scene' && selectedIds.has(item.sceneId)) return;
    nextItems.push(item);
  });

  return { items: nextItems };
};

export type TimelineItemPlacement = 'before' | 'after';

const serializeEffectiveTimelinePoints = (
  project: Project,
  points: readonly EffectiveTimelinePoint[]
): TimelineData => {
  const storedItemsById = new Map(project.timeline?.items.map(item => [item.id, item]) ?? []);
  return {
    items: points.map(point => {
      const storedItem = storedItemsById.get(point.id);
      if (point.sceneIds.length > 1 || storedItem?.type === 'point') {
        return { id: point.id, type: 'point' as const, sceneIds: [...point.sceneIds] };
      }
      return { id: point.id, type: 'scene' as const, sceneId: point.sceneIds[0] };
    }),
  };
};

export const moveTimelinePoint = (
  project: Project,
  pointId: string,
  targetPointId: string,
  placement: TimelineItemPlacement
): TimelineData | null => {
  if (pointId === targetPointId) return null;
  const points = getEffectiveTimelinePoints(project);
  const sourceIndex = points.findIndex(point => point.id === pointId);
  const targetIndex = points.findIndex(point => point.id === targetPointId);
  if (sourceIndex === -1 || targetIndex === -1) return null;

  const nextPoints = [...points];
  const [movedPoint] = nextPoints.splice(sourceIndex, 1);
  const adjustedTargetIndex = nextPoints.findIndex(point => point.id === targetPointId);
  const insertIndex = placement === 'before' ? adjustedTargetIndex : adjustedTargetIndex + 1;
  nextPoints.splice(insertIndex, 0, movedPoint);
  if (points.every((point, index) => point.id === nextPoints[index]?.id)) return null;

  return serializeEffectiveTimelinePoints(project, nextPoints);
};

export const moveTimelineSingletonPointsAsBlock = (
  project: Project,
  selectedSceneIds: Iterable<string>,
  targetPointId: string,
  placement: TimelineItemPlacement
): TimelineData | null => {
  const selectedIds = new Set(selectedSceneIds);
  if (selectedIds.size === 0) return null;
  const points = getEffectiveTimelinePoints(project);
  const selectedPoints = points.filter(point =>
    point.sceneIds.length === 1 && selectedIds.has(point.sceneIds[0])
  );
  if (selectedPoints.length !== selectedIds.size) return null;
  const selectedPointIds = new Set(selectedPoints.map(point => point.id));
  if (selectedPointIds.has(targetPointId)) return null;

  const remainingPoints = points.filter(point => !selectedPointIds.has(point.id));
  const targetIndex = remainingPoints.findIndex(point => point.id === targetPointId);
  if (targetIndex === -1) return null;
  const insertIndex = placement === 'before' ? targetIndex : targetIndex + 1;
  const nextPoints = [
    ...remainingPoints.slice(0, insertIndex),
    ...selectedPoints,
    ...remainingPoints.slice(insertIndex),
  ];
  if (points.every((point, index) => point.id === nextPoints[index]?.id)) return null;

  return serializeEffectiveTimelinePoints(project, nextPoints);
};

export const moveSceneToTimelinePoint = (
  project: Project,
  sourceSceneId: string,
  targetPointId: string
): TimelineData | null => {
  if (!project.scenes.some(scene => scene.id === sourceSceneId)) return null;
  const points = getEffectiveTimelinePoints(project);
  const sourceMatches = points.filter(point => point.sceneIds.includes(sourceSceneId));
  if (sourceMatches.length !== 1 || sourceMatches[0].sceneIds.length !== 1) return null;

  const sourcePoint = sourceMatches[0];
  if (sourcePoint.id === targetPointId) return null;
  const targetPoint = points.find(point => point.id === targetPointId);
  if (!targetPoint || targetPoint.sceneIds.includes(sourceSceneId)) return null;

  const nextPoints = points
    .filter(point => point.id !== sourcePoint.id)
    .map(point => point.id === targetPointId
      ? { ...point, sceneIds: [...point.sceneIds, sourceSceneId] }
      : point
    );
  return serializeEffectiveTimelinePoints(project, nextPoints);
};

export const detachSceneFromTimelinePoint = (
  project: Project,
  sceneId: string,
  placement: TimelineItemPlacement
): TimelineData | null => {
  if (!project.scenes.some(scene => scene.id === sceneId)) return null;
  const points = getEffectiveTimelinePoints(project);
  const sourceMatches = points.filter(point => point.sceneIds.includes(sceneId));
  if (sourceMatches.length !== 1 || sourceMatches[0].sceneIds.length < 2) return null;

  const sourcePoint = sourceMatches[0];
  const remainingSceneIds = sourcePoint.sceneIds.filter(id => id !== sceneId);
  if (remainingSceneIds.length === 0) return null;

  const existingPointIds = new Set(points.map(point => point.id));
  const baseId = `timeline-scene-${sceneId}`;
  let detachedPointId = baseId;
  let suffix = 1;
  while (existingPointIds.has(detachedPointId)) {
    detachedPointId = `${baseId}-${suffix}`;
    suffix += 1;
  }
  const detachedPoint: EffectiveTimelinePoint = { id: detachedPointId, sceneIds: [sceneId] };
  const updatedSourcePoint: EffectiveTimelinePoint = {
    ...sourcePoint,
    sceneIds: remainingSceneIds,
  };

  const nextPoints = points.flatMap(point => {
    if (point.id !== sourcePoint.id) return [point];
    return placement === 'before'
      ? [detachedPoint, updatedSourcePoint]
      : [updatedSourcePoint, detachedPoint];
  });
  return serializeEffectiveTimelinePoints(project, nextPoints);
};

export const moveTimelineScenesAsBlock = (
  project: Project,
  selectedSceneIds: Iterable<string>,
  targetSceneId: string,
  placement: TimelineItemPlacement
): TimelineData | null => {
  const selectedIds = new Set(selectedSceneIds);
  if (selectedIds.size === 0 || selectedIds.has(targetSceneId)) return null;

  const flatSceneIds = flattenTimelineSceneIds(getEffectiveTimelineItems(project));
  const existingSceneIds = new Set(project.scenes.map(scene => scene.id));
  if ([...selectedIds].some(sceneId =>
    !existingSceneIds.has(sceneId)
    || flatSceneIds.filter(id => id === sceneId).length !== 1
  )) return null;
  if (!flatSceneIds.includes(targetSceneId)) return null;

  const orderedSelection = flatSceneIds.filter(sceneId => selectedIds.has(sceneId));
  const remainingSceneIds = flatSceneIds.filter(sceneId => !selectedIds.has(sceneId));
  const targetIndex = remainingSceneIds.indexOf(targetSceneId);
  if (targetIndex === -1) return null;
  const insertIndex = placement === 'before' ? targetIndex : targetIndex + 1;
  const nextSceneIds = [
    ...remainingSceneIds.slice(0, insertIndex),
    ...orderedSelection,
    ...remainingSceneIds.slice(insertIndex),
  ];
  if (flatSceneIds.every((sceneId, index) => sceneId === nextSceneIds[index])) return null;

  return { items: nextSceneIds.map(toDefaultTimelineSceneItem) };
};

export const moveTimelineItem = (
  project: Project,
  itemId: string,
  targetItemId: string,
  placement: TimelineItemPlacement
): TimelineData | null => {
  if (itemId === targetItemId) return null;

  const items = getEffectiveTimelineItems(project);
  const sourceIndex = items.findIndex(item => item.id === itemId);
  const targetIndex = items.findIndex(item => item.id === targetItemId);
  if (sourceIndex === -1 || targetIndex === -1) return null;

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(sourceIndex, 1);
  const adjustedTargetIndex = nextItems.findIndex(item => item.id === targetItemId);
  const insertIndex = placement === 'before'
    ? adjustedTargetIndex
    : adjustedTargetIndex + 1;
  nextItems.splice(insertIndex, 0, movedItem);

  const orderUnchanged = items.every((item, index) => item.id === nextItems[index]?.id);
  return orderUnchanged ? null : { items: nextItems };
};

export const ungroupTimelineGroup = (
  project: Project,
  groupId: string
): TimelineData | null => {
  const items = getEffectiveTimelineItems(project);
  const groupIndex = items.findIndex(item => item.id === groupId && item.type === 'group');
  if (groupIndex === -1) return null;

  const group = items[groupIndex];
  if (group.type !== 'group') return null;

  const existingSceneIds = new Set(project.scenes.map(scene => scene.id));
  const replacementItems = group.sceneIds
    .filter(sceneId => existingSceneIds.has(sceneId))
    .map(toDefaultTimelineSceneItem);

  return {
    items: [
      ...items.slice(0, groupIndex),
      ...replacementItems,
      ...items.slice(groupIndex + 1),
    ],
  };
};

export const renameTimelineGroup = (
  project: Project,
  groupId: string,
  title: string
): TimelineData | null => {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return null;

  const items = getEffectiveTimelineItems(project);
  const groupIndex = items.findIndex(item => item.id === groupId && item.type === 'group');
  if (groupIndex === -1) return null;

  const group = items[groupIndex];
  if (group.type !== 'group' || group.title === trimmedTitle) return null;

  const nextItems = [...items];
  nextItems[groupIndex] = { ...group, title: trimmedTitle };
  return { items: nextItems };
};

export interface TimelineGroupTarget {
  groupId: string;
  title: string;
  placement: 'prepend' | 'append';
}

export const flattenTimelineSceneIds = (items: readonly TimelineItem[]): string[] =>
  items.flatMap(item => item.type === 'scene' ? [item.sceneId] : item.sceneIds);

const getSelectedTopLevelSceneRange = (
  project: Project,
  selectedSceneIds: Iterable<string>
): { items: TimelineItem[]; orderedSceneIds: string[]; startIndex: number; endIndex: number } | null => {
  const selectedInput = [...selectedSceneIds];
  const selectedIds = new Set(selectedInput);
  if (selectedInput.length === 0 || selectedIds.size !== selectedInput.length) return null;

  const items = getEffectiveTimelineItems(project);
  const flattenedIds = flattenTimelineSceneIds(items);
  if ([...selectedIds].some(sceneId => flattenedIds.filter(id => id === sceneId).length !== 1)) {
    return null;
  }
  const selectedEntries = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.type === 'scene' && selectedIds.has(item.sceneId));
  if (selectedEntries.length !== selectedIds.size) return null;

  const startIndex = selectedEntries[0].index;
  const areConsecutive = selectedEntries.every(({ index }, offset) => index === startIndex + offset);
  if (!areConsecutive) return null;

  return {
    items,
    orderedSceneIds: selectedEntries.map(({ item }) => item.type === 'scene' ? item.sceneId : ''),
    startIndex,
    endIndex: selectedEntries.at(-1)!.index,
  };
};

export const getEligibleTimelineGroupTargets = (
  project: Project,
  selectedSceneIds: Iterable<string>
): TimelineGroupTarget[] => {
  const range = getSelectedTopLevelSceneRange(project, selectedSceneIds);
  if (!range) return [];

  const targets: TimelineGroupTarget[] = [];
  const groupBefore = range.items[range.startIndex - 1];
  const groupAfter = range.items[range.endIndex + 1];

  if (groupBefore?.type === 'group') {
    const combinedIds = [...groupBefore.sceneIds, ...range.orderedSceneIds];
    if (new Set(combinedIds).size === combinedIds.length) {
      targets.push({ groupId: groupBefore.id, title: groupBefore.title, placement: 'append' });
    }
  }
  if (groupAfter?.type === 'group') {
    const combinedIds = [...range.orderedSceneIds, ...groupAfter.sceneIds];
    if (new Set(combinedIds).size === combinedIds.length) {
      targets.push({ groupId: groupAfter.id, title: groupAfter.title, placement: 'prepend' });
    }
  }

  return targets;
};

export const addScenesToTimelineGroup = (
  project: Project,
  groupId: string,
  selectedSceneIds: Iterable<string>
): TimelineData | null => {
  const range = getSelectedTopLevelSceneRange(project, selectedSceneIds);
  if (!range) return null;

  const target = getEligibleTimelineGroupTargets(project, range.orderedSceneIds)
    .find(item => item.groupId === groupId);
  if (!target) return null;

  const selectedIds = new Set(range.orderedSceneIds);
  return {
    items: range.items
      .filter(item => item.type !== 'scene' || !selectedIds.has(item.sceneId))
      .map(item => {
        if (item.id !== groupId || item.type !== 'group') return item;
        return {
          ...item,
          sceneIds: target.placement === 'prepend'
            ? [...range.orderedSceneIds, ...item.sceneIds]
            : [...item.sceneIds, ...range.orderedSceneIds],
        };
      }),
  };
};

export interface TimelineGroupRemovalValidation {
  isValid: boolean;
  reason?: 'no-scenes' | 'not-one-group' | 'not-consecutive' | 'not-at-edge' | 'minimum-remaining';
  groupId?: string;
  groupTitle?: string;
  placement?: 'start' | 'end';
  orderedSceneIds: string[];
}

export const validateTimelineGroupSceneRemoval = (
  project: Project,
  selectedSceneIds: Iterable<string>
): TimelineGroupRemovalValidation => {
  const selectedInput = [...selectedSceneIds];
  const selectedIds = new Set(selectedInput);
  if (selectedInput.length === 0 || selectedIds.size !== selectedInput.length) {
    return { isValid: false, reason: 'no-scenes', orderedSceneIds: [] };
  }

  const items = getEffectiveTimelineItems(project);
  const groups = items.filter((item): item is Extract<TimelineItem, { type: 'group' }> => item.type === 'group');
  const groupMemberships = [...selectedIds].map(sceneId =>
    groups.filter(group => group.sceneIds.includes(sceneId))
  );
  if (groupMemberships.some(memberships => memberships.length !== 1)) {
    return { isValid: false, reason: 'not-one-group', orderedSceneIds: [] };
  }

  const group = groupMemberships[0][0];
  if (!groupMemberships.every(memberships => memberships[0].id === group.id)) {
    return { isValid: false, reason: 'not-one-group', orderedSceneIds: [] };
  }

  const existingSceneIds = new Set(project.scenes.map(scene => scene.id));
  const validGroupSceneIds = group.sceneIds.filter(sceneId => existingSceneIds.has(sceneId));
  const orderedSceneIds = validGroupSceneIds.filter(sceneId => selectedIds.has(sceneId));
  if (orderedSceneIds.length !== selectedIds.size) {
    return { isValid: false, reason: 'not-one-group', orderedSceneIds: [] };
  }

  const selectedIndexes = orderedSceneIds.map(sceneId => validGroupSceneIds.indexOf(sceneId));
  const areConsecutive = selectedIndexes.every((index, offset) => index === selectedIndexes[0] + offset);
  if (!areConsecutive) {
    return { isValid: false, reason: 'not-consecutive', orderedSceneIds: [] };
  }

  const isAtStart = selectedIndexes[0] === 0;
  const isAtEnd = selectedIndexes.at(-1) === validGroupSceneIds.length - 1;
  if (!isAtStart && !isAtEnd) {
    return { isValid: false, reason: 'not-at-edge', orderedSceneIds: [] };
  }

  if (validGroupSceneIds.length - orderedSceneIds.length < 2) {
    return { isValid: false, reason: 'minimum-remaining', orderedSceneIds: [] };
  }

  return {
    isValid: true,
    groupId: group.id,
    groupTitle: group.title,
    placement: isAtStart ? 'start' : 'end',
    orderedSceneIds,
  };
};

export const removeScenesFromTimelineGroup = (
  project: Project,
  groupId: string,
  selectedSceneIds: Iterable<string>
): TimelineData | null => {
  const validation = validateTimelineGroupSceneRemoval(project, selectedSceneIds);
  if (!validation.isValid || validation.groupId !== groupId || !validation.placement) return null;

  const items = getEffectiveTimelineItems(project);
  const groupIndex = items.findIndex(item => item.id === groupId && item.type === 'group');
  if (groupIndex === -1) return null;
  const group = items[groupIndex];
  if (group.type !== 'group') return null;

  const selectedIds = new Set(validation.orderedSceneIds);
  const updatedGroup = {
    ...group,
    sceneIds: group.sceneIds.filter(sceneId => !selectedIds.has(sceneId)),
  };
  const extractedItems = validation.orderedSceneIds.map(toDefaultTimelineSceneItem);
  const replacementItems = validation.placement === 'start'
    ? [...extractedItems, updatedGroup]
    : [updatedGroup, ...extractedItems];

  return {
    items: [
      ...items.slice(0, groupIndex),
      ...replacementItems,
      ...items.slice(groupIndex + 1),
    ],
  };
};
