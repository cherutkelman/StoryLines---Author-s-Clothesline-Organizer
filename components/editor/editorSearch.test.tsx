import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Project } from '../../types';
import { getBookSequenceDisplayItems } from '../../src/book-sequence';
import Editor from '../Editor';
import EditorSceneList from './EditorSceneList';
import EditorSearchHighlights from './EditorSearchHighlights';
import { findSceneSearchMatches, nextSearchMatchIndex, normalizeSearchText } from './editorSearch';

const project: Project = {
  plotlines: [{ id: 'p', name: 'עלילה', color: '#123456' }],
  chapterMarkers: [{ id: 'first', title: 'פרק ראשון', position: 0 }],
  scenes: [
    { id: 'a', plotlineId: 'p', position: 0, title: 'התחלה', content: 'שלום עולם! שלום\r\nעולם?' },
    { id: 'b', plotlineId: 'p', position: 1, title: 'שלום בכותרת בלבד', content: 'סצנה בלי התאמה' },
    { id: 'c', plotlineId: 'p', position: 2, title: 'סוף', content: 'שלום עולם.' },
  ],
};

describe('editor find in text', () => {
  it('finds all occurrences in sequence order, including Hebrew phrases across newlines', () => {
    const { matches, byScene } = findSceneSearchMatches(project.scenes, 'שלום עולם');
    expect(matches.map(match => match.sceneId)).toEqual(['a', 'a', 'c']);
    expect(byScene.has('b')).toBe(false);
    const text = normalizeSearchText(project.scenes[0].content);
    expect(byScene.get('a')?.map(match => text.slice(match.start, match.end))).toEqual(['שלום עולם', 'שלום\nעולם']);
    expect(findSceneSearchMatches([project.scenes[0]], 'עולם?').matches).toHaveLength(1);
    expect(findSceneSearchMatches(project.scenes, 'לא נמצא פה').matches).toEqual([]);
  });

  it('matches literal punctuation and recomputes against draft edits', () => {
    const before = [{ id: 'a', content: 'Hello (world). hello world' }];
    const draft = [{ id: 'a', content: 'new: HELLO (WORLD). hello (world).' }];
    expect(findSceneSearchMatches(before, 'hello (world).').matches).toHaveLength(1);
    expect(findSceneSearchMatches(draft, 'hello (world).').matches.map(match => match.start)).toEqual([5, 20]);
    expect(findSceneSearchMatches(draft, '').matches).toEqual([]);
  });

  it('moves forward and backward across scenes and wraps at both ends', () => {
    const { matches } = findSceneSearchMatches(project.scenes, 'שלום עולם');
    let index: number | undefined;
    const sceneIds = [1, 1, 1, 1, -1].map(step => {
      index = nextSearchMatchIndex(index, matches.length, step as -1 | 1);
      return index === undefined ? undefined : matches[index].sceneId;
    });
    expect(sceneIds).toEqual(['a', 'a', 'c', 'a', 'c']);
    expect(nextSearchMatchIndex(undefined, matches.length, -1)).toBe(2);
    expect(nextSearchMatchIndex(undefined, 0, 1)).toBeUndefined();
  });

  it('keeps all scenes and chapter dividers in order and does not change or save book data', () => {
    const book = structuredClone(project);
    const onUpdateScene = vi.fn();
    const onFocusScene = vi.fn();
    const onExpandedScenesChange = vi.fn();
    const onCreateManualSceneVersion = vi.fn();
    const render = (query: string) => renderToStaticMarkup(
      <Editor project={book} bookId="test" user={null} visiblePlotlines={['p']}
        initialDisplayMode="full" externalSearchQuery={query}
        onUpdateScene={onUpdateScene} onFocusScene={onFocusScene}
        onExpandedScenesChange={onExpandedScenesChange}
        onCreateManualSceneVersion={onCreateManualSceneVersion}
        onDeleteScene={vi.fn()} onOpenBulkAdd={vi.fn()} />,
    );
    for (const query of ['שלום עולם', 'לא נמצא פה', '']) {
      const html = render(query);
      expect([...html.matchAll(/<(?:article|div) id="((?:scene|chapter)-[^"]+)"/g)].map(match => match[1]))
        .toEqual(['chapter-first', 'scene-a', 'scene-b', 'scene-c']);
      expect(html.match(/<textarea\b/g)).toHaveLength(3);
      expect(html.includes('<mark')).toBe(query === 'שלום עולם');
      expect(html).toMatch(/<textarea[^>]*>סצנה בלי התאמה<\/textarea>/);
    }
    for (const callback of [onUpdateScene, onFocusScene, onExpandedScenesChange, onCreateManualSceneVersion]) {
      expect(callback).not.toHaveBeenCalled();
    }
    expect(book).toEqual(project);
  });

  it('opens only the navigated collapsed scene for display and restores the previous expansion on clear', () => {
    const onSelectScene = vi.fn();
    const render = (searchExpandedSceneId?: string) => renderToStaticMarkup(
      <EditorSceneList items={getBookSequenceDisplayItems(project)} plotlines={project.plotlines}
        displayMode="focus" expandedSceneIds={['b']} searchExpandedSceneId={searchExpandedSceneId}
        onSelectScene={onSelectScene} renderExpandedScene={scene => <textarea defaultValue={scene.content} />} />,
    );
    expect(render()).not.toContain('<textarea>שלום עולם');
    expect(render('c')).toContain('<textarea>שלום עולם.</textarea>');
    expect(render('c')).not.toContain('<textarea>שלום עולם!');
    expect(render()).toMatch(/<textarea>סצנה בלי התאמה<\/textarea>/);
    expect(onSelectScene).not.toHaveBeenCalled();
  });

  it('marks the active match in a separate non-editable layer and keeps the native textarea value', () => {
    const content = 'שלום שלום';
    const { matches } = findSceneSearchMatches([{ id: 'a', content }], 'שלום');
    const html = renderToStaticMarkup(
      <>
        <EditorSearchHighlights content={content} ranges={matches} activeStart={matches[1].start} fontSize="1rem" />
        <textarea defaultValue={content} />
      </>,
    );
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('<mark>שלום</mark> <mark data-editor-active-match="true">שלום</mark>');
    expect(html).toContain('<textarea>שלום שלום</textarea>');
    expect(html).not.toMatch(/contenteditable|tabindex/i);
  });
});
