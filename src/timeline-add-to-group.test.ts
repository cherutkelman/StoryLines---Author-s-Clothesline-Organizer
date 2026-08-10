import { describe, expect, it } from 'vitest';
import type { Project, TimelineData, TimelineItem } from '../types';
import {
  addScenesToTimelineGroup,
  flattenTimelineSceneIds,
  getEligibleTimelineGroupTargets,
} from './timeline-sequence';

const sceneIds = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
const project = (items: TimelineItem[]): Project => ({
  plotlines: [{ id: 'p1', name: 'Plotline', color: '#123456' }],
  scenes: sceneIds.map((id, position) => ({ id, plotlineId: 'p1', title: id, content: '', position })),
  bookSequence: sceneIds.map(sceneId => ({ id: `scene:${sceneId}`, type: 'scene' as const, sceneId })),
  timeline: { items },
});

const independent = (sceneId: string): TimelineItem => ({
  id: `timeline-${sceneId}`,
  type: 'scene',
  sceneId,
});

const group = (id: string, title: string, groupedSceneIds: string[]): TimelineItem => ({
  id,
  type: 'group',
  title,
  sceneIds: groupedSceneIds,
});

describe('add independent scenes to a timeline group', () => {
  it('adds one immediately preceding scene to the start of a group', () => {
    const source = project([independent('a'), group('group-1', 'Period', ['b', 'c']), independent('d')]);
    const result = addScenesToTimelineGroup(source, 'group-1', ['a']);

    expect(result?.items).toEqual([
      { id: 'group-1', type: 'group', title: 'Period', sceneIds: ['a', 'b', 'c'] },
      independent('d'),
    ]);
  });

  it('adds several consecutive preceding scenes in timeline order, not selection order', () => {
    const source = project([independent('a'), independent('b'), group('group-1', 'Period', ['c', 'd'])]);
    const result = addScenesToTimelineGroup(source, 'group-1', ['b', 'a']);

    expect(result?.items[0]).toEqual({
      id: 'group-1',
      type: 'group',
      title: 'Period',
      sceneIds: ['a', 'b', 'c', 'd'],
    });
  });

  it('adds one immediately following scene to the end of a group', () => {
    const source = project([independent('a'), group('group-1', 'Period', ['b', 'c']), independent('d')]);
    const result = addScenesToTimelineGroup(source, 'group-1', ['d']);

    expect(result?.items[1]).toEqual({
      id: 'group-1',
      type: 'group',
      title: 'Period',
      sceneIds: ['b', 'c', 'd'],
    });
  });

  it('adds several consecutive following scenes and removes their top-level items', () => {
    const source = project([group('group-1', 'Period', ['a', 'b']), independent('c'), independent('d'), independent('e')]);
    const result = addScenesToTimelineGroup(source, 'group-1', ['d', 'c']);

    expect(result?.items).toEqual([
      { id: 'group-1', type: 'group', title: 'Period', sceneIds: ['a', 'b', 'c', 'd'] },
      independent('e'),
    ]);
  });

  it('preserves group id, title, and existing internal scene order', () => {
    const source = project([independent('a'), group('stable-group', 'Stable title', ['c', 'b']), independent('d')]);
    const result = addScenesToTimelineGroup(source, 'stable-group', ['a']);

    expect(result?.items[0]).toEqual({
      id: 'stable-group',
      type: 'group',
      title: 'Stable title',
      sceneIds: ['a', 'c', 'b'],
    });
  });

  it('keeps the flattened chronological order identical', () => {
    const source = project([independent('a'), independent('b'), group('group-1', 'Period', ['c', 'd']), independent('e')]);
    const before = flattenTimelineSceneIds(source.timeline!.items);
    const result = addScenesToTimelineGroup(source, 'group-1', ['b', 'a']);

    expect(flattenTimelineSceneIds(result!.items)).toEqual(before);
  });

  it('returns both adjacent groups when selected scenes are between them', () => {
    const source = project([
      group('group-left', 'Earlier', ['a']),
      independent('c'),
      independent('d'),
      group('group-right', 'Later', ['e']),
    ]);

    expect(getEligibleTimelineGroupTargets(source, ['d', 'c'])).toEqual([
      { groupId: 'group-left', title: 'Earlier', placement: 'append' },
      { groupId: 'group-right', title: 'Later', placement: 'prepend' },
    ]);
  });

  it('rejects non-consecutive or non-adjacent selections', () => {
    const source = project([
      independent('a'),
      independent('b'),
      group('group-1', 'Period', ['c']),
      independent('d'),
      independent('e'),
    ]);

    expect(getEligibleTimelineGroupTargets(source, ['a', 'd'])).toEqual([]);
    expect(addScenesToTimelineGroup(source, 'group-1', ['a'])).toBeNull();
  });

  it('rejects scenes already inside groups, missing groups, invalid targets, and duplicate ids', () => {
    const source = project([
      group('group-1', 'First', ['a', 'b']),
      independent('c'),
      group('group-2', 'Second', ['d']),
    ]);

    expect(addScenesToTimelineGroup(source, 'group-1', ['a'])).toBeNull();
    expect(addScenesToTimelineGroup(source, 'missing', ['c'])).toBeNull();
    expect(addScenesToTimelineGroup(source, 'group-1', ['c', 'c'])).toBeNull();
    expect(addScenesToTimelineGroup(source, 'group-2', ['c'])).not.toBeNull();
  });

  it('does not mutate Project, timeline, bookSequence, or collapsed UI state', () => {
    const source = project([independent('a'), group('group-1', 'Period', ['b', 'c'])]);
    const before = structuredClone(source);
    const collapsedGroupIds = ['group-1'];
    const collapsedBefore = [...collapsedGroupIds];

    addScenesToTimelineGroup(source, 'group-1', ['a']);

    expect(source).toEqual(before);
    expect(source.bookSequence).toEqual(before.bookSequence);
    expect(collapsedGroupIds).toEqual(collapsedBefore);
  });
});
