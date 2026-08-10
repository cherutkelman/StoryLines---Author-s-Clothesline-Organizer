import { describe, expect, it } from 'vitest';
import type { BookSequenceItem, Project, Scene, TimelineData } from '../types';
import { createTimelineGroup, validateTimelineGroupSelection } from './timeline-sequence';

const scene = (id: string, position: number): Scene => ({
  id,
  plotlineId: 'p1',
  title: id,
  content: '',
  position,
});

const sequence = (...sceneIds: string[]): BookSequenceItem[] => sceneIds.map(sceneId => ({
  id: `scene:${sceneId}`,
  type: 'scene',
  sceneId,
}));

const project = (timeline?: TimelineData): Project => ({
  plotlines: [{ id: 'p1', name: 'Plotline', color: '#123456' }],
  scenes: [scene('s1', 0), scene('s2', 1), scene('s3', 2), scene('s4', 3)],
  bookSequence: sequence('s1', 's2', 's3', 's4'),
  timeline,
});

describe('timeline grouping', () => {
  it('creates a group from two consecutive top-level scenes', () => {
    const result = createTimelineGroup(project(), ['s2', 's3'], 'Middle', 'group-1');

    expect(result?.items).toEqual([
      { id: 'timeline-scene-s1', type: 'scene', sceneId: 's1' },
      { id: 'group-1', type: 'group', title: 'Middle', sceneIds: ['s2', 's3'] },
      { id: 'timeline-scene-s4', type: 'scene', sceneId: 's4' },
    ]);
  });

  it('creates a group from several consecutive scenes', () => {
    const result = createTimelineGroup(project(), ['s1', 's2', 's3'], 'Beginning', 'group-many');

    expect(result?.items[0]).toEqual({
      id: 'group-many',
      type: 'group',
      title: 'Beginning',
      sceneIds: ['s1', 's2', 's3'],
    });
    expect(result?.items[1]).toEqual({ id: 'timeline-scene-s4', type: 'scene', sceneId: 's4' });
  });

  it('orders group sceneIds by chronology rather than selection order', () => {
    const result = createTimelineGroup(project(), ['s3', 's2'], 'Reverse clicks', 'group-order');

    expect(result?.items[1]).toMatchObject({ sceneIds: ['s2', 's3'] });
  });

  it('places the group at the first selected scene and preserves all other items', () => {
    const timeline: TimelineData = {
      items: [
        { id: 'before', type: 'scene', sceneId: 's4' },
        { id: 'selected-a', type: 'scene', sceneId: 's2' },
        { id: 'selected-b', type: 'scene', sceneId: 's1' },
        { id: 'after', type: 'scene', sceneId: 's3' },
      ],
    };
    const result = createTimelineGroup(project(timeline), ['s1', 's2'], 'Selected', 'group-position');

    expect(result?.items).toEqual([
      timeline.items[0],
      { id: 'group-position', type: 'group', title: 'Selected', sceneIds: ['s2', 's1'] },
      timeline.items[3],
    ]);
  });

  it('materializes the complete effective timeline when no timeline was stored', () => {
    const source = project();
    const result = createTimelineGroup(source, ['s2', 's3'], 'Materialized', 'group-materialized');

    expect(source.timeline).toBeUndefined();
    expect(result?.items).toHaveLength(3);
    expect(result?.items.map(item => item.id)).toEqual([
      'timeline-scene-s1',
      'group-materialized',
      'timeline-scene-s4',
    ]);
  });

  it('does not change bookSequence or the input project', () => {
    const source = project();
    const before = structuredClone(source);

    createTimelineGroup(source, ['s2', 's3'], 'Immutable', 'group-immutable');

    expect(source).toEqual(before);
    expect(source.bookSequence).toEqual(sequence('s1', 's2', 's3', 's4'));
  });

  it('rejects non-consecutive scenes', () => {
    expect(validateTimelineGroupSelection(project(), ['s1', 's3'])).toMatchObject({
      isValid: false,
      reason: 'not-consecutive',
    });
    expect(createTimelineGroup(project(), ['s1', 's3'], 'Invalid', 'group-invalid')).toBeNull();
  });

  it('rejects fewer than two scenes', () => {
    expect(validateTimelineGroupSelection(project(), ['s1'])).toMatchObject({
      isValid: false,
      reason: 'minimum-scenes',
    });
    expect(createTimelineGroup(project(), ['s1'], 'Invalid', 'group-invalid')).toBeNull();
  });

  it('rejects scenes that are already inside a group', () => {
    const source = project({
      items: [
        { id: 'existing-group', type: 'group', title: 'Existing', sceneIds: ['s1', 's2'] },
        { id: 's3', type: 'scene', sceneId: 's3' },
        { id: 's4', type: 'scene', sceneId: 's4' },
      ],
    });

    expect(validateTimelineGroupSelection(source, ['s1', 's2'])).toMatchObject({
      isValid: false,
      reason: 'not-top-level-scenes',
    });
    expect(createTimelineGroup(source, ['s1', 's2'], 'Nested', 'group-nested')).toBeNull();
  });

  it('rejects an empty or whitespace-only title and trims a valid title', () => {
    expect(createTimelineGroup(project(), ['s1', 's2'], '', 'group-empty')).toBeNull();
    expect(createTimelineGroup(project(), ['s1', 's2'], '   ', 'group-space')).toBeNull();
    expect(createTimelineGroup(project(), ['s1', 's2'], '  Childhood  ', 'group-title')?.items[0]).toMatchObject({
      title: 'Childhood',
    });
  });
});
