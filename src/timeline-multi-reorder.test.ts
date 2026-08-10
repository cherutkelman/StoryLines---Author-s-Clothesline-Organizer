import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Project, TimelineItem } from '../types';
import { createBoardSnapshot, hasBoardSnapshotChanges } from './board-history';
import { commitTimelineSceneBlockPointerReorder } from './timeline-pointer-reorder';
import { getFlatEffectiveTimelineSceneItems, moveTimelineScenesAsBlock } from './timeline-sequence';

const project = (items?: TimelineItem[]): Project => ({
  plotlines: [{ id: 'p1', name: 'Plotline', color: '#123456' }],
  scenes: ['a', 'b', 'c', 'd', 'e', 'f'].map((id, position) => ({
    id, plotlineId: 'p1', title: id, content: '', position,
    ...(id === 'd' ? { timeLabel: 'That evening' } : {}),
  })),
  bookSequence: ['a', 'b', 'c', 'd', 'e', 'f'].map(sceneId => ({
    id: `scene:${sceneId}`, type: 'scene' as const, sceneId,
  })),
  timeline: items ? { items } : undefined,
});

const independentItems: TimelineItem[] = ['a', 'b', 'c', 'd', 'e', 'f'].map(sceneId => ({
  id: `custom-${sceneId}`, type: 'scene', sceneId,
}));
const sceneIds = (result: ReturnType<typeof moveTimelineScenesAsBlock>) =>
  result?.items.map(item => item.type === 'scene' ? item.sceneId : 'group');

describe('timeline flat multi-reorder', () => {
  it('derives a flat view from legacy groups without mutating the Project', () => {
    const source = project([
      independentItems[0],
      { id: 'legacy', type: 'group', title: 'Childhood', sceneIds: ['b', 'c', 'd'] },
      independentItems[4], independentItems[5],
    ]);
    const before = structuredClone(source);

    expect(getFlatEffectiveTimelineSceneItems(source).map(item => item.sceneId)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(source).toEqual(before);
  });

  it('moves two selected scenes together', () => {
    expect(sceneIds(moveTimelineScenesAsBlock(project(independentItems), ['c', 'd'], 'a', 'before')))
      .toEqual(['c', 'd', 'a', 'b', 'e', 'f']);
  });

  it('moves several consecutive scenes as one temporary block', () => {
    expect(sceneIds(moveTimelineScenesAsBlock(project(independentItems), ['c', 'd', 'e'], 'f', 'after')))
      .toEqual(['a', 'b', 'f', 'c', 'd', 'e']);
  });

  it('moves non-consecutive scenes in chronology order rather than selection order', () => {
    expect(sceneIds(moveTimelineScenesAsBlock(project(independentItems), ['f', 'b', 'd'], 'a', 'before')))
      .toEqual(['b', 'd', 'f', 'a', 'c', 'e']);
  });

  it('flattens legacy groups into independent TimelineSceneItems on a real reorder', () => {
    const source = project([
      independentItems[0],
      { id: 'legacy', type: 'group', title: 'Childhood', sceneIds: ['b', 'c', 'd'] },
      independentItems[4], independentItems[5],
    ]);
    const result = moveTimelineScenesAsBlock(source, ['b', 'd'], 'f', 'after');

    expect(result?.items.every(item => item.type === 'scene')).toBe(true);
    expect(result?.items.map(item => item.id)).toEqual([
      'timeline-scene-a', 'timeline-scene-c', 'timeline-scene-e',
      'timeline-scene-f', 'timeline-scene-b', 'timeline-scene-d',
    ]);
  });

  it('preserves timeLabel, bookSequence, positions, and source data', () => {
    const source = project(independentItems);
    const before = structuredClone(source);
    moveTimelineScenesAsBlock(source, ['b', 'd'], 'f', 'after');

    expect(source).toEqual(before);
    expect(source.scenes.find(scene => scene.id === 'd')?.timeLabel).toBe('That evening');
  });

  it('commits through the Pointer Events callback and is detected by board history', () => {
    const source = project(independentItems);
    const onTimelineChange = vi.fn();
    const changed = commitTimelineSceneBlockPointerReorder(source, ['b', 'd'], 'f', 'after', onTimelineChange);
    const nextTimeline = onTimelineChange.mock.calls[0][0];
    const book = { ...source, id: 'book', ownerId: 'owner', title: 'Book', createdAt: 1, updatedAt: 1, syncStatus: 'local_only' as const, pendingSync: false };

    expect(changed).toBe(true);
    expect(hasBoardSnapshotChanges(
      createBoardSnapshot(book),
      createBoardSnapshot({ ...book, timeline: nextTimeline })
    )).toBe(true);
  });

  it('rejects missing, unplaced, duplicated, or selected target scenes safely', () => {
    const source = project(independentItems.slice(0, 5));
    expect(moveTimelineScenesAsBlock(source, ['missing'], 'a', 'before')).toBeNull();
    expect(moveTimelineScenesAsBlock(source, ['f'], 'a', 'before')).toBeNull();
    expect(moveTimelineScenesAsBlock(source, ['b', 'd'], 'd', 'before')).toBeNull();
  });

  it('keeps group actions out of the active selection UI and exits selection after a successful multi-drop', () => {
    const source = readFileSync('components/board/TimelineBoardView.tsx', 'utf8');
    const activeToolbar = source.match(/data-timeline-selection-toolbar[\s\S]*?\{placingSceneId/)?.[0] || '';

    expect(activeToolbar).toContain('{false && <>');
    expect(source).toContain("if (changed && gesture.pointIds.length > 1)");
    expect(source).toContain("dispatchSelection({ type: 'exit' })");
    expect(source).toContain("window.addEventListener('pointermove'");
    expect(source).not.toContain('draggable={true}');
  });
});
