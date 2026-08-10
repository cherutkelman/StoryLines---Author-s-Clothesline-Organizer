import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('board architecture', () => {
  it('routes all three modes through independent views', () => {
    const board = read('components/Board.tsx');
    expect(board).toContain('<PlotlinesBoardView');
    expect(board).toContain('<ChaptersBoardView');
    expect(board).toContain('<TimelineBoardView');
    expect(board).toContain("case 'plotlines':");
    expect(board).toContain("case 'chapters':");
    expect(board).toContain("case 'timeline':");
    expect(board).not.toContain("viewMode === 'plotlines' ?");
    expect(board).not.toContain('group/plotline');
    expect(board).not.toContain('chapter.scenes.map');
  });

  it('exposes timeline in the shared view type and desktop and mobile navigation', () => {
    const types = read('types.ts');
    const toolbar = read('components/board/BoardToolbar.tsx');
    const app = read('App.tsx');

    expect(types).toContain("export type BoardViewMode = 'plotlines' | 'chapters' | 'timeline'");
    expect(toolbar).toContain("onViewModeChange('timeline')");
    expect(toolbar).toContain("viewMode === 'timeline'");
    expect(app).toContain("{ id: 'timeline', icon: Clock3");
  });

  it('keeps public types and pure chapter helpers outside the coordinator', () => {
    const board = read('components/Board.tsx');
    const types = read('components/board/boardTypes.ts');
    const helpers = read('components/board/boardHelpers.ts');
    expect(board).not.toContain('interface BoardProps');
    expect(types).toContain('export interface BoardProps');
    expect(helpers).toContain('export const buildBoardChapters');
  });

  it('keeps drag handlers and the shared drag ref in the coordinator', () => {
    const board = read('components/Board.tsx');
    expect(board).toContain("const dragItem = useRef");
    expect(board).toContain('handleSceneSequenceDrop');
    expect(board).toContain('handleChapterDividerDrop');
    expect(read('components/board/PlotlinesBoardView.tsx')).toContain('draggable={!isPreviewMode}');
  });

  it('does not introduce persistence or history mechanisms in extracted views', () => {
    const extracted = [
      'components/board/PlotlinesBoardView.tsx',
      'components/board/ChaptersBoardView.tsx',
      'components/board/TimelineBoardView.tsx',
      'components/board/SceneArcMarkers.tsx',
      'components/board/BoardToolbar.tsx',
      'components/board/BoardSummary.tsx',
    ].map(read).join('\n');
    expect(extracted).not.toContain('updateActiveBook');
    expect(extracted).not.toContain('createAutomaticBoardVersionOnExit');
    expect(extracted).not.toContain('boardVersionStorage');
  });

  it('keeps timeline ordering isolated from the existing plotlines and chapters views', () => {
    const timeline = read('components/board/TimelineBoardView.tsx');
    const existingViews = [
      read('components/board/PlotlinesBoardView.tsx'),
      read('components/board/ChaptersBoardView.tsx'),
    ].join('\n');

    expect(timeline).toContain('getEffectiveTimelineItems(project)');
    expect(timeline).toContain('selectedSceneIds.has(scene.id)');
    expect(timeline).toContain('onToggleSelection={sceneId');
    expect(timeline).toContain('createTimelineGroup(');
    expect(timeline).toContain('onTimelineChange(timeline)');
    expect(timeline).toContain("dispatchSelection({ type: 'exit' })");
    expect(timeline).toContain('commitTimelinePointPointerReorder(');
    expect(timeline).toContain('commitTimelineSingletonPointBlockPointerReorder(');
    expect(timeline).toContain('onPointerDown=');
    expect(timeline).toContain("window.addEventListener('pointermove', handleReorderPointerMove");
    expect(timeline).toContain("window.addEventListener('pointerup', handleReorderPointerEnd)");
    expect(timeline).toContain("window.addEventListener('pointercancel', handleReorderPointerCancel)");
    expect(timeline).toContain('touch-none');
    expect(timeline).toContain('selection.selectedSceneIds.size >= 2');
    expect(timeline).toContain('data-timeline-drop-indicator');
    expect(timeline).toContain('ungroupTimelineGroup(project, pendingUngroupGroupId)');
    expect(timeline).toContain('renameTimelineGroup(project, pendingRenameGroupId, renameGroupTitle)');
    expect(timeline).toContain('setRenameGroupTitle(currentTitle)');
    expect(timeline).toContain('if (timeline) onTimelineChange(timeline)');
    expect(timeline).toContain('closeRenameGroupDialog();');
    expect(timeline).toContain('setPendingUngroupGroupId(null)');
    expect(timeline).not.toContain('window.confirm');
    expect(timeline).toContain('getUnplacedTimelineScenes(project)');
    expect(timeline).toContain('isSelectionMode={false}');
    expect(timeline).toContain('data-unplaced-timeline-scenes');
    expect(timeline).not.toContain('onTimelineChange({ items: unplacedScenes');
    expect(timeline).toContain('const [placingSceneId, setPlacingSceneId] = useState<string | null>(null)');
    expect(timeline).toContain('placeSceneInTimeline(project, placingSceneId, targetIndex)');
    expect(timeline).toContain('data-timeline-placement-index');
    expect(timeline).toContain('setPlacingSceneId(null)');
    expect(timeline).toContain("dispatchSelection({ type: 'exit' })");
    expect(timeline).toContain('disabled={Boolean(placingSceneId)}');
    expect(timeline).toContain('selection.selectedSceneIds.has(point.sceneIds[0])');
    expect(timeline).toContain('toggleTimelineCollapsedGroupId(collapsedGroupIds, item.id)');
    expect(timeline).toContain('onCollapsedGroupIdsChange(');
    expect(timeline).toContain('touch-manipulation');
    expect(timeline).toContain('updateScene(sceneId, { timeLabel })');
    expect(timeline).toContain('readOnly={isSelectionMode || !onUpdateTimeLabel}');
    expect(timeline).toContain('normalizeSceneTimeLabel(event.currentTarget.value)');
    expect(timeline).not.toContain('timeline.items.sort');
    const timelineTypes = read('types.ts').match(/export interface TimelineSceneItem[\s\S]*?\n}/)?.[0] || '';
    expect(timelineTypes).not.toContain('timeLabel');
    expect(timeline).toContain('getEligibleTimelineGroupTargets(project, selection.selectedSceneIds)');
    expect(timeline).toContain('addScenesToTimelineGroup(');
    expect(timeline).toContain("dispatchSelection({ type: 'exit' })");
    expect(timeline).not.toContain('onTimelineCollapsedGroupIdsChange(');
    expect(timeline).toContain('validateTimelineGroupSceneRemoval(project, selection.selectedSceneIds)');
    expect(timeline).toContain('removeScenesFromTimelineGroup(');
    expect(timeline).toContain('closeRemoveFromGroupDialog();');
    expect(timeline).not.toContain('window.confirm');
    expect(timeline).not.toContain('draggable=');
    expect(timeline).not.toContain('normalizeBookSequence');
    expect(timeline).not.toContain('bookSequence');
    expect(existingViews).not.toContain('getEffectiveTimelineItems');
  });

  it('keeps boardViewMode synchronized through the existing App contract', () => {
    const app = read('App.tsx');
    expect(app).toContain('initialViewMode={activeUI.boardViewMode}');
    expect(app).toContain('onViewModeChange={handleBoardViewModeChange}');
    expect(app).toContain('updateBookUiState({ boardViewMode: viewMode })');
  });

  it('routes timeline persistence through Board and the existing App book update', () => {
    const board = read('components/Board.tsx');
    const boardTypes = read('components/board/boardTypes.ts');
    const app = read('App.tsx');

    expect(boardTypes).toContain('onTimelineChange?: (timeline: TimelineData) => void');
    expect(board).toContain('onTimelineChange={isPreviewMode ? undefined : onTimelineChange}');
    expect(app).toContain('onTimelineChange={(timeline) => updateActiveBook({ timeline })}');
  });

  it('routes collapsed groups through BookUIState without changing timeline data or history', () => {
    const types = read('types.ts');
    const board = read('components/Board.tsx');
    const boardTypes = read('components/board/boardTypes.ts');
    const app = read('App.tsx');

    expect(types).toContain('timelineCollapsedGroupIds?: string[]');
    expect(boardTypes).toContain('onTimelineCollapsedGroupIdsChange?: (groupIds: string[]) => void');
    expect(board).toContain('onCollapsedGroupIdsChange={onTimelineCollapsedGroupIdsChange}');
    expect(app).toContain('timelineCollapsedGroupIds={activeUI.timelineCollapsedGroupIds}');
    expect(app).toContain('updateBookUiState({ timelineCollapsedGroupIds: groupIds })');
    expect(app).not.toContain('updateActiveBook({ timelineCollapsedGroupIds');
  });

  it('keeps placement entry and cancellation local until an insertion point is chosen', () => {
    const timeline = read('components/board/TimelineBoardView.tsx');
    const startPlacement = timeline.match(/const startPlacingScene = \(sceneId: string\) => \{([\s\S]*?)\n  \};/)?.[1] || '';

    expect(startPlacement).toContain('setPlacingSceneId(sceneId)');
    expect(startPlacement).not.toContain('onTimelineChange');
    expect(timeline).toContain('onClick={() => setPlacingSceneId(null)}');
    expect(timeline).toContain('if (timeline)');
    expect(timeline).toContain('onTimelineChange(timeline)');
  });
});
