import { describe, expect, it } from 'vitest';
import type { Project, TimelineData } from '../types';
import { moveTimelineItem } from './timeline-sequence';

const timeline: TimelineData = {
  items: [
    { id: 'a', type: 'scene', sceneId: 's1' },
    { id: 'group', type: 'group', title: 'Past', sceneIds: ['s2', 's3'] },
    { id: 'e', type: 'scene', sceneId: 's4' },
    { id: 'f', type: 'scene', sceneId: 's5' },
  ],
};

const project = (storedTimeline: TimelineData | null = timeline): Project => ({
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
  timeline: storedTimeline ?? undefined,
});

const ids = (data: TimelineData | null) => data?.items.map(item => item.id);

describe('timeline reorder', () => {
  it('moves an independent scene forward', () => {
    expect(ids(moveTimelineItem(project(), 'a', 'e', 'after'))).toEqual(['group', 'e', 'a', 'f']);
  });

  it('moves an independent scene backward', () => {
    expect(ids(moveTimelineItem(project(), 'f', 'a', 'before'))).toEqual(['f', 'a', 'group', 'e']);
  });

  it('moves a group forward as one top-level item', () => {
    expect(ids(moveTimelineItem(project(), 'group', 'f', 'after'))).toEqual(['a', 'e', 'f', 'group']);
  });

  it('moves a group backward as one top-level item', () => {
    expect(ids(moveTimelineItem(project(), 'group', 'a', 'before'))).toEqual(['group', 'a', 'e', 'f']);
  });

  it('preserves group title and sceneIds in their original order', () => {
    const result = moveTimelineItem(project(), 'group', 'f', 'after');

    expect(result?.items.at(-1)).toEqual({
      id: 'group',
      type: 'group',
      title: 'Past',
      sceneIds: ['s2', 's3'],
    });
  });

  it('moves a scene before and after a group without entering it', () => {
    expect(ids(moveTimelineItem(project(), 'e', 'group', 'before'))).toEqual(['a', 'e', 'group', 'f']);
    expect(ids(moveTimelineItem(project(), 'a', 'group', 'after'))).toEqual(['group', 'a', 'e', 'f']);
  });

  it('moves a group before and after an independent scene', () => {
    expect(ids(moveTimelineItem(project(), 'group', 'a', 'before'))).toEqual(['group', 'a', 'e', 'f']);
    expect(ids(moveTimelineItem(project(), 'group', 'f', 'after'))).toEqual(['a', 'e', 'f', 'group']);
  });

  it('materializes the complete effective timeline on the first reorder', () => {
    const source = project(null);
    const result = moveTimelineItem(source, 'timeline-scene-s1', 'timeline-scene-s4', 'after');

    expect(source.timeline).toBeUndefined();
    expect(ids(result)).toEqual([
      'timeline-scene-s2',
      'timeline-scene-s3',
      'timeline-scene-s4',
      'timeline-scene-s1',
      'timeline-scene-s5',
    ]);
  });

  it('does not mutate Project, timeline items, groups, or bookSequence', () => {
    const source = project();
    source.scenes[0] = { ...source.scenes[0], timeLabel: 'The next morning' };
    const before = structuredClone(source);

    moveTimelineItem(source, 'group', 'f', 'after');

    expect(source).toEqual(before);
    expect(source.bookSequence).toEqual(before.bookSequence);
    expect(source.timeline?.items[1]).toEqual(before.timeline?.items[1]);
    expect(source.scenes[0].timeLabel).toBe('The next morning');
  });

  it('returns null for missing items and no-op placements', () => {
    expect(moveTimelineItem(project(), 'missing', 'a', 'before')).toBeNull();
    expect(moveTimelineItem(project(), 'a', 'a', 'after')).toBeNull();
    expect(moveTimelineItem(project(), 'a', 'group', 'before')).toBeNull();
  });
});
