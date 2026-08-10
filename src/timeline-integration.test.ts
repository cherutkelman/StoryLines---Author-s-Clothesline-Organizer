import { describe, expect, it } from 'vitest';
import type { Book, Project, Scene, TimelineData, TimelineItem } from '../types';
import { createBoardSnapshot, hasBoardSnapshotChanges } from './board-history';
import { toggleTimelineCollapsedGroupId } from './timeline-collapse';
import {
  addScenesToTimelineGroup,
  createTimelineGroup,
  flattenTimelineSceneIds,
  getUnplacedTimelineScenes,
  moveTimelineItem,
  placeSceneInTimeline,
  removeScenesFromTimelineGroup,
  renameTimelineGroup,
  ungroupTimelineGroup,
} from './timeline-sequence';

const scene = (id: string, position: number): Scene => ({
  id,
  plotlineId: 'p1',
  title: id,
  content: '',
  position,
});

const baseProject = (): Project => ({
  plotlines: [{ id: 'p1', name: 'Plotline', color: '#123456' }],
  scenes: ['s1', 's2', 's3', 's4'].map(scene),
  chapterMarkers: [{ id: 'chapter-1', title: 'Chapter 1', position: 0 }],
  bookSequence: [
    { id: 'chapter:chapter-1', type: 'chapter-divider', chapterId: 'chapter-1' },
    ...['s1', 's2', 's3', 's4'].map(sceneId => ({
      id: `scene:${sceneId}`,
      type: 'scene' as const,
      sceneId,
    })),
  ],
});

const withTimeline = (project: Project, timeline: TimelineData): Project => ({ ...project, timeline });

const assertValidExplicitTimeline = (project: Project) => {
  expect(project.timeline).toBeDefined();
  const existingSceneIds = new Set(project.scenes.map(item => item.id));
  const occurrences = new Map<string, number>();
  project.timeline!.items.forEach(item => {
    if (item.type === 'scene') {
      if (existingSceneIds.has(item.sceneId)) {
        occurrences.set(item.sceneId, (occurrences.get(item.sceneId) || 0) + 1);
      }
      return;
    }

    const validIds = item.sceneIds.filter(id => existingSceneIds.has(id));
    expect(validIds.length).toBeGreaterThanOrEqual(2);
    expect(new Set(item.sceneIds).size).toBe(item.sceneIds.length);
    validIds.forEach(id => occurrences.set(id, (occurrences.get(id) || 0) + 1));
  });
  expect([...occurrences.values()].every(count => count === 1)).toBe(true);
};

const bookFromProject = (project: Project): Book => ({
  ...project,
  id: 'book-1',
  ownerId: 'user-1',
  title: 'Book',
  createdAt: 1,
  updatedAt: 1,
  syncStatus: 'local_only',
  pendingSync: false,
});

