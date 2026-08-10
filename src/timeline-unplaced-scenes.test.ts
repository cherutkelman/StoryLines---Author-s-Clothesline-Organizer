import { describe, expect, it } from 'vitest';
import type { Project, TimelineData } from '../types';
import { getUnplacedTimelineScenes } from './timeline-sequence';

const project = (timeline?: TimelineData): Project => ({
  plotlines: [{ id: 'p1', name: 'Plotline', color: '#123456' }],
  scenes: ['s1', 's2', 's3', 's4'].map((id, position) => ({
    id,
    plotlineId: 'p1',
    title: id,
    content: '',
    position,
  })),
  bookSequence: [
    { id: 'scene:s3', type: 'scene', sceneId: 's3' },
    { id: 'scene:s1', type: 'scene', sceneId: 's1' },
    { id: 'scene:s4', type: 'scene', sceneId: 's4' },
    { id: 'scene:s2', type: 'scene', sceneId: 's2' },
  ],
  timeline,
});

describe('unplaced timeline scenes', () => {
  it('returns no unplaced scenes when Project has no explicit timeline', () => {
    expect(getUnplacedTimelineScenes(project())).toEqual([]);
  });

  it('returns an empty list when every scene is placed', () => {
    const source = project({
      items: [
        { id: 'group', type: 'group', title: 'Placed group', sceneIds: ['s1', 's2'] },
        { id: 's3', type: 'scene', sceneId: 's3' },
        { id: 's4', type: 'scene', sceneId: 's4' },
      ],
    });

    expect(getUnplacedTimelineScenes(source)).toEqual([]);
  });

  it('finds new scenes absent from top-level items and groups', () => {
    const source = project({
      items: [
        { id: 'group', type: 'group', title: 'Placed group', sceneIds: ['s1', 's2'] },
        { id: 's3', type: 'scene', sceneId: 's3' },
      ],
    });

    expect(getUnplacedTimelineScenes(source).map(scene => scene.id)).toEqual(['s4']);
  });

  it('orders several unplaced scenes by bookSequence without changing timeline order', () => {
    const source = project({
      items: [{ id: 's2', type: 'scene', sceneId: 's2' }],
    });
    const before = structuredClone(source.timeline);

    expect(getUnplacedTimelineScenes(source).map(scene => scene.id)).toEqual(['s3', 's1', 's4']);
    expect(source.timeline).toEqual(before);
    expect(source.timeline?.items.map(item => item.id)).toEqual(['s2']);
  });

  it('ignores stale timeline references to deleted scenes', () => {
    const source = project({
      items: [
        { id: 'deleted', type: 'scene', sceneId: 'deleted-scene' },
        { id: 'group', type: 'group', title: 'Old', sceneIds: ['deleted-in-group', 's1', 's2', 's3', 's4'] },
      ],
    });

    expect(getUnplacedTimelineScenes(source)).toEqual([]);
  });

  it('does not mutate Project or materialize timeline data', () => {
    const source = project({ items: [{ id: 's1', type: 'scene', sceneId: 's1' }] });
    const before = structuredClone(source);

    getUnplacedTimelineScenes(source);

    expect(source).toEqual(before);
  });
});
