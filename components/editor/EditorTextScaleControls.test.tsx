import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import EditorTextScaleControls from './EditorTextScaleControls';
import EditorToolbar from './EditorToolbar';

const toolbarProps = (): React.ComponentProps<typeof EditorToolbar> => ({
  textScale: 150, onTextScaleChange: vi.fn(), totalWords: 100, displayMode: 'full',
  isSearchOpen: false, searchQuery: '', hasActiveScene: true,
  onDisplayModeChange: vi.fn(), onSearchOpenChange: vi.fn(), onSearchQueryChange: vi.fn(),
  onOpenBulkAdd: vi.fn(), onOpenQuestionnaireBridge: vi.fn(), onOpenHistory: vi.fn(), onOpenTips: vi.fn(),
});

describe('text display controls', () => {
  it.each(['full', 'focus'] as const)('exposes accessible controls on mobile and desktop in %s mode', displayMode => {
    const html = renderToStaticMarkup(<EditorToolbar {...toolbarProps()} displayMode={displayMode} />);
    expect(html).toContain('aria-label="גודל תצוגת גוף הטקסט"');
    expect(html).toContain('aria-label="גודל הטקסט הנוכחי"');
    expect(html).toContain('150%');
    const group = renderToStaticMarkup(<EditorTextScaleControls textScale={150} onTextScaleChange={vi.fn()} />);
    expect(group).toContain('dir="ltr"');
    expect(group).toContain('aria-live="polite"');
    expect(group).not.toContain('hidden');
    expect(group.match(/type="button"/g)).toHaveLength(3);
  });

  it('moves by 10%, resets to 100%, and preserves the active textarea on mouse clicks', () => {
    const onChange = vi.fn();
    const tree = EditorTextScaleControls({ textScale: 130, onTextScaleChange: onChange });
    const buttons = React.Children.toArray(tree.props.children).filter(child =>
      React.isValidElement(child) && child.type === 'button') as React.ReactElement<{ onClick: () => void }>[];
    buttons.forEach(button => button.props.onClick());
    expect(onChange.mock.calls).toEqual([[120], [140], [100]]);
    const preventDefault = vi.fn();
    tree.props.onMouseDown({ button: 0, preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it('disables decrement/increment at their limits, leaving reset available', () => {
    const low = renderToStaticMarkup(<EditorTextScaleControls textScale={70} onTextScaleChange={vi.fn()} />);
    const high = renderToStaticMarkup(<EditorTextScaleControls textScale={200} onTextScaleChange={vi.fn()} />);
    expect(low).toMatch(/aria-label="הקטנת גודל הטקסט" disabled=""/);
    expect(high).toMatch(/aria-label="הגדלת גודל הטקסט" disabled=""/);
    expect(high).not.toMatch(/aria-label="איפוס גודל הטקסט ל־100%" disabled/);
  });
});