import { describe, expect, it, vi } from 'vitest';
import type { Book, Project, Scene, TimelineData, TimelineItem } from '../types';
import { createBoardSnapshot, hasBoardSnapshotChanges } from './board-history';
import {
  moveTimelinePoint,
  moveTimelineSingletonPointsAsBlock,
} from './timeline-sequence';
import { commitTimelinePointPointerReorder } from './timeline-pointer-reorder';

const scene = (id: string, position: number): Scene => ({
  id,
  plotlineId: 'p1',
  title: id,
  content: '',
  position,
  timeLabel: `time-${id}`,
});

const project = (items: TimelineItem[]): Project => ({
  plotlines: [{ id: 'p1', name: 'Plotline', color: '#123456' }],
  scenes: ['a', 'b', 'c', 'd', 'e', 'f'].map((id, index) => scene(id, index)),
  bookSequence: ['a', 'b', 'c', 'd', 'e', 'f'].map(id => ({
    id: `scene:${id}`,
    type: 'scene' as const,
    sceneId: id,
  })),
  timeline: { items },
});

const points: TimelineItem[] = [
  { id: 'a-point', type: 'scene', sceneId: 'a' },
  { id: 'bc-point', type: 'point', sceneIds: ['b', 'c'] },
  { id: 'd-point', type: 'point', sceneIds: ['d'] },
  { id: 'ef-point', type: 'point', sceneIds: ['e', 'f'] },
];

const ids = (timeline: TimelineData | null) => timeline?.items.map(item => item.id);

describe('timeline point reorder', () => {
  it('moves a singleton point forward and backward', () => {
    const source = project(points);
    expect(ids(moveTimelinePoint(source, 'a-point', 'd-point', 'after'))).toEqual([
      'bc-point', 'd-point', 'a-point', 'ef-point',
    ]);
    expect(ids(moveTimelinePoint(source, 'd-point', 'a-point', 'before'))).toEqual([
      'd-point', 'a-point', 'bc-point', 'ef-point',
    ]);
  });

  it('moves a multi-scene point forward and backward as one unit', () => {
    const source = project(points);
    const forward = moveTimelinePoint(source, 'bc-point', 'ef-point', 'after');
    const backward = moveTimelinePoint(source, 'ef-point', 'a-point', 'before');

    expect(ids(forward)).toEqual(['a-point', 'd-point', 'ef-point', 'bc-point']);
    expect(ids(backward)).toEqual(['ef-point', 'a-point', 'bc-point', 'd-point']);
    expect(forward?.items.at(-1)).toEqual({
      id: 'bc-point', type: 'point', sceneIds: ['b', 'c'],
    });
    expect(backward?.items[0]).toEqual({
      id: 'ef-point', type: 'point', sceneIds: ['e', 'f'],
    });
  });

  it('drops before and after an entire multi-scene point', () => {
    const source = project(points);
    expect(ids(moveTimelinePoint(source, 'ef-point', 'bc-point', 'before'))).toEqual([
      'a-point', 'ef-point', 'bc-point', 'd-point',
    ]);
    expect(ids(moveTimelinePoint(source, 'a-point', 'bc-point', 'after'))).toEqual([
      'bc-point', 'a-point', 'd-point', 'ef-point',
    ]);
  });

  it('preserves every other point structure and singleton point convention', () => {
    const next = moveTimelinePoint(project(points), 'a-point', 'ef-point', 'after');

    expect(next?.items).toContainEqual({ id: 'bc-point', type: 'point', sceneIds: ['b', 'c'] });
    expect(next?.items).toContainEqual({ id: 'd-point', type: 'point', sceneIds: ['d'] });
    expect(next?.items).toContainEqual({ id: 'ef-point', type: 'point', sceneIds: ['e', 'f'] });
  });

  it('materializes legacy groups into ordered singleton items only after a real reorder', () => {
    const source = project([
      { id: 'a-point', type: 'scene', sceneId: 'a' },
      { id: 'legacy', type: 'group', title: 'Legacy', sceneIds: ['b', 'c'] },
      { id: 'd-point', type: 'scene', sceneId: 'd' },
    ]);
    const before = structuredClone(source);
    const next = moveTimelinePoint(source, 'd-point', 'legacy-scene-0-b', 'before');

    expect(next?.items).toEqual([
      { id: 'a-point', type: 'scene', sceneId: 'a' },
      { id: 'd-point', type: 'scene', sceneId: 'd' },
      { id: 'legacy-scene-0-b', type: 'scene', sceneId: 'b' },
      { id: 'legacy-scene-1-c', type: 'scene', sceneId: 'c' },
    ]);
    expect(source).toEqual(before);
  });

  it('moves selected singleton points without flattening an unrelated multi point', () => {
    const source = project(points);
    const next = moveTimelineSingletonPointsAsBlock(source, ['a', 'd'], 'ef-point', 'after');

    expect(ids(next)).toEqual(['bc-point', 'ef-point', 'a-point', 'd-point']);
    expect(next?.items[0]).toEqual({ id: 'bc-point', type: 'point', sceneIds: ['b', 'c'] });
    expect(next?.items[1]).toEqual({ id: 'ef-point', type: 'point', sceneIds: ['e', 'f'] });
  });

  it('rejects multi-selection containing a scene from a multi-scene point', () => {
    const source = project(points);
    const before = structuredClone(source);

    expect(moveTimelineSingletonPointsAsBlock(source, ['a', 'b'], 'd-point', 'after')).toBeNull();
    expect(source).toEqual(before);
  });

  it('does not mutate time labels, book order, positions, or source timeline', () => {
    const source = project(points);
    const before = structuredClone(source);

    moveTimelinePoint(source, 'bc-point', 'ef-point', 'after');

    expect(source).toEqual(before);
    expect(source.scenes.map(item => item.timeLabel)).toEqual(before.scenes.map(item => item.timeLabel));
    expect(source.bookSequence).toEqual(before.bookSequence);
  });

  it('does not emit a change for an invalid pointer drop', () => {
    const onTimelineChange = vi.fn();
    expect(commitTimelinePointPointerReorder(
      project(points), 'bc-point', 'missing', 'after', onTimelineChange
    )).toBe(false);
    expect(onTimelineChange).not.toHaveBeenCalled();
  });

  it('emits one point-preserving change for a valid pointer drop', () => {
    const onTimelineChange = vi.fn();
    expect(commitTimelinePointPointerReorder(
      project(points), 'bc-point', 'ef-point', 'after', onTimelineChange
    )).toBe(true);
    expect(onTimelineChange).toHaveBeenCalledTimes(1);
    expect(onTimelineChange.mock.calls[0][0].items.at(-1)).toEqual({
      id: 'bc-point', type: 'point', sceneIds: ['b', 'c'],
    });
  });

  it('is detected by board history as a chronology change', () => {
    const source = project(points);
    const next = moveTimelinePoint(source, 'bc-point', 'ef-point', 'after');
    const book = {
      ...source,
      id: 'book', title: 'Book', ownerId: 'owner', createdAt: 1, updatedAt: 1,
      syncStatus: 'local_only' as const, pendingSync: false,
    } satisfies Book;

    expect(hasBoardSnapshotChanges(
      createBoardSnapshot(book),
      createBoardSnapshot({ ...book, timeline: next! })
    )).toBe(true);
  });
});
