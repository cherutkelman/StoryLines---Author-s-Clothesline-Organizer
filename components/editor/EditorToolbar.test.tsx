import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { THEMES } from '../../types';
import { EditorToolbarContent, EditorWordCount } from './EditorToolbar';

const props = () => ({
  menuId: 'toolbar-menu',
  openMenu: null,
  textScale: 100,
  totalWords: 42,
  displayMode: 'focus' as const,
  isSearchOpen: false,
  searchQuery: '',
  hasActiveScene: true,
  onTextScaleChange: vi.fn(),
  onDisplayModeChange: vi.fn(),
  onSearchOpenChange: vi.fn(),
  onSearchQueryChange: vi.fn(),
  onOpenBulkAdd: vi.fn(),
  onNewChapter: vi.fn(),
  onOpenQuestionnaireBridge: vi.fn(),
  onExport: vi.fn(),
  onOpenHistory: vi.fn(),
  onOpenTips: vi.fn(),
  onMenuToggle: vi.fn(),
  onMenuAction: vi.fn((action: () => void) => action()),
});

type ButtonProps = React.ComponentProps<'button'>;
function findButton(node: React.ReactNode, matches: (button: ButtonProps) => boolean): ButtonProps | undefined {
  for (const child of React.Children.toArray(node)) {
    if (!React.isValidElement<ButtonProps>(child)) continue;
    if (child.type === 'button' && matches(child.props)) return child.props;
    const nested = findButton(child.props.children, matches);
    if (nested) return nested;
  }
}

