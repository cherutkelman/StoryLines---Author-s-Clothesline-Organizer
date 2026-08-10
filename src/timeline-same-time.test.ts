import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Book, Project, Scene, TimelineItem } from '../types';
import { createBoardSnapshot, hasBoardSnapshotChanges } from './board-history';
import { moveSceneToTimelinePoint } from './timeline-sequence';

const scene = (id: string, position: number): Scene => ({
  id,
  plotlineId: id === 'b' ? 'p2' : 'p1',
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

const singletonItems: TimelineItem[] = [
  { id: 'a-point', type: 'scene', sceneId: 'a' },
  { id: 'b-point', type: 'scene', sceneId: 'b' },
  { id: 'c-point', type: 'scene', sceneId: 'c' },
  { id: 'd-point', type: 'scene', sceneId: 'd' },
];

describe('move scene to the same timeline point', () => {
  it('moves singleton B to singleton D and removes the source point', () => {
    const next = moveSceneToTimelinePoint(project(singletonItems), 'b', 'd-point');

    expect(next?.items.map(item => item.id)).toEqual(['a-point', 'c-point', 'd-point']);
    expect(next?.items.at(-1)).toEqual({
      id: 'd-point', type: 'point', sceneIds: ['d', 'b'],
    });
  });

  it('keeps the target at its chronological location after removing the source', () => {
    const next = moveSceneToTimelinePoint(project(singletonItems), 'b', 'd-point');
    expect(next?.items).toEqual([
      { id: 'a-point', type: 'scene', sceneId: 'a' },
      { id: 'c-point', type: 'scene', sceneId: 'c' },
      { id: 'd-point', type: 'point', sceneIds: ['d', 'b'] },
    ]);
  });

  it('appends a singleton source once to an existing multi-scene point', () => {
    const source = project([
      { id: 'a-point', type: 'scene', sceneId: 'a' },
      { id: 'b-point', type: 'scene', sceneId: 'b' },
      { id: 'de-point', type: 'point', sceneIds: ['d', 'e'] },
    ]);
    const next = moveSceneToTimelinePoint(source, 'b', 'de-point');

    expect(next?.items.at(-1)).toEqual({
      id: 'de-point', type: 'point', sceneIds: ['d', 'e', 'b'],
    });
    expect(next?.items.flatMap(item => item.type === 'scene' ? [item.sceneId] : item.sceneIds)
      .filter(id => id === 'b')).toHaveLength(1);
  });

  it('rejects the source point as its own target', () => {
    expect(moveSceneToTimelinePoint(project(singletonItems), 'b', 'b-point')).toBeNull();
  });

  it('rejects a source scene that already belongs to a multi-scene point', () => {
    const source = project([
      { id: 'ab-point', type: 'point', sceneIds: ['a', 'b'] },
      { id: 'd-point', type: 'scene', sceneId: 'd' },
    ]);
    expect(moveSceneToTimelinePoint(source, 'b', 'd-point')).toBeNull();
  });

  it('does not mutate timeline, scenes, metadata, or book order', () => {
    const source = project(singletonItems);
    const before = structuredClone(source);

    moveSceneToTimelinePoint(source, 'b', 'd-point');

    expect(source).toEqual(before);
    expect(source.bookSequence).toEqual(before.bookSequence);
    expect(source.scenes.map(item => item.position)).toEqual(before.scenes.map(item => item.position));
    expect(source.scenes.map(item => item.timeLabel)).toEqual(before.scenes.map(item => item.timeLabel));
    expect(source.scenes.map(item => item.plotlineId)).toEqual(before.scenes.map(item => item.plotlineId));
  });

  it('materializes legacy points safely without restoring group semantics', () => {
    const source = project([
      { id: 'legacy', type: 'group', title: 'Legacy', sceneIds: ['a', 'b'] },
      { id: 'd-point', type: 'scene', sceneId: 'd' },
    ]);
    const next = moveSceneToTimelinePoint(source, 'a', 'd-point');

    expect(next?.items).toEqual([
      { id: 'legacy-scene-1-b', type: 'scene', sceneId: 'b' },
      { id: 'd-point', type: 'point', sceneIds: ['d', 'a'] },
    ]);
  });

  it('is included in existing board history', () => {
    const source = project(singletonItems);
    const next = moveSceneToTimelinePoint(source, 'b', 'd-point');
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

  it('wires a separate same-time target mode without using multi-selection', () => {
    const source = readFileSync('components/board/TimelineBoardView.tsx', 'utf8');

    expect(source).toContain('const [sameTimeSource, setSameTimeSource]');
    expect(source).toContain('data-same-time-target-point-id={point.key}');
    expect(source).toContain('moveSceneToTimelinePoint(project, sameTimeSource.sceneId, targetPointId)');
    expect(source).toContain('setSameTimeSource(null)');
    expect(source).toContain("dispatchSelection({ type: 'exit' })");
    expect(source).toContain('!sameTimeSource && !placingSceneId');
    expect(source).toContain('if (placingSceneId || sameTimeSource || !onTimelineChange) return;');
  });
});