describe('timeline integration and regression', () => {
  it('scenario A: materializes a custom timeline, groups scenes, and reorders without changing book order', () => {
    const original = baseProject();
    const bookSequenceBefore = structuredClone(original.bookSequence);
    const positionsBefore = original.scenes.map(item => item.position);
    const grouped = createTimelineGroup(original, ['s2', 's3'], 'Middle', 'group-middle');
    expect(grouped).not.toBeNull();
    let current = withTimeline(original, grouped!);
    expect(current.timeline).toBeDefined();

    const moved = moveTimelineItem(current, 'group-middle', 'timeline-scene-s4', 'after');
    expect(moved).not.toBeNull();
    current = withTimeline(current, moved!);

    expect(current.bookSequence).toEqual(bookSequenceBefore);
    expect(current.scenes.map(item => item.position)).toEqual(positionsBefore);
    expect(current.chapterMarkers).toEqual(original.chapterMarkers);
    assertValidExplicitTimeline(current);
  });

  it('scenario B: supports a full group lifecycle while preserving flat chronology', () => {
    const original = baseProject();
    const originalFlatOrder = ['s1', 's2', 's3', 's4'];
    let current = withTimeline(original, createTimelineGroup(original, ['s2', 's3'], 'Middle', 'group')!);
    expect(flattenTimelineSceneIds(current.timeline!.items)).toEqual(originalFlatOrder);

    current = withTimeline(current, renameTimelineGroup(current, 'group', 'Renamed')!);
    expect(flattenTimelineSceneIds(current.timeline!.items)).toEqual(originalFlatOrder);
    current = withTimeline(current, addScenesToTimelineGroup(current, 'group', ['s1'])!);
    expect(flattenTimelineSceneIds(current.timeline!.items)).toEqual(originalFlatOrder);
    current = withTimeline(current, removeScenesFromTimelineGroup(current, 'group', ['s1'])!);
    expect(flattenTimelineSceneIds(current.timeline!.items)).toEqual(originalFlatOrder);
    current = withTimeline(current, ungroupTimelineGroup(current, 'group')!);

    expect(flattenTimelineSceneIds(current.timeline!.items)).toEqual(originalFlatOrder);
    expect(new Set(flattenTimelineSceneIds(current.timeline!.items)).size).toBe(4);
    assertValidExplicitTimeline(current);
  });

  it('scenario C: detects and explicitly places a newly added scene without moving it in bookSequence', () => {
    const explicit = createTimelineGroup(baseProject(), ['s2', 's3'], 'Middle', 'group')!;
    const newScene = scene('s5', 4);
    const current: Project = {
      ...baseProject(),
      timeline: explicit,
      scenes: [...baseProject().scenes, newScene],
      bookSequence: [
        ...baseProject().bookSequence!,
        { id: 'scene:s5', type: 'scene', sceneId: 's5' },
      ],
    };
    const bookSequenceBefore = structuredClone(current.bookSequence);

    expect(getUnplacedTimelineScenes(current).map(item => item.id)).toEqual(['s5']);
    const placed = placeSceneInTimeline(current, 's5', 1);
    expect(placed).not.toBeNull();
    const after = withTimeline(current, placed!);

    expect(getUnplacedTimelineScenes(after)).toEqual([]);
    expect(flattenTimelineSceneIds(after.timeline!.items).filter(id => id === 's5')).toHaveLength(1);
    expect(after.bookSequence).toEqual(bookSequenceBefore);
    assertValidExplicitTimeline(after);
  });

  it('scenario D: keeps collapse in UI state while data changes participate in board history', () => {
    const grouped = createTimelineGroup(baseProject(), ['s2', 's3'], 'Middle', 'group')!;
    let current = withTimeline(baseProject(), grouped);
    const collapsedGroupIds = toggleTimelineCollapsedGroupId([], 'group');
    const snapshotBeforeDataChanges = createBoardSnapshot(bookFromProject(current));
    const snapshotAfterCollapseOnly = createBoardSnapshot(bookFromProject(current));
    expect(hasBoardSnapshotChanges(snapshotBeforeDataChanges, snapshotAfterCollapseOnly)).toBe(false);

    current = withTimeline(current, renameTimelineGroup(current, 'group', 'Renamed')!);
    current = withTimeline(current, moveTimelineItem(current, 'group', 'timeline-scene-s4', 'after')!);
    current = withTimeline(current, addScenesToTimelineGroup(current, 'group', ['s4'])!);

    expect(collapsedGroupIds).toEqual(['group']);
    expect(hasBoardSnapshotChanges(snapshotBeforeDataChanges, createBoardSnapshot(bookFromProject(current)))).toBe(true);
    assertValidExplicitTimeline(current);
  });

  it('scenario E: preserves timeLabel through grouping, reorder, and edge extraction', () => {
    const original = baseProject();
    original.scenes = original.scenes.map(item => item.id === 's2'
      ? { ...item, timeLabel: 'Three years earlier' }
      : item);
    const flatBefore = ['s1', 's2', 's3', 's4'];
    let current = withTimeline(original, createTimelineGroup(original, ['s2', 's3', 's4'], 'Period', 'group')!);
    current = withTimeline(current, moveTimelineItem(current, 'group', 'timeline-scene-s1', 'before')!);
    const afterExplicitReorder = flattenTimelineSceneIds(current.timeline!.items);
    current = withTimeline(current, removeScenesFromTimelineGroup(current, 'group', ['s2'])!);

    expect(current.scenes.find(item => item.id === 's2')?.timeLabel).toBe('Three years earlier');
    expect(flattenTimelineSceneIds(current.timeline!.items)).toEqual(afterExplicitReorder);
    expect(flatBefore).not.toEqual(afterExplicitReorder);
    expect(current.bookSequence).toEqual(original.bookSequence);
    assertValidExplicitTimeline(current);
  });

  it('rejects operations that would add duplicates from malformed timeline data', () => {
    const duplicateIndependent: TimelineItem[] = [
      { id: 'one', type: 'scene', sceneId: 's1' },
      { id: 'two', type: 'scene', sceneId: 's1' },
      { id: 'group', type: 'group', title: 'Group', sceneIds: ['s2', 's3'] },
    ];
    const independentAndGroup: TimelineItem[] = [
      { id: 'one', type: 'scene', sceneId: 's1' },
      { id: 'group', type: 'group', title: 'Group', sceneIds: ['s1', 's2'] },
    ];
    const twoGroups: TimelineItem[] = [
      { id: 'group-a', type: 'group', title: 'A', sceneIds: ['s1', 's2'] },
      { id: 'group-b', type: 'group', title: 'B', sceneIds: ['s1', 's3'] },
    ];

    expect(addScenesToTimelineGroup(withTimeline(baseProject(), { items: duplicateIndependent }), 'group', ['s1'])).toBeNull();
    expect(placeSceneInTimeline(withTimeline(baseProject(), { items: independentAndGroup }), 's1', 0)).toBeNull();
    expect(removeScenesFromTimelineGroup(withTimeline(baseProject(), { items: twoGroups }), 'group-a', ['s1'])).toBeNull();
  });

  it('tolerates deleted-scene references without crashing or confusing unplaced scenes', () => {
    const current = withTimeline(baseProject(), {
      items: [
        { id: 'deleted-item', type: 'scene', sceneId: 'deleted' },
        { id: 'thin-group', type: 'group', title: 'Thin', sceneIds: ['missing', 's1'] },
        { id: 's2', type: 'scene', sceneId: 's2' },
      ],
    });

    expect(() => getUnplacedTimelineScenes(current)).not.toThrow();
    expect(getUnplacedTimelineScenes(current).map(item => item.id)).toEqual(['s3', 's4']);
    expect(placeSceneInTimeline(current, 's3', 2)).not.toBeNull();
    const repaired = addScenesToTimelineGroup(current, 'thin-group', ['s2']);
    expect(repaired).not.toBeNull();
    expect(flattenTimelineSceneIds(repaired!.items).filter(sceneId => sceneId === 's2')).toHaveLength(1);
    expect(
      repaired!.items.find(item => item.id === 'thin-group' && item.type === 'group'),
    ).toMatchObject({ sceneIds: ['missing', 's1', 's2'] });
  });
});
