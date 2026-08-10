import { describe, expect, it } from 'vitest';
import type { Project, TimelineItem } from '../types';
import {
  flattenTimelineSceneIds,
  removeScenesFromTimelineGroup,
  validateTimelineGroupSceneRemoval,
} from './timeline-sequence';

const existingSceneIds = ['a', 'b', 'c', 'd', 'e', 'f'];
const group = (id: string, sceneIds: string[]): TimelineItem => ({
  id,
  type: 'group',
  title: `Title ${id}`,
  sceneIds,
});
const independent = (sceneId: string): TimelineItem => ({
  id: `timeline-${sceneId}`,
  type: 'scene',
  sceneId,
});
const project = (items: TimelineItem[]): Project => ({
  plotlines: [{ id: 'p1', name: 'Plotline', color: '#123456' }],
  scenes: existingSceneIds.map((id, position) => ({ id, plotlineId: 'p1', title: id, content: '', position })),
  bookSequence: existingSceneIds.map(sceneId => ({ id: `scene:${sceneId}`, type: 'scene' as const, sceneId })),
  timeline: { items },
});

describe('remove scenes from a timeline group', () => {
  it('extracts the first scene before its group', () => {
    const source = project([group('group-1', ['a', 'b', 'c', 'd']), independent('e')]);

    expect(removeScenesFromTimelineGroup(source, 'group-1', ['a'])?.items).toEqual([
      { id: 'timeline-scene-a', type: 'scene', sceneId: 'a' },
      { id: 'group-1', type: 'group', title: 'Title group-1', sceneIds: ['b', 'c', 'd'] },
      independent('e'),
    ]);
  });

  it('extracts consecutive starting scenes in group order rather than selection order', () => {
    const source = project([group('group-1', ['a', 'b', 'c', 'd'])]);
    const result = removeScenesFromTimelineGroup(source, 'group-1', ['b', 'a']);

    expect(result?.items).toEqual([
      { id: 'timeline-scene-a', type: 'scene', sceneId: 'a' },
      { id: 'timeline-scene-b', type: 'scene', sceneId: 'b' },
      { id: 'group-1', type: 'group', title: 'Title group-1', sceneIds: ['c', 'd'] },
    ]);
  });

  it('extracts the last scene after its group', () => {
    const source = project([independent('a'), group('group-1', ['b', 'c', 'd', 'e'])]);
    const result = removeScenesFromTimelineGroup(source, 'group-1', ['e']);

    expect(result?.items.at(-1)).toEqual({ id: 'timeline-scene-e', type: 'scene', sceneId: 'e' });
    expect(result?.items[1]).toEqual({
      id: 'group-1',
      type: 'group',
      title: 'Title group-1',
      sceneIds: ['b', 'c', 'd'],
    });
  });

  it('extracts several consecutive ending scenes with deterministic ids', () => {
    const source = project([group('group-1', ['a', 'b', 'c', 'd'])]);
    const result = removeScenesFromTimelineGroup(source, 'group-1', ['d', 'c']);

    expect(result?.items).toEqual([
      { id: 'group-1', type: 'group', title: 'Title group-1', sceneIds: ['a', 'b'] },
      { id: 'timeline-scene-c', type: 'scene', sceneId: 'c' },
      { id: 'timeline-scene-d', type: 'scene', sceneId: 'd' },
    ]);
  });

  it('preserves group id, title, remaining order, and all surrounding items', () => {
    const before = independent('a');
    const after = independent('f');
    const source = project([before, group('stable-group', ['b', 'c', 'd', 'e']), after]);
    const result = removeScenesFromTimelineGroup(source, 'stable-group', ['b']);

    expect(result?.items[0]).toBe(before);
    expect(result?.items.at(-1)).toBe(after);
    expect(result?.items[2]).toEqual({
      id: 'stable-group',
      type: 'group',
      title: 'Title stable-group',
      sceneIds: ['c', 'd', 'e'],
    });
  });

  it('keeps the flattened chronology identical before and after extraction', () => {
    const source = project([independent('a'), group('group-1', ['b', 'c', 'd', 'e']), independent('f')]);
    const before = flattenTimelineSceneIds(source.timeline!.items);
    const result = removeScenesFromTimelineGroup(source, 'group-1', ['e', 'd']);

    expect(flattenTimelineSceneIds(result!.items)).toEqual(before);
  });

  it('rejects a middle selection and selections spanning multiple groups', () => {
    const source = project([
      group('group-1', ['a', 'b', 'c', 'd']),
      group('group-2', ['e', 'f']),
    ]);

    expect(validateTimelineGroupSceneRemoval(source, ['b', 'c'])).toMatchObject({
      isValid: false,
      reason: 'not-at-edge',
    });
    const separateGroups = project([group('group-1', ['a', 'b', 'c']), group('group-2', ['d', 'e', 'f'])]);
    expect(validateTimelineGroupSceneRemoval(separateGroups, ['a', 'd'])).toMatchObject({
      isValid: false,
      reason: 'not-one-group',
    });
  });

  it('rejects extraction that leaves fewer than two valid scenes or selects the whole group', () => {
    const source = project([group('group-1', ['a', 'b', 'c'])]);

    expect(validateTimelineGroupSceneRemoval(source, ['a', 'b'])).toMatchObject({ reason: 'minimum-remaining' });
    expect(validateTimelineGroupSceneRemoval(source, ['a', 'b', 'c'])).toMatchObject({ reason: 'minimum-remaining' });
    const twoSceneGroup = project([group('group-2', ['a', 'b'])]);
    expect(removeScenesFromTimelineGroup(twoSceneGroup, 'group-2', ['b'])).toBeNull();
  });

  it('ignores missing edge references when validating visible first and last scenes', () => {
    const source = project([group('group-1', ['missing-start', 'a', 'b', 'c', 'missing-end'])]);
    const startResult = removeScenesFromTimelineGroup(source, 'group-1', ['a']);
    const endResult = removeScenesFromTimelineGroup(source, 'group-1', ['c']);

    expect(startResult?.items[0]).toEqual({ id: 'timeline-scene-a', type: 'scene', sceneId: 'a' });
    expect(startResult?.items[1]).toMatchObject({ sceneIds: ['missing-start', 'b', 'c', 'missing-end'] });
    expect(endResult?.items.at(-1)).toEqual({ id: 'timeline-scene-c', type: 'scene', sceneId: 'c' });
    expect(endResult?.items[0]).toMatchObject({ sceneIds: ['missing-start', 'a', 'b', 'missing-end'] });
  });

  it('does not mutate Project, bookSequence, or collapsed UI state', () => {
    const source = project([group('group-1', ['a', 'b', 'c', 'd'])]);
    const before = structuredClone(source);
    const collapsedGroupIds = ['unrelated-group'];
    const collapsedBefore = [...collapsedGroupIds];

    removeScenesFromTimelineGroup(source, 'group-1', ['a']);

    expect(source).toEqual(before);
    expect(source.bookSequence).toEqual(before.bookSequence);
    expect(collapsedGroupIds).toEqual(collapsedBefore);
  });
});
