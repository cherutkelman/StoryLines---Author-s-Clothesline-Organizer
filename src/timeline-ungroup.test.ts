import { describe, expect, it } from 'vitest';
import type { Project, TimelineData } from '../types';
import { ungroupTimelineGroup } from './timeline-sequence';

const timeline: TimelineData = {
  items: [
    { id: 'before', type: 'scene', sceneId: 's1' },
    { id: 'group-past', type: 'group', title: 'Past', sceneIds: ['s2', 's3', 's4'] },
    { id: 'after', type: 'scene', sceneId: 's5' },
  ],
};

const project = (sourceTimeline: TimelineData = timeline): Project => ({
  plotlines: [{ id: 'p1', name: 'Plotline', color: '#123456' }],
  scenes: ['s1', 's2', 's3', 's4', 's5'].map((id, position) => ({
    id,
    plotlineId: 'p1',
    title: id,
    content: '',
    position,
  })),
  bookSequence: ['s1', 's2', 's3', 's4', 's5'].map(sceneId => ({
    id: `scene:${sceneId}`,
    type: 'scene' as const,
    sceneId,
  })),
  timeline: sourceTimeline,
});

describe('timeline ungroup', () => {
  it('ungroups a group containing two scenes', () => {
    const source = project({
      items: [{ id: 'group-two', type: 'group', title: 'Two', sceneIds: ['s2', 's3'] }],
    });

    expect(ungroupTimelineGroup(source, 'group-two')?.items).toEqual([
      { id: 'timeline-scene-s2', type: 'scene', sceneId: 's2' },
      { id: 'timeline-scene-s3', type: 'scene', sceneId: 's3' },
    ]);
  });

  it('ungroups several scenes in their exact internal order', () => {
    const result = ungroupTimelineGroup(project(), 'group-past');

    expect(result?.items.slice(1, 4).map(item => item.type === 'scene' ? item.sceneId : '')).toEqual([
      's2',
      's3',
      's4',
    ]);
  });

  it('inserts deterministic scene items at the exact group location', () => {
    const result = ungroupTimelineGroup(project(), 'group-past');

    expect(result?.items).toEqual([
      timeline.items[0],
      { id: 'timeline-scene-s2', type: 'scene', sceneId: 's2' },
      { id: 'timeline-scene-s3', type: 'scene', sceneId: 's3' },
      { id: 'timeline-scene-s4', type: 'scene', sceneId: 's4' },
      timeline.items[2],
    ]);
  });

  it('preserves all timeline items outside the group unchanged', () => {
    const result = ungroupTimelineGroup(project(), 'group-past');

    expect(result?.items[0]).toBe(timeline.items[0]);
    expect(result?.items.at(-1)).toBe(timeline.items[2]);
  });

  it('skips missing scene references safely while preserving valid order', () => {
    const source = project({
      items: [{
        id: 'group-missing',
        type: 'group',
        title: 'Missing',
        sceneIds: ['s3', 'deleted-scene', 's2'],
      }],
    });

    expect(ungroupTimelineGroup(source, 'group-missing')?.items).toEqual([
      { id: 'timeline-scene-s3', type: 'scene', sceneId: 's3' },
      { id: 'timeline-scene-s2', type: 'scene', sceneId: 's2' },
    ]);
  });

  it('does not mutate the helper input or bookSequence', () => {
    const source = project();
    const before = structuredClone(source);

    ungroupTimelineGroup(source, 'group-past');

    expect(source).toEqual(before);
    expect(source.bookSequence).toEqual(before.bookSequence);
  });

  it('returns null when the group does not exist or the id belongs to a scene item', () => {
    expect(ungroupTimelineGroup(project(), 'missing')).toBeNull();
    expect(ungroupTimelineGroup(project(), 'before')).toBeNull();
  });
});
