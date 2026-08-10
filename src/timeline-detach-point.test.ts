import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Book, Project, Scene, TimelineItem } from '../types';
import { createBoardSnapshot, hasBoardSnapshotChanges } from './board-history';
import { detachSceneFromTimelinePoint, moveTimelinePoint } from './timeline-sequence';

const scene = (id: string, position: number): Scene => ({
  id,
  plotlineId: id === 'c' ? 'p2' : 'p1',
  title: id,
  content: '',
  position,
  timeLabel: `time-${id}`,
});

const project = (items: TimelineItem[]): Project => ({
  plotlines: [
    { id: 'p1', name: 'One', color: '#111111' },
    { id: 'p2', name: 'Two', color: '#222222' },
  ],
  scenes: ['a', 'b', 'c', 'd', 'e'].map((id, index) => scene(id, index)),
  bookSequence: ['a', 'b', 'c', 'd', 'e'].map(id => ({
    id: `scene:${id}`,
    type: 'scene' as const,
    sceneId: id,
  })),
  timeline: { items },
});

const twoScenePoint: TimelineItem[] = [
  { id: 'a-point', type: 'scene', sceneId: 'a' },
  { id: 'bc-point', type: 'point', sceneIds: ['b', 'c'] },
  { id: 'd-point', type: 'scene', sceneId: 'd' },
];

describe('detach scene from timeline point', () => {
  it('detaches from a two-scene point immediately before it', () => {
    const next = detachSceneFromTimelinePoint(project(twoScenePoint), 'c', 'before');

    expect(next?.items).toEqual([
      { id: 'a-point', type: 'scene', sceneId: 'a' },
      { id: 'timeline-scene-c', type: 'scene', sceneId: 'c' },
      { id: 'bc-point', type: 'point', sceneIds: ['b'] },
      { id: 'd-point', type: 'scene', sceneId: 'd' },
    ]);
  });

  it('detaches from a two-scene point immediately after it', () => {
    const next = detachSceneFromTimelinePoint(project(twoScenePoint), 'c', 'after');

    expect(next?.items).toEqual([
      { id: 'a-point', type: 'scene', sceneId: 'a' },
      { id: 'bc-point', type: 'point', sceneIds: ['b'] },
      { id: 'timeline-scene-c', type: 'scene', sceneId: 'c' },
      { id: 'd-point', type: 'scene', sceneId: 'd' },
    ]);
  });

  it('preserves the source point location and remaining order for larger points', () => {
    const source = project([
      { id: 'a-point', type: 'scene', sceneId: 'a' },
      { id: 'bcde-point', type: 'point', sceneIds: ['b', 'c', 'd', 'e'] },
    ]);
    const next = detachSceneFromTimelinePoint(source, 'c', 'after');

    expect(next?.items[1]).toEqual({
      id: 'bcde-point', type: 'point', sceneIds: ['b', 'd', 'e'],
    });
    expect(next?.items[2]).toEqual({
      id: 'timeline-scene-c', type: 'scene', sceneId: 'c',
    });
  });

  it('never leaves an empty point or duplicates the detached scene', () => {
    const next = detachSceneFromTimelinePoint(project(twoScenePoint), 'c', 'after');
    const allSceneIds = next?.items.flatMap(item => item.type === 'scene' ? [item.sceneId] : item.sceneIds);

    expect(next?.items.every(item => item.type === 'scene' || item.sceneIds.length > 0)).toBe(true);
    expect(allSceneIds?.filter(id => id === 'c')).toHaveLength(1);
  });

  it('uses a deterministic non-colliding singleton id', () => {
    const source = project([
      { id: 'timeline-scene-c', type: 'scene', sceneId: 'a' },
      { id: 'bc-point', type: 'point', sceneIds: ['b', 'c'] },
    ]);
    const first = detachSceneFromTimelinePoint(source, 'c', 'before');
    const second = detachSceneFromTimelinePoint(source, 'c', 'before');

    expect(first?.items[1].id).toBe('timeline-scene-c-1');
    expect(second).toEqual(first);
  });

  it('rejects singleton sources and leaves the project untouched', () => {
    const source = project([{ id: 'a-point', type: 'scene', sceneId: 'a' }]);
    const before = structuredClone(source);

    expect(detachSceneFromTimelinePoint(source, 'a', 'before')).toBeNull();
    expect(source).toEqual(before);
  });

  it('does not mutate scene metadata, positions, or book order', () => {
    const source = project(twoScenePoint);
    const before = structuredClone(source);

    detachSceneFromTimelinePoint(source, 'c', 'after');

    expect(source).toEqual(before);
    expect(source.bookSequence).toEqual(before.bookSequence);
    expect(source.scenes.map(item => item.position)).toEqual(before.scenes.map(item => item.position));
    expect(source.scenes.map(item => item.timeLabel)).toEqual(before.scenes.map(item => item.timeLabel));
    expect(source.scenes.map(item => item.plotlineId)).toEqual(before.scenes.map(item => item.plotlineId));
  });

  it('creates a singleton that participates in point-aware reorder', () => {
    const source = project(twoScenePoint);
    const detached = detachSceneFromTimelinePoint(source, 'c', 'after');
    const reordered = moveTimelinePoint(
      { ...source, timeline: detached! },
      'timeline-scene-c',
      'a-point',
      'before'
    );

    expect(reordered?.items[0]).toEqual({
      id: 'timeline-scene-c', type: 'scene', sceneId: 'c',
    });
  });

  it('is detected by existing board history', () => {
    const source = project(twoScenePoint);
    const detached = detachSceneFromTimelinePoint(source, 'c', 'after');
    const book = {
      ...source,
      id: 'book', title: 'Book', ownerId: 'owner', createdAt: 1, updatedAt: 1,
      syncStatus: 'local_only' as const, pendingSync: false,
    } satisfies Book;

    expect(hasBoardSnapshotChanges(
      createBoardSnapshot(book),
      createBoardSnapshot({ ...book, timeline: detached! })
    )).toBe(true);
  });

  it('wires an explicit dialog whose cancel path does not save', () => {
    const source = readFileSync('components/board/TimelineBoardView.tsx', 'utf8');

    expect(source).toContain('הפרד מנקודת הזמן');
    expect(source).toContain("confirmDetachScene('before')");
    expect(source).toContain("confirmDetachScene('after')");
    expect(source).toContain('onClick={() => setPendingDetachSceneId(null)}');
    expect(source).toContain('onTimelineChange(timeline);');
  });
});
