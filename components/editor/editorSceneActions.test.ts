import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { Project, Scene } from '../../types';
import { addSceneToBookSequence, getBoardSequenceColumns, normalizeBookSequence } from '../../src/book-sequence';
import { focusEditorSceneBody, getEditorSceneInsertionAfter } from './editorSceneActions';

const scene = (id: string, position: number, plotlineId = 'plot-a'): Scene =>
  ({ id, position, plotlineId, title: id, content: `Original content for ${id}` });

const project: Project = {
  scenes: [scene('a', 0), scene('b', 1, 'plot-b'), scene('c', 2)],
  chapterMarkers: [{ id: 'first', title: 'Chapter 1', position: 0 }, { id: 'next', title: 'Chapter 2', position: 2 }],
  plotlines: [{ id: 'plot-a', name: 'A', color: '#000000' }, { id: 'plot-b', name: 'B', color: '#ffffff' }],
};

describe('insert one scene after the writing cursor', () => {
  it.each([
    ['middle of chapter and between plotlines', { ...project, bookSequence: normalizeBookSequence(project) }, 'a', ['chapter:first', 'scene:a', 'scene:new', 'scene:b', 'chapter:next', 'scene:c'], 'plot-a'],
    ['end of chapter before the next divider', project, 'b', ['chapter:first', 'scene:a', 'scene:b', 'scene:new', 'chapter:next', 'scene:c'], 'plot-b'],
    ['end of the final chapter', project, 'c', ['chapter:first', 'scene:a', 'scene:b', 'chapter:next', 'scene:c', 'scene:new'], 'plot-a'],
    ['no chapters', { ...project, chapterMarkers: [] }, 'b', ['scene:a', 'scene:b', 'scene:new', 'scene:c'], 'plot-b'],
    ['unchaptered opening', { ...project, chapterMarkers: project.chapterMarkers?.slice(1) }, 'b', ['scene:a', 'scene:b', 'scene:new', 'chapter:next', 'scene:c'], 'plot-b'],
  ] satisfies [string, Project, string, string[], string][])('preserves the existing sequence in %s', (_label, before, current, expected, plotlineId) => {
    const original = structuredClone(before);
    const placement = getEditorSceneInsertionAfter(before, current);
    expect(placement?.plotlineId).toBe(plotlineId);
    if (!placement) throw new Error('No placement');
    const inserted = { ...scene('new', before.scenes.length, placement.plotlineId), content: '' };
    const updates = addSceneToBookSequence(before, inserted, placement.sequenceIndex);
    expect(updates?.bookSequence.map(item => item.id)).toEqual(expected);
    expect(getBoardSequenceColumns({ ...before, ...updates }).map(item => item.id)).toEqual(expected);
    expect(updates?.scenes.filter(item => item.id !== 'new').map(({ id, content }) => ({ id, content })))
      .toEqual(before.scenes.map(({ id, content }) => ({ id, content })));
    expect(updates?.scenes).toHaveLength(before.scenes.length + 1);
    expect(before).toEqual(original);
  });

  it('refuses an unknown scene or a missing plotline', () => {
    expect(getEditorSceneInsertionAfter(project, 'missing')).toBeUndefined();
    expect(getEditorSceneInsertionAfter({ ...project, plotlines: [] }, 'a')).toBeUndefined();
  });

  it('targets only the new scene body for native focus', () => {
    const focus = vi.fn();
    const querySelector = vi.fn(() => ({ focus }));
    const getElementById = vi.fn(() => ({ querySelector }));
    focusEditorSceneBody('new', { getElementById } as unknown as Pick<Document, 'getElementById'>);
    expect(getElementById).toHaveBeenCalledExactlyOnceWith('scene-new');
    expect(querySelector).toHaveBeenCalledExactlyOnceWith('textarea[data-editor-scene-body]');
    expect(focus).toHaveBeenCalledOnce();
  });

  it('keeps bulk creation at the end and focuses single inserts after mounting the editor body', () => {
    const app = readFileSync('App.tsx', 'utf8');
    const editor = readFileSync('components/Editor.tsx', 'utf8');
    const bulk = app.slice(app.indexOf('const handleBulkAdd'), app.indexOf('const addPlotline'));
    expect(bulk).toContain('titles.forEach');
    expect(bulk).toContain('Number.MAX_SAFE_INTEGER');
    const add = editor.slice(editor.indexOf('const handleAddSceneAfter'), editor.indexOf('const scrollToEditorTarget'));
    expect(add).toContain('lastWritingSceneRef.current');
    expect(add).toContain('flushSync');
    expect(add).toContain('handleExpandedScenesChange([...expandedSceneIds, createdSceneId])');
    expect(add.indexOf('focusEditorSceneBody')).toBeGreaterThan(add.indexOf('handleExpandedScenesChange'));
    expect(normalizeBookSequence(project).at(-1)?.id).toBe('scene:c');
  });
});
