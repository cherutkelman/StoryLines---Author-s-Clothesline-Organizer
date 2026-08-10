import { describe, expect, it } from 'vitest';
import type { BookSequenceItem, Project, Scene, TimelineData } from '../types';
import { getEffectiveTimelinePoints, getUnplacedTimelineScenes } from './timeline-sequence';

const scene = (
  id: string,
  position: number,
  plotlineId = 'p1',
  timeLabel?: string
): Scene => ({
  id,
  plotlineId,
  title: `Scene ${id}`,
  content: '',
  position,
  timeLabel,
});

const project = (
  scenes: Scene[],
  timeline?: TimelineData,
  bookSequence?: BookSequenceItem[]
): Project => ({
  plotlines: [
    { id: 'p1', name: 'One', color: '#111111' },
    { id: 'p2', name: 'Two', color: '#222222' },
  ],
  scenes,
  timeline,
  bookSequence,
});

describe('effective timeline points', () => {
  it('derives singleton points in book order without materializing a timeline', () => {
    const source = project(
      [scene('a', 0), scene('b', 1), scene('c', 2)],
      undefined,
      [
        { id: 'scene:c', type: 'scene', sceneId: 'c' },
        { id: 'scene:a', type: 'scene', sceneId: 'a' },
        { id: 'scene:b', type: 'scene', sceneId: 'b' },
      ]
    );
    const before = structuredClone(source);

    expect(getEffectiveTimelinePoints(source)).toEqual([
      { id: 'timeline-scene-c', sceneIds: ['c'] },
      { id: 'timeline-scene-a', sceneIds: ['a'] },
      { id: 'timeline-scene-b', sceneIds: ['b'] },
    ]);
    expect(source).toEqual(before);
    expect(source.timeline).toBeUndefined();
  });

  it('normalizes stored scene items into separate singleton points in order', () => {
    const source = project([scene('a', 0), scene('b', 1)], {
      items: [
        { id: 'custom-b', type: 'scene', sceneId: 'b' },
        { id: 'custom-a', type: 'scene', sceneId: 'a' },
      ],
    });

    expect(getEffectiveTimelinePoints(source)).toEqual([
      { id: 'custom-b', sceneIds: ['b'] },
      { id: 'custom-a', sceneIds: ['a'] },
    ]);
  });

  it('keeps one stored point with multiple scenes and preserves display order', () => {
    const source = project([scene('a', 0), scene('b', 1), scene('c', 2)], {
      items: [{ id: 'point-1', type: 'point', sceneIds: ['c', 'a', 'b'] }],
    });

    expect(getEffectiveTimelinePoints(source)).toEqual([
      { id: 'point-1', sceneIds: ['c', 'a', 'b'] },
    ]);
  });

  it('expands a legacy group into deterministic singleton points', () => {
    const source = project([scene('a', 0), scene('b', 1), scene('c', 2)], {
      items: [{ id: 'legacy', type: 'group', title: 'Past', sceneIds: ['a', 'b', 'c'] }],
    });

    const first = getEffectiveTimelinePoints(source);
    expect(first).toEqual([
      { id: 'legacy-scene-0-a', sceneIds: ['a'] },
      { id: 'legacy-scene-1-b', sceneIds: ['b'] },
      { id: 'legacy-scene-2-c', sceneIds: ['c'] },
    ]);
    expect(getEffectiveTimelinePoints(source)).toEqual(first);
  });

  it('preserves chronology across scene, point, and legacy group items', () => {
    const source = project(['a', 'b', 'c', 'd', 'e'].map((id, index) => scene(id, index)), {
      items: [
        { id: 'single-a', type: 'scene', sceneId: 'a' },
        { id: 'parallel', type: 'point', sceneIds: ['b', 'c'] },
        { id: 'legacy', type: 'group', title: 'Legacy', sceneIds: ['d', 'e'] },
      ],
    });

    expect(getEffectiveTimelinePoints(source).map(point => point.sceneIds)).toEqual([
      ['a'], ['b', 'c'], ['d'], ['e'],
    ]);
  });

  it('filters missing scenes and omits effective points that become empty', () => {
    const source = project([scene('a', 0), scene('b', 1)], {
      items: [
        { id: 'mixed', type: 'point', sceneIds: ['a', 'missing', 'b'] },
        { id: 'empty', type: 'point', sceneIds: ['missing-2'] },
        { id: 'missing-scene', type: 'scene', sceneId: 'missing-3' },
      ],
    });

    expect(getEffectiveTimelinePoints(source)).toEqual([
      { id: 'mixed', sceneIds: ['a', 'b'] },
    ]);
  });

  it('does not mutate stored data, bookSequence, time labels, or plotline assignments', () => {
    const source = project(
      [scene('a', 0, 'p2', 'same label'), scene('b', 1, 'p2', 'same label')],
      { items: [{ id: 'point', type: 'point', sceneIds: ['b', 'a'] }] },
      [
        { id: 'scene:a', type: 'scene', sceneId: 'a' },
        { id: 'scene:b', type: 'scene', sceneId: 'b' },
      ]
    );
    const before = structuredClone(source);

    expect(getEffectiveTimelinePoints(source)).toEqual([{ id: 'point', sceneIds: ['b', 'a'] }]);
    expect(source).toEqual(before);
  });

  it('treats scenes inside a point as placed', () => {
    const source = project([scene('a', 0), scene('b', 1), scene('c', 2)], {
      items: [{ id: 'point', type: 'point', sceneIds: ['a', 'b'] }],
    }, [
      { id: 'scene:a', type: 'scene', sceneId: 'a' },
      { id: 'scene:b', type: 'scene', sceneId: 'b' },
      { id: 'scene:c', type: 'scene', sceneId: 'c' },
    ]);

    expect(getUnplacedTimelineScenes(source).map(item => item.id)).toEqual(['c']);
  });
});