describe('editor toolbar menus', () => {
  it('uses the counter palette for all triggers and keeps a visible focus style', () => {
    const tree = EditorToolbarContent(props());
    for (const menu of ['view', 'write', 'more']) {
      const trigger = findButton(tree, button => button.id === `toolbar-menu-${menu}`);
      expect(trigger?.className).toContain('bg-[var(--theme-bg)]');
      expect(trigger?.className).toContain('text-[var(--theme-primary)]');
      expect(trigger?.className).toContain('border-[var(--theme-primary)]/50');
      expect(trigger?.className).toContain('focus-visible:outline-[var(--theme-primary)]');
      expect(trigger?.className).toContain('hover:bg-[var(--theme-secondary)]');
    }
  });

  it('keeps themed menu text readable on every palette in normal, hover, and disabled states', () => {
    const rgb = (hex: string) => [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
    const luminance = (color: number[]) => color
      .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
      .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const contrast = (a: number[], b: number[]) => {
      const [first, second] = [luminance(a), luminance(b)].sort((left, right) => right - left);
      return (first + 0.05) / (second + 0.05);
    };
    for (const [name, theme] of Object.entries(THEMES)) {
      const foreground = rgb(theme.primary);
      const surface = rgb(theme.bg);
      const disabled = foreground.map((channel, index) => channel * 0.75 + surface[index] * 0.25);
      expect(contrast(foreground, surface), name).toBeGreaterThanOrEqual(4.5);
      expect(contrast(foreground, rgb(theme.secondary)), name).toBeGreaterThanOrEqual(4.5);
      expect(contrast(disabled, surface), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each([null, 'view', 'write', 'more'] as const)('keeps the live count above and outside the %s menu', openMenu => {
    const html = renderToStaticMarkup(<EditorToolbarContent {...props()} openMenu={openMenu} totalWords={57} />);
    expect(html).toContain('dir="rtl"');
    expect(html).toMatch(/data-editor-word-count="[^"]*"[^>]*>.*57 מילים/);
    expect(html.includes('חיפוש')).toBe(openMenu === 'write');
    for (const label of ['תצוגה', 'כתיבה', 'עוד']) expect(html).toContain(label);
    expect(html.match(/aria-expanded="true"/g) ?? []).toHaveLength(openMenu ? 1 : 0);
    if (openMenu) {
      expect(html.indexOf('data-editor-word-count')).toBeLessThan(html.indexOf('id="toolbar-menu"'));
      expect(html).toContain(`aria-labelledby="toolbar-menu-${openMenu}"`);
    }
  });

  it.each(['toolbar', 'drawer'] as const)('routes the open %s menu actions to the existing callbacks', placement => {
    const toolbarProps = props();
    const groups = {
      view: [['סגור הכל', toolbarProps.onDisplayModeChange], ['הצג הכל', toolbarProps.onDisplayModeChange]],
      write: [['סצנה חדשה', toolbarProps.onOpenBulkAdd], ['פרק חדש', toolbarProps.onNewChapter], ['שלוף משאלון', toolbarProps.onOpenQuestionnaireBridge]],
      more: [['ייצוא', toolbarProps.onExport], ['היסטוריית גרסאות', toolbarProps.onOpenHistory], ['טיפים', toolbarProps.onOpenTips]],
    } as const;
    for (const menu of ['view', 'write', 'more'] as const) {
      const state = { ...toolbarProps, openMenu: menu, placement };
      const tree = EditorToolbarContent(state);
      const html = renderToStaticMarkup(<EditorToolbarContent {...state} />);
      for (const [label, callback] of groups[menu]) {
        const button = findButton(tree, props => React.Children.toArray(props.children).some(child =>
          React.isValidElement<{ children: string }>(child) && child.props.children === label));
        expect(button?.type).toBe('button');
        expect(button?.className).toContain('min-h-11');
        button?.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
        expect(callback).toHaveBeenCalled();
      }
      expect(html).not.toContain(groups[menu === 'more' ? 'write' : 'more'][0][0]);
    }
    expect(toolbarProps.onDisplayModeChange.mock.calls).toEqual([['focus'], ['full']]);
    expect(toolbarProps.onMenuAction).toHaveBeenCalledTimes(8);
  });

  it('renders the mobile submenu inline and keeps its word count in a separate surface', () => {
    const html = renderToStaticMarkup(<EditorToolbarContent {...props()} placement="drawer" openMenu="write" />);
    expect(html).toContain('data-editor-drawer-menus');
    expect(html).not.toContain('data-editor-toolbar');
    expect(html).not.toContain('data-editor-word-count');
    expect(html).not.toContain('absolute');
    expect(html).toContain('aria-labelledby="toolbar-menu-write"');
    expect(html).toContain('פרק חדש');
    const counter = renderToStaticMarkup(<EditorWordCount totalWords={73} />);
    expect(counter).toContain('73 מילים');
    expect(counter).not.toMatch(/sticky|absolute|fixed/);
  });

  it.each(['toolbar', 'drawer'] as const)('routes single and bulk insertion to separate callbacks in the %s', placement => {
    const state = { ...props(), placement, openMenu: 'write' as const, onAddSceneAfter: vi.fn() };
    const tree = EditorToolbarContent(state);
    const click = (label: string) => {
      const button = findButton(tree, props => React.Children.toArray(props.children).some(child =>
        React.isValidElement<{ children: string }>(child) && child.props.children === label));
      expect(button?.onClick).toBeDefined();
      button?.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
    };
    click('הוסף סצנה אחרי הסצנה הנוכחית');
    expect(state.onAddSceneAfter).toHaveBeenCalledOnce();
    expect(state.onOpenBulkAdd).not.toHaveBeenCalled();
    click('סצנה חדשה');
    expect(state.onOpenBulkAdd).toHaveBeenCalledOnce();
    expect(state.onAddSceneAfter).toHaveBeenCalledOnce();
  });

  it('mounts mobile actions only in the active editor navigation and keeps the count outside the scroll area', () => {
    const app = readFileSync('App.tsx', 'utf8');
    const toolbar = readFileSync('components/editor/EditorToolbar.tsx', 'utf8');
    expect(app).toMatch(/isEditorItem && isActive && activeBook && \(\s*<div ref=\{setEditorMobileMenuHost\}/);
    expect(app).toMatch(/data-editor-mobile-word-count-host[\s\S]*?lg:hidden" \/>\s*<div className="storylines-editor-scroll/);
    expect(toolbar).toContain('hidden min-w-0 justify-center lg:flex');
    expect(toolbar).toContain('if (placement === \'drawer\') onCloseDrawer?.();');
  });

  it('distinguishes keyboard activation of a trigger from a pointer click', () => {
    const toolbarProps = props();
    const tree = EditorToolbarContent(toolbarProps);
    const trigger = findButton(tree, props => props.id === 'toolbar-menu-view');
    trigger?.onClick?.({ detail: 0 } as React.MouseEvent<HTMLButtonElement>);
    trigger?.onClick?.({ detail: 1 } as React.MouseEvent<HTMLButtonElement>);
    expect(toolbarProps.onMenuToggle.mock.calls).toEqual([['view', true], ['view', false]]);
  });

  it('opens and clears the existing search within the writing menu', () => {
    const state = { ...props(), openMenu: 'write' as const };
    const event = {} as React.MouseEvent<HTMLButtonElement>;
    const search = findButton(EditorToolbarContent(state), button => React.Children.toArray(button.children)
      .some(child => React.isValidElement<{ children: string }>(child) && child.props.children === 'חיפוש'));
    search?.onClick?.(event);
    expect(state.onSearchOpenChange).toHaveBeenCalledWith(true);
    expect(state.onMenuAction).not.toHaveBeenCalled();

    const active = { ...state, isSearchOpen: true, searchQuery: 'סצנה' };
    const html = renderToStaticMarkup(<EditorToolbarContent {...active} />);
    expect(html).toContain('aria-label="חפש מילים"');
    expect(html).toContain('value="סצנה"');
    const close = findButton(EditorToolbarContent(active), button => button['aria-label'] === 'סגור חיפוש');
    close?.onClick?.(event);
    expect(state.onSearchOpenChange.mock.calls).toEqual([[true], [false]]);
    expect(state.onSearchQueryChange).toHaveBeenCalledWith('');
  });

  it.each(['toolbar', 'drawer'] as const)('reports results and navigates while using the %s search', placement => {
    const state = { ...props(), placement, openMenu: 'write' as const, isSearchOpen: true, searchQuery: 'טקסט',
      searchResultCount: 17, activeSearchResult: 3, onNavigateSearch: vi.fn() };
    expect(renderToStaticMarkup(<EditorToolbarContent {...state} />)).toContain('3 מתוך 17');
    const tree = EditorToolbarContent(state);
    const event = {} as React.MouseEvent<HTMLButtonElement>;
    findButton(tree, button => button['aria-label'] === 'התוצאה הקודמת')?.onClick?.(event);
    findButton(tree, button => button['aria-label'] === 'התוצאה הבאה')?.onClick?.(event);
    expect(state.onNavigateSearch.mock.calls).toEqual([[-1], [1]]);
    expect(state.onMenuAction).toHaveBeenCalledTimes(placement === 'drawer' ? 2 : 0);

    const empty = { ...state, searchResultCount: 0 };
    expect(renderToStaticMarkup(<EditorToolbarContent {...empty} />)).toContain('לא נמצאו תוצאות');
    expect(findButton(EditorToolbarContent(empty), button => button['aria-label'] === 'התוצאה הבאה')?.disabled).toBe(true);
  });
});
