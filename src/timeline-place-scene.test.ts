import { describe, expect, it } from 'vitest';
import type { Project, TimelineData, TimelineItem } from '../types';
import { getUnplacedTimelineScenes, placeSceneInTimeline } from './timeline-sequence';

const scenes = ['s1', 's2', 's3', 's4', 'new-scene'].map((id, position) => ({
  id,
  plotlineId: 'p1',
  title: id,
  content: '',
  position,
  ...(id === 'new-scene' ? { timeLabel: 'The next morning' } : {}),
}));

const project = (items: TimelineItem[], withTimeline = true): Project => ({
  plotlines: [{ id: 'p1', name: 'Plotline', color: '#123456' }],
  scenes,
  bookSequence: scenes.map(scene => ({ id: `scene:${scene.id}`, type: 'scene' as const, sceneId: scene.id })),
  timeline: withTimeline ? { items } : undefined,
});

const ids = (timeline: TimelineData | null) => timeline?.items.map(item => item.id);

describe('place an unplaced scene in timeline', () => {
  it('places a scene at the beginning with a deterministic id', () => {
    const result = placeSceneInTimeline(project([
      { id: 's1', type: 'scene', sceneId: 's1' },
      { id: 's2', type: 'scene', sceneId: 's2' },
    ]), 'new-scene', 0);

    expect(result?.items[0]).toEqual({
      id: 'timeline-scene-new-scene',
      type: 'scene',
      sceneId: 'new-scene',
    });
  });

  it('places a scene in the middle and at the end', () => {
    const source = project([
      { id: 's1', type: 'scene', sceneId: 's1' },
      { id: 's2', type: 'scene', sceneId: 's2' },
    ]);

    expect(ids(placeSceneInTimeline(source, 'new-scene', 1))).toEqual([
      's1',
      'timeline-scene-new-scene',
      's2',
    ]);
    expect(ids(placeSceneInTimeline(source, 'new-scene', 2))).toEqual([
      's1',
      's2',
      'timeline-scene-new-scene',
    ]);
  });

  it('materializes a legacy group as ordered singleton points on placement', () => {
    const source = project([
      { id: 's1', type: 'scene', sceneId: 's1' },
      { id: 'group', type: 'group', title: 'Period', sceneIds: ['s2', 's3'] },
    ]);

    expect(ids(placeSceneInTimeline(source, 'new-scene', 1))).toEqual([
      's1',
      'timeline-scene-new-scene',
      'group-scene-0-s2',
      'group-scene-1-s3',
    ]);
    expect(ids(placeSceneInTimeline(source, 'new-scene', 3))).toEqual([
      's1',
      'group-scene-0-s2',
      'group-scene-1-s3',
      'timeline-scene-new-scene',
    ]);
  });

  it('places before and after a multi-scene point without flattening it', () => {
    const source = project([
      { id: 'multi', type: 'point', sceneIds: ['s1', 's2'] },
      { id: 's3', type: 'scene', sceneId: 's3' },
    ]);

    const before = placeSceneInTimeline(source, 'new-scene', 0);
    const after = placeSceneInTimeline(source, 'new-scene', 1);
    expect(before?.items[1]).toEqual({ id: 'multi', type: 'point', sceneIds: ['s1', 's2'] });
    expect(after?.items[0]).toEqual({ id: 'multi', type: 'point', sceneIds: ['s1', 's2'] });
    expect(ids(after)).toEqual(['multi', 'timeline-scene-new-scene', 's3']);
  });

  it('places between a singleton and multi point and between two multi points', () => {
    const singletonAndMulti = project([
      { id: 's3', type: 'scene', sceneId: 's3' },
      { id: 'multi', type: 'point', sceneIds: ['s1', 's2'] },
    ]);
    const twoMulti = project([
      { id: 'first', type: 'point', sceneIds: ['s1', 's2'] },
      { id: 'second', type: 'point', sceneIds: ['s3', 's4'] },
    ]);

    expect(ids(placeSceneInTimeline(singletonAndMulti, 'new-scene', 1))).toEqual([
      's3', 'timeline-scene-new-scene', 'multi',
    ]);
    const between = placeSceneInTimeline(twoMulti, 'new-scene', 1);
    expect(between?.items).toEqual([
      { id: 'first', type: 'point', sceneIds: ['s1', 's2'] },
      { id: 'timeline-scene-new-scene', type: 'scene', sceneId: 'new-scene' },
      { id: 'second', type: 'point', sceneIds: ['s3', 's4'] },
    ]);
  });

  it('places a scene as the first item in an empty explicit timeline', () => {
    expect(placeSceneInTimeline(project([]), 'new-scene', 0)?.items).toEqual([
      { id: 'timeline-scene-new-scene', type: 'scene', sceneId: 'new-scene' },
    ]);
  });

  it('rejects scenes already placed independently, inside a group, or inside a point', () => {
    expect(placeSceneInTimeline(project([
      { id: 'existing', type: 'scene', sceneId: 'new-scene' },
    ]), 'new-scene', 0)).toBeNull();
    expect(placeSceneInTimeline(project([
      { id: 'group', type: 'group', title: 'Period', sceneIds: ['new-scene', 's1'] },
    ]), 'new-scene', 0)).toBeNull();
    expect(placeSceneInTimeline(project([
      { id: 'point', type: 'point', sceneIds: ['s1', 'new-scene'] },
    ]), 'new-scene', 0)).toBeNull();
  });

  it('rejects a missing scene, invalid target indexes, and Project without timeline', () => {
    const source = project([{ id: 's1', type: 'scene', sceneId: 's1' }]);

    expect(placeSceneInTimeline(source, 'missing', 0)).toBeNull();
    expect(placeSceneInTimeline(source, 'new-scene', -1)).toBeNull();
    expect(placeSceneInTimeline(source, 'new-scene', 2)).toBeNull();
    expect(placeSceneInTimeline(source, 'new-scene', 0.5)).toBeNull();
    expect(placeSceneInTimeline(project([], false), 'new-scene', 0)).toBeNull();
  });

  it('does not mutate Project, bookSequence, Scene fields, or existing timeline items', () => {
    const source = project([{ id: 's1', type: 'scene', sceneId: 's1' }]);
    const before = structuredClone(source);

    placeSceneInTimeline(source, 'new-scene', 1);

    expect(source).toEqual(before);
    expect(source.bookSequence).toEqual(before.bookSequence);
    expect(source.scenes.find(scene => scene.id === 'new-scene')?.timeLabel).toBe('The next morning');
  });

  it('removes the scene from the derived unplaced list after placement', () => {
    const source = project([{ id: 's1', type: 'scene', sceneId: 's1' }]);
    expect(getUnplacedTimelineScenes(source).map(scene => scene.id)).toContain('new-scene');
    const timeline = placeSceneInTimeline(source, 'new-scene', 1);

    expect(getUnplacedTimelineScenes({ ...source, timeline: timeline! }).map(scene => scene.id)).not.toContain('new-scene');
  });
});
