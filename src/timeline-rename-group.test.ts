import { describe, expect, it } from 'vitest';
import type { Project, TimelineData } from '../types';
import { renameTimelineGroup } from './timeline-sequence';

const timeline: TimelineData = {
  items: [
    { id: 'before', type: 'scene', sceneId: 's1' },
    { id: 'group-past', type: 'group', title: 'Past', sceneIds: ['s3', 's2'] },
    { id: 'after', type: 'scene', sceneId: 's4' },
  ],
};

const project = (): Project => ({
  plotlines: [{ id: 'p1', name: 'Plotline', color: '#123456' }],
  scenes: ['s1', 's2', 's3', 's4'].map((id, position) => ({
    id,
    plotlineId: 'p1',
    title: id,
    content: '',
    position,
  })),
  bookSequence: ['s1', 's2', 's3', 's4'].map(sceneId => ({
    id: `scene:${sceneId}`,
    type: 'scene' as const,
    sceneId,
  })),
  timeline,
});

describe('timeline group rename', () => {
  it('renames an existing group and trims the title', () => {
    const result = renameTimelineGroup(project(), 'group-past', '  Before the accident  ');

    expect(result?.items[1]).toEqual({
      id: 'group-past',
      type: 'group',
      title: 'Before the accident',
      sceneIds: ['s3', 's2'],
    });
  });

  it('preserves group id, sceneIds order, and timeline position', () => {
    const result = renameTimelineGroup(project(), 'group-past', 'Childhood');
    const renamed = result?.items[1];

    expect(renamed).toMatchObject({ id: 'group-past', sceneIds: ['s3', 's2'] });
    expect(result?.items.map(item => item.id)).toEqual(['before', 'group-past', 'after']);
  });

  it('preserves every other timeline item unchanged', () => {
    const result = renameTimelineGroup(project(), 'group-past', 'Childhood');

    expect(result?.items[0]).toBe(timeline.items[0]);
    expect(result?.items[2]).toBe(timeline.items[2]);
  });

  it('rejects empty and whitespace-only titles', () => {
    expect(renameTimelineGroup(project(), 'group-past', '')).toBeNull();
    expect(renameTimelineGroup(project(), 'group-past', '   ')).toBeNull();
  });

  it('returns null for a missing group or a scene item id', () => {
    expect(renameTimelineGroup(project(), 'missing', 'Title')).toBeNull();
    expect(renameTimelineGroup(project(), 'before', 'Title')).toBeNull();
  });

  it('returns null when the trimmed title is unchanged', () => {
    expect(renameTimelineGroup(project(), 'group-past', 'Past')).toBeNull();
    expect(renameTimelineGroup(project(), 'group-past', '  Past  ')).toBeNull();
  });

  it('does not mutate Project, timeline, group, or bookSequence', () => {
    const source = project();
    const before = structuredClone(source);

    renameTimelineGroup(source, 'group-past', 'Childhood');

    expect(source).toEqual(before);
    expect(source.bookSequence).toEqual(before.bookSequence);
  });
});
