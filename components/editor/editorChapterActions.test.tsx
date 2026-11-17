import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Project, Scene } from '../../types';
import {
  addChapterDividerToBookSequence, getBoardSequenceColumns, getBookSequenceDisplayItems,
  getOrderedSceneIds, moveChapterDividerInBookSequence, renameChapterInBookSequence,
} from '../../src/book-sequence';
import { buildBoardChapters } from '../board/boardHelpers';
import EditorSceneList from './EditorSceneList';
import { addChapterFromEditor } from './editorChapterActions';

const scene = (id: string, position: number): Scene => ({
  id, position, title: id, content: `תוכן ${id}`, plotlineId: 'p1',
});
const project = (): Project => ({
  scenes: [scene('first', 0), scene('current', 1), scene('last', 2)],
  plotlines: [{ id: 'p1', name: 'עלילה', color: '#123456' }],
  chapterMarkers: [{ id: 'old', title: 'פרק קיים', position: 0 }],
  bookSequence: [
    { id: 'chapter:old', type: 'chapter-divider', chapterId: 'old' },
    { id: 'scene:first', type: 'scene', sceneId: 'first' },
    { id: 'scene:current', type: 'scene', sceneId: 'current' },
    { id: 'scene:last', type: 'scene', sceneId: 'last' },
  ],
});
const listProps = (book: Project) => ({
  items: getBookSequenceDisplayItems(book), plotlines: book.plotlines,
  displayMode: 'focus' as const, expandedSceneIds: ['current'],
  onSelectScene: vi.fn(), renderExpandedScene: () => <p>גוף סצנה</p>,
});

describe('chapter creation from editor through the existing board action', () => {
  it('inserts a standalone marker before the working scene and displays it in both sequences', () => {
    const before = project();
    let book = before;
    const add = vi.fn((index: number) => {
      book = { ...book, ...addChapterDividerToBookSequence(book, index, 'new') };
    });
    addChapterFromEditor(book, ['current', 'last'], add);
    expect(add).toHaveBeenCalledExactlyOnceWith(2);
    expect(book.bookSequence?.map(item => item.id)).toEqual([
      'chapter:old', 'scene:first', 'chapter:new', 'scene:current', 'scene:last',
    ]);
    expect(getBookSequenceDisplayItems(book).map(item => item.id)).toEqual(getBoardSequenceColumns(book).map(item => item.id));
    expect(buildBoardChapters(book, ['p1']).map(item => item.title)).toContain('פרק 2');
    expect(renderToStaticMarkup(<EditorSceneList {...listProps(book)} />)).toContain('value="פרק 2"');
    expect(book.scenes).toBe(before.scenes);
    expect(getOrderedSceneIds(book)).toEqual(getOrderedSceneIds(before));
    expect(book.scenes.map(item => item.position)).toEqual([0, 1, 2]);
    expect(book.chapterMarkers?.find(item => item.id === 'new')?.position).toBe(1);
  });

  it('falls back to displayed/recent scene if the first work target no longer exists', () => {
    const add = vi.fn();
    addChapterFromEditor(project(), ['deleted', null, 'last'], add);
    expect(add).toHaveBeenCalledExactlyOnceWith(3);
  });

  it('uses the trailing board slot without a working scene, including an empty book', () => {
    const add = vi.fn();
    addChapterFromEditor(project(), [], add);
    expect(add).toHaveBeenLastCalledWith(4);
    const empty: Project = { scenes: [], plotlines: [], chapterMarkers: [] };
    let created = empty;
    addChapterFromEditor(empty, [null], index => {
      created = { ...empty, ...addChapterDividerToBookSequence(empty, index, 'new') };
    });
    expect(created.scenes).toEqual([]);
    expect(getBoardSequenceColumns(created).map(item => item.type)).toEqual(['chapter-divider']);
    expect(created.chapterMarkers?.[0].title).toBe('פרק 1');
  });

  it('supports legacy books without chapters or bookSequence', () => {
    const legacy: Project = { scenes: [scene('last', 1), scene('first', 0)], plotlines: [] };
    let created = legacy;
    addChapterFromEditor(legacy, ['last'], index => {
      created = { ...legacy, ...addChapterDividerToBookSequence(legacy, index, 'new') };
    });
    expect(created.bookSequence?.map(item => item.id)).toEqual(['scene:first', 'chapter:new', 'scene:last']);
    expect(created.scenes).toBe(legacy.scenes);
  });

  it('allows independent movement through the existing board action without reordering scenes', () => {
    const book = project();
    const moved = { ...book, ...moveChapterDividerInBookSequence(book, 'old', 3) };
    expect(moved.bookSequence?.map(item => item.id)).toEqual(['scene:first', 'scene:current', 'chapter:old', 'scene:last']);
    expect(getOrderedSceneIds(moved)).toEqual(getOrderedSceneIds(book));
    expect(moved.scenes).toBe(book.scenes);
  });

  it('does not request a write when the existing App action is absent', () => {
    expect(() => addChapterFromEditor(project(), ['current'])).not.toThrow();
  });
});

describe('editor chapter title', () => {
  it('renames through the existing action without changing scene expansion, content or order', async () => {
    let book = project();
    const originalScenes = book.scenes;
    const props = listProps(book);
    const rename = vi.fn((id: string, title: string) => {
      book = { ...book, ...renameChapterInBookSequence(book, id, title) };
    });
    const tree = await EditorSceneList({ ...props, onRenameChapter: rename });
    type InputProps = { children?: React.ReactNode; 'aria-label'?: string; onChange?: React.ChangeEventHandler<HTMLInputElement> };
    const findInput = (node: React.ReactNode): React.ReactElement<InputProps> | undefined => {
      for (const child of React.Children.toArray(node)) {
        if (!React.isValidElement<InputProps>(child)) continue;
        if (child.props['aria-label'] === 'כותרת הפרק') return child;
        const nested = findInput(child.props.children);
        if (nested) return nested;
      }
    };
    findInput(tree)!.props.onChange!({ target: { value: 'כותרת חדשה בעברית' } } as React.ChangeEvent<HTMLInputElement>);
    expect(rename).toHaveBeenCalledExactlyOnceWith('old', 'כותרת חדשה בעברית');
    expect(props.onSelectScene).not.toHaveBeenCalled();
    expect(props.expandedSceneIds).toEqual(['current']);
    expect(book.scenes).toBe(originalScenes);
    expect(getBoardSequenceColumns(book)[0]).toMatchObject({ type: 'chapter-divider', chapterMarker: { title: 'כותרת חדשה בעברית' } });
    expect(renderToStaticMarkup(<EditorSceneList {...listProps(book)} onRenameChapter={rename} />)).toContain('value="כותרת חדשה בעברית"');
  });

  it('renders RTL titles as read-only when no authorized rename callback is supplied', () => {
    const html = renderToStaticMarkup(<EditorSceneList {...listProps(project())} />);
    expect(html).toMatch(/aria-label="כותרת הפרק" dir="rtl" readOnly=""/);
  });

  it('wires the editor to the same App callbacks as the board, without a new persistence path', () => {
    const app = readFileSync('App.tsx', 'utf8');
    expect(app.match(/onAddChapterDivider=\{addChapterDivider\}/g)).toHaveLength(2);
    expect(app.match(/onRenameChapter=\{renameChapter\}/g)).toHaveLength(2);
    const editor = readFileSync('components/Editor.tsx', 'utf8');
    expect(editor).toContain('onNewChapter={onAddChapterDivider ?');
    expect(editor).toContain('onRenameChapter={onRenameChapter}');
  });
});

// Exercise the production textarea-based UI, including the formerly early-returned empty state.