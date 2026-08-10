import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { initialTimelineSelectionState, timelineSelectionReducer } from './timeline-selection';

const timelineSource = () => readFileSync('components/board/TimelineBoardView.tsx', 'utf8');

describe('timeline sticky selection controls', () => {
  it('mounts a sticky controls layer directly in the actual Board overflow container', () => {
    const board = readFileSync('components/Board.tsx', 'utf8');
    const timeline = timelineSource();

    expect(board).toContain('ref={boardScrollRef} className="flex-1 overflow-auto');
    expect(board).toContain('data-timeline-controls-layer');
    expect(board).toContain('className="pointer-events-none sticky left-0 right-0 top-4 z-[60]');
    expect(board).toContain('px-4 lg:top-24');
    expect(board.indexOf('data-timeline-controls-layer')).toBeLessThan(board.indexOf('ref={boardRef}'));
    expect(timeline).toContain('data-timeline-selection-toolbar');
    expect(timeline).toContain('selectionControlsHost && createPortal(');
    expect(timeline).toContain('selectionControlsHost');
  });

  it('keeps the controls outside the wide chronological strip', () => {
    const timeline = timelineSource();
    const portalIndex = timeline.indexOf('selectionControlsHost && createPortal(');
    const wideContentIndex = timeline.indexOf('data-timeline-wide-content');
    const itemIndex = timeline.lastIndexOf('data-timeline-point-id={point.key}');

    expect(portalIndex).toBeGreaterThan(-1);
    expect(portalIndex).toBeLessThan(wideContentIndex);
    expect(wideContentIndex).toBeLessThan(itemIndex);
    expect(timeline).toContain('data-timeline-wide-content className="min-w-max');
  });

  it('keeps the normal and active selection controls in the same toolbar', () => {
    const timeline = timelineSource();
    const toolbar = timeline.match(/data-timeline-selection-toolbar[\s\S]*?\{placingSceneId && placingScene/)?.[0] || '';

    expect(toolbar).toContain('בחירת סצנות');
    expect(toolbar).toContain('data-selected-count={selection.selectedSceneIds.size}');
    expect(toolbar).toContain("dispatchSelection({ type: 'clear' })");
    expect(toolbar).toContain("dispatchSelection({ type: 'exit' })");
  });

  it('retains selection counts, clear, and exit behavior without touching Project data', () => {
    const project = {
      timeline: { items: [{ id: 'a', type: 'scene' as const, sceneId: 's1' }] },
      bookSequence: [{ id: 'scene:s1', type: 'scene' as const, sceneId: 's1' }],
    };
    const before = structuredClone(project);
    let state = timelineSelectionReducer(initialTimelineSelectionState(), { type: 'enter' });
    state = timelineSelectionReducer(state, { type: 'toggle', sceneId: 's1' });
    state = timelineSelectionReducer(state, { type: 'toggle', sceneId: 's2' });
    expect(state.selectedSceneIds.size).toBe(2);

    const cleared = timelineSelectionReducer(state, { type: 'clear' });
    expect(cleared.isSelectionMode).toBe(true);
    expect(cleared.selectedSceneIds.size).toBe(0);
    const exited = timelineSelectionReducer(state, { type: 'exit' });
    expect(exited.isSelectionMode).toBe(false);
    expect(exited.selectedSceneIds.size).toBe(0);
    expect(project).toEqual(before);
  });

  it('keeps placement exclusion and Pointer Events multi-reorder unchanged', () => {
    const timeline = timelineSource();

    expect(timeline).toContain('disabled={Boolean(placingSceneId)}');
    expect(timeline).toContain('if (placingSceneId || sameTimeSource || !onTimelineChange) return;');
    expect(timeline).toContain("window.addEventListener('pointermove', handleReorderPointerMove");
    expect(timeline).toContain('commitTimelinePointPointerReorder(');
    expect(timeline).toContain('commitTimelineSingletonPointBlockPointerReorder(');
    expect(timeline).toContain('data-timeline-drop-indicator');
  });

  it('wraps compactly on mobile without becoming part of timeline data', () => {
    const timeline = timelineSource();
    const board = readFileSync('components/Board.tsx', 'utf8');
    const toolbarLine = timeline.match(/data-timeline-selection-toolbar[\s\S]*?className="([^"]+)/)?.[1] || '';

    expect(toolbarLine).toContain('max-w-full');
    expect(toolbarLine).toContain('flex-wrap');
    expect(toolbarLine).toContain('sm:gap-3');
    expect(toolbarLine).toContain('sm:p-2');
    expect(toolbarLine).not.toContain('overflow-x-auto');
    expect(board).toContain('w-full max-w-full justify-end px-4');
    expect(board).toContain('pointer-events-none sticky');
    expect(toolbarLine).toContain('pointer-events-auto');
    expect(timeline).not.toContain('timelineSelectionToolbar:');
  });
});
