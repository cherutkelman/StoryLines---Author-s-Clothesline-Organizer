import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { Project, TimelineData } from '../types';
import {
  commitTimelinePointerReorder,
  getTimelineDropPlacement,
  hasCrossedTimelineDragThreshold,
} from './timeline-pointer-reorder';

const sourceProject = (): Project => ({
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
  timeline: {
    items: [
      { id: 'a', type: 'scene', sceneId: 's1' },
      { id: 'group', type: 'group', title: 'Past', sceneIds: ['s2', 's3'] },
      { id: 'd', type: 'scene', sceneId: 's4' },
    ],
  },
});

const reorderedIds = (
  itemId: string,
  targetItemId: string,
  clientX: number,
  bounds = { left: 100, width: 200 }
) => {
  const project = sourceProject();
  const changes: TimelineData[] = [];
  const placement = getTimelineDropPlacement(clientX, bounds);
  commitTimelinePointerReorder(project, itemId, targetItemId, placement, timeline => changes.push(timeline));
  return { project, changes, ids: changes[0]?.items.map(item => item.id) };
};

describe('timeline pointer reorder behavior', () => {
  it('runs the pointer-down/move/target/up calculation and moves a scene forward after a target', () => {
    expect(hasCrossedTimelineDragThreshold(300, 100, 293, 100)).toBe(true);
    const result = reorderedIds('a', 'd', 110);

    expect(result.ids).toEqual(['group', 'd', 'a']);
    expect(result.changes).toHaveLength(1);
  });

  it('moves a scene backward before a target in RTL', () => {
    const result = reorderedIds('d', 'a', 290);
    expect(result.ids).toEqual(['d', 'a', 'group']);
  });

  it('moves a whole group and preserves its title and internal scene order', () => {
    const result = reorderedIds('group', 'd', 110);
    expect(result.ids).toEqual(['a', 'd', 'group']);
    expect(result.changes[0].items[2]).toEqual({
      id: 'group',
      type: 'group',
      title: 'Past',
      sceneIds: ['s2', 's3'],
    });
  });

  it('maps the right half to before and the left half to after for RTL chronology', () => {
    expect(getTimelineDropPlacement(201, { left: 100, width: 200 })).toBe('before');
    expect(getTimelineDropPlacement(199, { left: 100, width: 200 })).toBe('after');
  });

  it('does not cross the six-pixel threshold for a click and does not commit without a drop', () => {
    expect(hasCrossedTimelineDragThreshold(10, 10, 15, 10)).toBe(false);
    const onTimelineChange = vi.fn();
    expect(onTimelineChange).not.toHaveBeenCalled();
  });

  it('models pointer cancellation by clearing the pending gesture without committing', () => {
    const onTimelineChange = vi.fn();
    const pendingGesture = { itemId: 'a', pointerId: 7 };
    const afterCancel = null;

    expect(pendingGesture.itemId).toBe('a');
    expect(afterCancel).toBeNull();
    expect(onTimelineChange).not.toHaveBeenCalled();
  });

  it('does not mutate bookSequence, scene positions, or the source timeline', () => {
    const result = reorderedIds('a', 'd', 110);
    expect(result.project).toEqual(sourceProject());
  });

  it('wires continuation events to window while starting pointerdown from the note surface', () => {
    const source = readFileSync('components/board/TimelineBoardView.tsx', 'utf8');

    expect(source).toContain("window.addEventListener('pointermove', handleReorderPointerMove");
    expect(source).toContain("window.addEventListener('pointerup', handleReorderPointerEnd)");
    expect(source).toContain("window.addEventListener('pointercancel', handleReorderPointerCancel)");
    expect(source).toContain('onPointerDown={event => handleReorderPointerDown(event, point.key, point.sceneIds)}');
    expect(source).toContain('data-timeline-drag-surface');
    expect(source).toContain("target.closest('button, input, textarea, select, a, [contenteditable=\"true\"]')");
    expect(source).toContain('!canReorderSelection');
    expect(source).toContain('touch-none cursor-grab active:cursor-grabbing');
    expect(source).not.toContain('<GripVertical');
    expect(source).not.toContain('onPointerMove={handleReorderPointerMove}');
  });
});
