import { describe, expect, it } from 'vitest';
import type { Project } from '../types';
import {
  initialTimelineSelectionState,
  timelineSelectionReducer,
} from './timeline-selection';

const enterSelectionMode = () => timelineSelectionReducer(
  initialTimelineSelectionState(),
  { type: 'enter' }
);

describe('timeline selection', () => {
  it('enters scene selection mode with an empty selection', () => {
    const state = enterSelectionMode();

    expect(state.isSelectionMode).toBe(true);
    expect([...state.selectedSceneIds]).toEqual([]);
  });

  it('selects one scene', () => {
    const state = timelineSelectionReducer(enterSelectionMode(), {
      type: 'toggle',
      sceneId: 's1',
    });

    expect([...state.selectedSceneIds]).toEqual(['s1']);
  });

  it('selects multiple scenes without a selection limit', () => {
    const first = timelineSelectionReducer(enterSelectionMode(), { type: 'toggle', sceneId: 's1' });
    const second = timelineSelectionReducer(first, { type: 'toggle', sceneId: 's2' });
    const third = timelineSelectionReducer(second, { type: 'toggle', sceneId: 's3' });

    expect(second.selectedSceneIds.size).toBe(2);
    expect([...third.selectedSceneIds]).toEqual(['s1', 's2', 's3']);
  });

  it('deselects a selected scene when it is toggled again', () => {
    const selected = timelineSelectionReducer(enterSelectionMode(), { type: 'toggle', sceneId: 's1' });
    const deselected = timelineSelectionReducer(selected, { type: 'toggle', sceneId: 's1' });

    expect(deselected.selectedSceneIds.size).toBe(0);
  });

  it('clears selected scenes while keeping selection mode active', () => {
    const selected = timelineSelectionReducer(enterSelectionMode(), { type: 'toggle', sceneId: 's1' });
    const cleared = timelineSelectionReducer(selected, { type: 'clear' });

    expect(cleared.isSelectionMode).toBe(true);
    expect(cleared.selectedSceneIds.size).toBe(0);
  });

  it('exits selection mode and clears selected scenes', () => {
    const selected = timelineSelectionReducer(enterSelectionMode(), { type: 'toggle', sceneId: 's1' });
    const exited = timelineSelectionReducer(selected, { type: 'exit' });

    expect(exited.isSelectionMode).toBe(false);
    expect(exited.selectedSceneIds.size).toBe(0);
  });

  it('uses the same sceneId selection for scenes inside groups', () => {
    const source: Project = {
      plotlines: [],
      scenes: [{ id: 'grouped-scene', plotlineId: 'p1', title: 'Grouped', content: '', position: 0 }],
      timeline: {
        items: [{ id: 'group', type: 'group', title: 'Past', sceneIds: ['grouped-scene'] }],
      },
    };
    const groupedSceneId = source.timeline?.items[0].type === 'group'
      ? source.timeline.items[0].sceneIds[0]
      : '';
    const state = timelineSelectionReducer(enterSelectionMode(), {
      type: 'toggle',
      sceneId: groupedSceneId,
    });

    expect(state.selectedSceneIds.has('grouped-scene')).toBe(true);
  });

  it('does not mutate Project or timeline data during selection changes', () => {
    const source: Project = {
      plotlines: [],
      scenes: [{ id: 's1', plotlineId: 'p1', title: 'Scene', content: '', position: 0 }],
      timeline: { items: [{ id: 'item-s1', type: 'scene', sceneId: 's1' }] },
    };
    const before = structuredClone(source);

    const selected = timelineSelectionReducer(enterSelectionMode(), { type: 'toggle', sceneId: 's1' });
    timelineSelectionReducer(selected, { type: 'clear' });
    timelineSelectionReducer(selected, { type: 'exit' });

    expect(source).toEqual(before);
  });
});
