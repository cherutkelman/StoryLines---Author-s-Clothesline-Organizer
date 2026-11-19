import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EditorSceneList, { shouldOpenSceneFromArticle } from './EditorSceneList';
import type { Scene } from '../../types';

const scene: Scene = { id: 'long', title: 'סצנה ארוכה', content: 'טקסט בעברית '.repeat(3000), plotlineId: 'p', position: 0 };
const props = () => ({
  items: [{ id: 'scene:long', type: 'scene' as const, scene }], plotlines: [],
  displayMode: 'focus' as const, expandedSceneIds: ['long'], onSelectScene: vi.fn(),
  renderExpandedScene: (_scene: Scene, _plotline: unknown, control: React.ReactNode) => <><header>{control}</header><textarea defaultValue={scene.content} /></>,
});

type ElementProps = { children?: React.ReactNode; onClick?: (event: { target?: unknown; stopPropagation: () => void }) => void; className?: string; 'aria-label'?: string };
function findElement(node: React.ReactNode, test: (element: React.ReactElement<ElementProps>) => boolean): React.ReactElement<ElementProps> | undefined {
  for (const child of React.Children.toArray(node)) {
    if (!React.isValidElement<ElementProps>(child)) continue;
    if (test(child)) return child;
    const nested = findElement(child.props.children, test);
    if (nested) return nested;
  }
}
class PointerTarget {
  constructor(private readonly interactive: boolean) {}
  closest() { return this.interactive ? this : null; }
}
afterEach(() => vi.unstubAllGlobals());

describe('scene pointer and collapse regression', () => {
  it.each([true, false])('does not toggle an expanded scene when clicking text or whitespace (interactive=%s)', async interactive => {
    vi.stubGlobal('HTMLElement', PointerTarget);
    const p = props();
    const tree = await EditorSceneList(p);
    const article = findElement(tree, element => element.type === 'article')!;
    article.props.onClick!({ target: new PointerTarget(interactive), stopPropagation: vi.fn() });
    expect(p.onSelectScene).not.toHaveBeenCalled();
  });

  it('opens a collapsed scene only on an explicit non-interactive card click', async () => {
    vi.stubGlobal('HTMLElement', PointerTarget);
    const p = props();
    const tree = await EditorSceneList({ ...p, expandedSceneIds: [] });
    const article = findElement(tree, element => element.type === 'article')!;
    article.props.onClick!({ target: new PointerTarget(true), stopPropagation: vi.fn() });
    expect(p.onSelectScene).not.toHaveBeenCalled();
    article.props.onClick!({ target: new PointerTarget(false), stopPropagation: vi.fn() });
    expect(p.onSelectScene).toHaveBeenCalledExactlyOnceWith('long');
  });

  it('closes once from a keyboard-accessible button, without letting the event reopen the card', async () => {
    const p = props();
    const tree = await EditorSceneList(p);
    const button = findElement(tree, element => element.props['aria-label'] === 'סגירת הסצנה סצנה ארוכה')!;
    expect(button.type).toBe('button');
    const stopPropagation = vi.fn();
    button.props.onClick!({ stopPropagation });
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(p.onSelectScene).toHaveBeenCalledExactlyOnceWith('long');
  });

  it('does not expose collapse controls or card toggling in full mode', async () => {
    const tree = await EditorSceneList({ ...props(), displayMode: 'full' });
    expect(findElement(tree, element => Boolean(element.props['aria-label']?.startsWith('סגירת הסצנה')))).toBeUndefined();
    expect(shouldOpenSceneFromArticle('full', true, false)).toBe(false);
  });

  it('does not animate article geometry while changing expansion', async () => {
    const tree = await EditorSceneList(props());
    const article = findElement(tree, element => element.type === 'article')!;
    expect(article.props.className).toContain('transition-colors');
    expect(article.props.className).not.toContain('transition-all');
  });

  it('closes a search-expanded scene through the shared toggle and preserves the scene data', async () => {
    const p = props();
    const original = { ...scene };
    const tree = await EditorSceneList({ ...p, expandedSceneIds: [], searchExpandedSceneId: scene.id });
    const close = findElement(tree, element => element.type === 'button')!;
    close.props.onClick!({ stopPropagation: vi.fn() });
    expect(p.onSelectScene).toHaveBeenCalledExactlyOnceWith(scene.id);
    expect(scene).toEqual(original);

    const editor = readFileSync('components/Editor.tsx', 'utf8');
    const toggle = editor.slice(editor.indexOf('const toggleSceneExpanded'), editor.indexOf('const openHistoryForScene'));
    expect(toggle).toMatch(/change\.closing \|\| searchExpanded[\s\S]*captureSceneCollapseAnchor[\s\S]*if \(searchExpanded\) setSearchNavigation\(undefined\)/);
    expect(toggle).not.toMatch(/onUpdateScene|scrollIntoView|\.focus\(/);
    expect(editor).toContain('[bookId, displayMode, expandedSceneIds, searchExpandedSceneId, cancelCollapseCorrection]');
  });

  it('removes focus-driven centering but preserves native caret, selection and typing/resize handling', () => {
    const editor = readFileSync('components/Editor.tsx', 'utf8');
    const textarea = editor.slice(editor.indexOf('const AutoExpandingTextarea'), editor.indexOf('const DebouncedInput'));
    expect(editor).not.toContain('focusOnRender');
    expect(textarea).not.toContain('.scrollIntoView(');
    expect(textarea).not.toContain('.focus(');
    expect(textarea).toContain('onFocus={onFocus}');
    expect(textarea).not.toMatch(/preserveScroll|setSelectionRange|requestAnimationFrame|\.scrollTo\(/);
    expect(textarea).not.toMatch(/(?:textarea|scrollContainer|event\.currentTarget)\.scrollTop\s*=/);
    expect(textarea).toContain('setLocalValue(e.target.value)');
    expect(textarea).toContain('resizeSceneTextarea(textarea, minRows)');
    expect(textarea).toContain('[localValue, fontSize, minRows]');
    expect(textarea).toContain('mirror.scrollTop = event.currentTarget.scrollTop');
    expect(editor).toContain("scene?.querySelector('[data-editor-active-match]')");
    expect(editor).toContain('focusEditorSceneBody(createdSceneId, document)');
    expect(editor).toContain('scrollToEditorTarget(getEditorSceneTargetId(sceneId), needsExpansion)');
    expect(editor).toContain('scrollToEditorTarget(getEditorChapterTargetId(item.chapterMarker.id))');
    expect(editor).not.toContain('slide-in-from-top-2 duration-300');
    expect(editor).toContain('pendingCollapseAnchorRef.current = null');
    expect(editor).not.toContain('nextExpandedSceneIds[nextExpandedSceneIds.length - 1]');
  });
});
