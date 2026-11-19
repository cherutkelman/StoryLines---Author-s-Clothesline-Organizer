import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CopySceneVersionTextButton, { copySceneVersionText } from '../components/CopySceneVersionTextButton';

describe('scene version clipboard', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('copies the full original text without changing its whitespace or adding metadata', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const version = { title: 'Scene title', createdAt: 10, id: 'v1', content: '  פתיחה\r\n\r\nפסקה\nסוף  \t' };

    expect(await copySceneVersionText(version.content)).toBe('copied');
    expect(writeText).toHaveBeenCalledExactlyOnceWith(version.content);
  });

  it.each(['', undefined, null, 123])('disables copying for empty or invalid content (%s)', async content => {
    const writeText = vi.fn();
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    expect(await copySceneVersionText(content)).toBe('no-text');
    expect(writeText).not.toHaveBeenCalled();
    expect(renderToStaticMarkup(createElement(CopySceneVersionTextButton, { content }))).toContain('disabled=""');
  });

  it('reports denied or unavailable clipboard access as a failure', async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await copySceneVersionText('Historical text')).toBe('failed');

    vi.stubGlobal('navigator', {});
    expect(await copySceneVersionText('Historical text')).toBe('failed');
  });

  it('copies each selected version in turn without modifying the book or versions', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const scene = Object.freeze({ id: 'scene', content: 'Current scene text' });
    const book = Object.freeze({ scenes: Object.freeze([scene]), pendingSync: false });
    const first = Object.freeze({ id: 'first', content: 'First historical version' });
    const second = Object.freeze({ id: 'second', content: 'Second historical version' });
    const before = structuredClone(book);

    await copySceneVersionText(first.content);
    await copySceneVersionText(second.content);

    expect(writeText.mock.calls).toEqual([[first.content], [second.content]]);
    expect(book).toEqual(before);
  });
});
