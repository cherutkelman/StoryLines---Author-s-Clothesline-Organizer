import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('board architecture', () => {
  it('routes both modes through independent views', () => {
    const board = read('components/Board.tsx');
    expect(board).toContain('<PlotlinesBoardView');
    expect(board).toContain('<ChaptersBoardView');
    expect(board).not.toContain('group/plotline');
    expect(board).not.toContain('chapter.scenes.map');
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
      'components/board/SceneArcMarkers.tsx',
      'components/board/BoardToolbar.tsx',
      'components/board/BoardSummary.tsx',
    ].map(read).join('\n');
    expect(extracted).not.toContain('updateActiveBook');
    expect(extracted).not.toContain('createAutomaticBoardVersionOnExit');
    expect(extracted).not.toContain('boardVersionStorage');
  });

  it('keeps boardViewMode synchronized through the existing App contract', () => {
    const app = read('App.tsx');
    expect(app).toContain('initialViewMode={activeUI.boardViewMode}');
    expect(app).toContain('onViewModeChange={handleBoardViewModeChange}');
    expect(app).toContain('updateBookUiState({ boardViewMode: viewMode })');
  });
});
