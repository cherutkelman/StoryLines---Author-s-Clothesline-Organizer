import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Project } from '../../types';
import Editor from '../Editor';
import EditorToolbar from './EditorToolbar';
import { addChapterFromEditor } from './editorChapterActions';
import { addChapterDividerToBookSequence, getBoardSequenceColumns, getBookSequenceDisplayItems } from '../../src/book-sequence';

const emptyBook = (): Project => ({ scenes: [], plotlines: [], chapterMarkers: [] });
const toolbarProps = (): React.ComponentProps<typeof EditorToolbar> => ({
  textScale: 100, onTextScaleChange: vi.fn(), totalWords: 0, displayMode: 'focus',
  isSearchOpen: false, searchQuery: '', hasActiveScene: false,
  onDisplayModeChange: vi.fn(), onSearchOpenChange: vi.fn(), onSearchQueryChange: vi.fn(),
  onOpenBulkAdd: vi.fn(), onOpenQuestionnaireBridge: vi.fn(), onOpenHistory: vi.fn(), onOpenTips: vi.fn(),
});
const renderEditor = (book: Project, mode: 'full' | 'focus') => renderToStaticMarkup(
  <Editor project={book} bookId="book" user={null} visiblePlotlines={[]} initialDisplayMode={mode}
    onUpdateScene={vi.fn()} onDeleteScene={vi.fn()} onOpenBulkAdd={vi.fn()}
    onAddChapterDivider={vi.fn()} onRenameChapter={vi.fn()} />
);

describe('new chapter in the production editor UI', () => {
  it.each(['full', 'focus'] as const)('keeps the chapter action available in an empty %s editor and displays chapters without scenes', mode => {
    const empty = emptyBook();
    expect(renderEditor(empty, mode)).toContain('aria-label="פרק חדש"');
    const book = { ...empty, ...addChapterDividerToBookSequence(empty, 0, 'new') };
    const html = renderEditor(book, mode);
    expect(html).toContain('value="פרק 1"');
    expect(html).toContain('aria-label="כותרת הפרק"');
    expect(html).not.toContain('<textarea');
    expect(getBoardSequenceColumns(book).map(item => item.id)).toEqual(getBookSequenceDisplayItems(book).map(item => item.id));
    expect(book.scenes).toBe(empty.scenes);
  });

  it('routes a native toolbar button click to the existing creation action once', async () => {
    let book = emptyBook();
    const add = vi.fn((index: number) => { book = { ...book, ...addChapterDividerToBookSequence(book, index, 'new') }; });
    const tree = await EditorToolbar({ ...toolbarProps(), onNewChapter: () => addChapterFromEditor(book, [], add) });
    type Props = { children?: React.ReactNode; 'aria-label'?: string; onClick?: () => void };
    const findButton = (node: React.ReactNode): React.ReactElement<Props> | undefined => {
      for (const child of React.Children.toArray(node)) {
        if (!React.isValidElement<Props>(child)) continue;
        if (child.props['aria-label'] === 'פרק חדש') return child;
        const nested = findButton(child.props.children);
        if (nested) return nested;
      }
    };
    findButton(tree)!.props.onClick!();
    expect(add).toHaveBeenCalledExactlyOnceWith(0);
    expect(book.scenes).toEqual([]);
    expect(book.chapterMarkers).toHaveLength(1);
  });

  it('does not expose the chapter action without the existing App callback', () => {
    const html = renderToStaticMarkup(<EditorToolbar {...toolbarProps()} />);
    expect(html).not.toContain('aria-label="פרק חדש"');
  });

  it('keeps the action visible on mobile and keyboard-accessible', () => {
    const html = renderToStaticMarkup(<EditorToolbar {...toolbarProps()} onNewChapter={vi.fn()} />);
    const button = html.match(/<button[^>]*aria-label="פרק חדש"[^>]*>/)?.[0];
    expect(button).toBeDefined();
    expect(button).toContain('type="button"');
    expect(button).not.toContain('hidden');
    expect(button).not.toContain('disabled');
    expect(button).toContain('min-h-11');
  });

  it('appends after existing markers when a book has no scenes', () => {
    const before: Project = { ...emptyBook(), chapterMarkers: [{ id: 'old', title: 'קודם', position: 0 }] };
    let book = before;
    addChapterFromEditor(book, ['missing'], index => {
      book = { ...book, ...addChapterDividerToBookSequence(book, index, 'new') };
    });
    expect(getBookSequenceDisplayItems(book).map(item => item.id)).toEqual(['chapter:old', 'chapter:new']);
    expect(book.scenes).toBe(before.scenes);
  });
});