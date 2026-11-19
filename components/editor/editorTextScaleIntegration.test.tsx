import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '../../types';
import Editor from '../Editor';
import { EDITOR_TEXT_SCALE_KEY } from './editorTextScale';

const project: Project = {
  scenes: [
    { id: 'one', title: 'כותרת סצנה א', content: 'גוף בעברית', plotlineId: 'p', position: 0 },
    { id: 'two', title: 'כותרת סצנה ב', content: 'גוף נוסף', plotlineId: 'p', position: 1 },
  ],
  plotlines: [{ id: 'p', name: 'עלילה', color: '#123456' }],
  chapterMarkers: [{ id: 'chapter', title: 'כותרת פרק', position: 0 }],
};
afterEach(() => vi.unstubAllGlobals());

describe('production editor text-scale integration', () => {
  it.each(['full', 'focus'] as const)('loads one preference for all scene bodies in %s, without scaling headings or writing content', mode => {
    const getItem = vi.fn((key: string) => key === EDITOR_TEXT_SCALE_KEY ? '170' : null);
    vi.stubGlobal('window', { localStorage: { getItem } });
    const onUpdateScene = vi.fn();
    const html = renderToStaticMarkup(<Editor project={project} bookId="book" user={null} visiblePlotlines={['p']}
      onUpdateScene={onUpdateScene} onDeleteScene={vi.fn()} onOpenBulkAdd={vi.fn()}
      initialDisplayMode={mode} initialExpandedSceneIds={['one', 'two']} />);
    const textareas = html.match(/<textarea\b[^>]*>/g) ?? [];
    expect(textareas).toHaveLength(2);
    textareas.forEach(textarea => expect(textarea).toContain('font-size:1.9125rem'));
    expect(html.match(/font-size:/g)).toHaveLength(2);
    expect(html).toContain('כותרת סצנה א');
    expect(html).toContain('כותרת פרק');
    expect(html).toContain('גוף בעברית');
    expect(html).toContain('dir="rtl"');
    expect(html).not.toContain('aria-label="גודל הטקסט הנוכחי"');
    expect(getItem).toHaveBeenCalledWith(EDITOR_TEXT_SCALE_KEY);
    expect(onUpdateScene).not.toHaveBeenCalled();
  });
});
