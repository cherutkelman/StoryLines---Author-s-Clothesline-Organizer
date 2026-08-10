import { describe, expect, it } from 'vitest';
import { toggleTimelineCollapsedGroupId } from './timeline-collapse';

describe('timeline collapse UI state', () => {
  it('collapses a group that is open by default', () => {
    expect(toggleTimelineCollapsedGroupId([], 'group-1')).toEqual(['group-1']);
  });

  it('opens a collapsed group again', () => {
    expect(toggleTimelineCollapsedGroupId(['group-1'], 'group-1')).toEqual([]);
  });

  it('preserves unrelated and stale group ids safely', () => {
    expect(toggleTimelineCollapsedGroupId(['stale-group'], 'group-1')).toEqual([
      'stale-group',
      'group-1',
    ]);
  });

  it('does not mutate the stored UI state array', () => {
    const collapsedIds = ['group-1'];
    const before = [...collapsedIds];

    toggleTimelineCollapsedGroupId(collapsedIds, 'group-2');

    expect(collapsedIds).toEqual(before);
  });
});
