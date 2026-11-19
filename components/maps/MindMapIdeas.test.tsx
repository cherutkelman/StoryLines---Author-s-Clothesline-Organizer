import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MindMapIdeas from './MindMapIdeas';
import MindMapDeleteDialog from './MindMapDeleteDialog';
import { createMindMapRoot } from '../../src/mind-map-ideas';
import type { MindMap } from '../../types';

const hooks = vi.hoisted(() => ({ values: [] as unknown[], refs: [] as { current: unknown }[], index: 0, ref: 0 }));
vi.mock('react', async importOriginal => ({
  ...(await importOriginal<typeof React>()),
  useMemo: (factory: () => unknown) => factory(),
  useRef: (initial: unknown) => hooks.refs[hooks.ref++] ??= { current: initial },
  useState: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = typeof initial === 'function' ? initial() : initial;
    return [hooks.values[index], (next: unknown) => {
      hooks.values[index] = typeof next === 'function' ? next(hooks.values[index]) : next;
    }];
  },
}));

type Control = {
  children?: React.ReactNode;
  'aria-label'?: string;
  onClick?: () => void;
  onChange?: (event: { target: { value: string } }) => void;
  onSubmit?: (event: { preventDefault: () => void }) => void;
  onCancel?: () => void;
  onConfirm?: () => void;
};
function find(node: React.ReactNode, match: (element: React.ReactElement<Control>) => boolean): Control | undefined {
  for (const child of React.Children.toArray(node)) {
    if (!React.isValidElement<Control>(child)) continue;
    if (match(child)) return child.props;
    const nested = find(child.props.children, match);
    if (nested) return nested;
  }
}

function fixture(nodes: MindMap['nodes'] = [createMindMapRoot(80, 90), { id: 'child', type: 'square', text: 'ענף קיים', x: 120, y: 140 }]) {
  const map: MindMap = {
    id: 'map', name: 'מפה', nodes,
    edges: nodes.length > 1 ? [{ id: 'edge', fromId: 'root', toId: 'child' }] : [],
  };
  const update = vi.fn();
  const show = vi.fn();
  const render = () => {
    hooks.index = hooks.ref = 0;
    return MindMapIdeas({ map, onUpdateMap: update, onShowMap: show });
  };
  const click = (label: string) => find(render(), element => element.type === 'button' &&
    (element.props.children === label || element.props['aria-label'] === label))!.onClick!();
  return { map, update, show, render, click, html: () => renderToStaticMarkup(render()) };
}

beforeEach(() => { hooks.values = []; hooks.refs = []; });

describe('mobile idea tree', () => {
  it('opens the viewer only after an explicit action and does not write', () => {
    const tree = fixture();
    expect(tree.show).not.toHaveBeenCalled();
    tree.click('הצג מפה');
    expect(tree.show).toHaveBeenCalledOnce();
    expect(tree.update).not.toHaveBeenCalled();
  });
  it('shows the named leaf and its removal warning, then cancels without writing', () => {
    const tree = fixture();
    tree.click('ענף קיים');
    tree.click('מחק רעיון');
    const html = tree.html();
    expect(html).toContain('מחיקת רעיון');
    expect(html).toContain('ענף קיים');
    expect(html).toContain('הרעיון וכל הקשרים הישירים שלו יימחקו.');
    expect(html).not.toContain('וכל צאצאיהם');
    const dialog = find(tree.render(), element => element.type === MindMapDeleteDialog)!;
    expect(tree.update).not.toHaveBeenCalled();
    dialog.onCancel!();
    dialog.onConfirm!();
    expect(tree.update).not.toHaveBeenCalled();
    expect(tree.html()).not.toContain('מחיקת רעיון');
  });

  it('warns about descendants, applies one update on confirmation and clears the deleted selection', () => {
    const tree = fixture();
    const grandchild = { id: 'grandchild', text: 'צאצא', type: 'square' as const, x: 320, y: 120 };
    tree.map.nodes.push(grandchild);
    tree.map.edges.push({ id: 'second', fromId: 'child', toId: 'grandchild' });
    tree.click('ענף קיים');
    tree.click('מחק רעיון');
    expect(tree.html()).toContain('הילדים וכל צאצאיהם יישארו במפה.');
    expect(tree.html()).toContain('אחרים עשויים להישאר מחוברים דרך קשרים נוספים.');
    const dialog = find(tree.render(), element => element.type === MindMapDeleteDialog)!;
    dialog.onConfirm!();
    dialog.onConfirm!();
    expect(tree.update).toHaveBeenCalledExactlyOnceWith({ nodes: [tree.map.nodes[0], grandchild], edges: [] });
    expect(tree.html()).not.toContain('עריכת טקסט');
    Object.assign(tree.map, tree.update.mock.calls[0][0]);
    expect(tree.html()).toContain('רעיונות מנותקים');
    expect(tree.html()).toContain('צאצא');
    expect(tree.html()).not.toContain('ענף קיים');
    tree.click('נושא מרכזי');
    expect(tree.html()).not.toContain('מחק רעיון');
  });

  it('opens an empty map without writing and creates a root only on request', () => {
    const tree = fixture([]);
    expect(tree.html()).toContain('עץ רעיונות');
    expect(tree.update).not.toHaveBeenCalled();
    tree.click('צור נושא מרכזי');
    expect(tree.update).toHaveBeenCalledWith({ nodes: [createMindMapRoot(0, 0)] });
  });

  it('collapses and reopens a branch locally, and selects an idea without rendering an input', () => {
    const tree = fixture();
    tree.click('סגירת ענף: נושא מרכזי');
    expect(tree.html()).not.toContain('ענף קיים');
    tree.click('פתיחת ענף: נושא מרכזי');
    tree.click('ענף קיים');
    expect(tree.html()).toContain('עריכת טקסט');
    expect(tree.html()).not.toMatch(/<textarea|הוסף ענף/);
    expect(tree.update).not.toHaveBeenCalled();
  });

  it('saves Hebrew text only on submit and preserves the original position and edges', () => {
    const tree = fixture();
    tree.click('ענף קיים');
    tree.click('עריכת טקסט');
    find(tree.render(), element => element.type === 'textarea')!.onChange!({ target: { value: 'טקסט חדש' } });
    expect(tree.update).not.toHaveBeenCalled();
    find(tree.render(), element => element.type === 'form')!.onSubmit!({ preventDefault: vi.fn() });
    expect(tree.update).toHaveBeenCalledWith({ nodes: [tree.map.nodes[0], { ...tree.map.nodes[1], text: 'טקסט חדש' }] });
  });

  it('adds an explicit branch with a directed edge and keeps existing coordinates', () => {
    const tree = fixture();
    tree.click('נושא מרכזי');
    tree.click('הוסף ענף');
    expect(tree.update).toHaveBeenCalledWith({
      nodes: [...tree.map.nodes, expect.objectContaining({ x: 230, y: 90, type: 'square' })],
      edges: [...tree.map.edges, expect.objectContaining({ fromId: 'root', toId: expect.stringMatching(/^node-/) })],
    });
  });

  it('offers only legal parents and closes the picker without writes on cancel', () => {
    const tree = fixture();
    tree.map.nodes.push({ id: 'destination', type: 'circle', text: 'ענף יעד', x: 200, y: 25 });
    tree.click('ענף קיים');
    tree.click('העבר לענף אחר');
    expect(tree.html()).toContain('חיפוש הורה חדש');
    expect(tree.html().match(/>נושא מרכזי<\/button>/g)).toHaveLength(1);
    find(tree.render(), element => element.type === 'input')!.onChange!({ target: { value: 'אין התאמה' } });
    expect(tree.html()).toContain('לא נמצאו הורים מתאימים לחיפוש.');
    tree.click('ביטול העברה');
    expect(tree.html()).not.toContain('חיפוש הורה חדש');
    expect(tree.update).not.toHaveBeenCalled();
  });

  it('names both ideas before committing an edge-only update and renders the moved subtree', () => {
    const tree = fixture();
    tree.map.nodes.push({ id: 'destination', type: 'circle', text: 'ענף יעד', x: 200, y: 25 });
    tree.map.edges.push({ id: 'root-destination', fromId: 'root', toId: 'destination' });
    tree.click('ענף קיים');
    tree.click('העבר לענף אחר');
    tree.click('ענף יעד');
    expect(tree.html()).toContain('להעביר את <strong>ענף קיים</strong> לענף של <strong>ענף יעד</strong>');
    expect(tree.update).not.toHaveBeenCalled();
    tree.click('אישור העברה');
    expect(tree.update).toHaveBeenCalledExactlyOnceWith({ edges: [
      { id: 'edge', fromId: 'destination', toId: 'child' }, tree.map.edges[1],
    ] });
    tree.map.edges = tree.update.mock.calls[0][0].edges;
    expect(tree.html()).toContain('רמה 3');
    expect(tree.html()).not.toContain('אישור העברה');
  });

  it('explains invalid imported branches and protects the primary root', () => {
    const tree = fixture();
    tree.map.nodes.push({ id: 'other', type: 'circle', text: 'הורה נוסף', x: 200, y: 25 });
    tree.map.edges.push({ id: 'extra', fromId: 'other', toId: 'child' });
    tree.click('נושא מרכזי');
    expect(tree.html()).not.toContain('העבר לענף אחר');
    tree.click('ענף קיים');
    expect(tree.html()).not.toContain('העבר לענף אחר');
    expect(tree.html()).toContain('יש כמה הורים באחד הענפים המעורבים');
    expect(tree.update).not.toHaveBeenCalled();
  });

  it('renders detached ideas and limits indentation even for very deep trees', () => {
    const nodes: MindMap['nodes'] = [createMindMapRoot(0, 0), ...Array.from({ length: 20 }, (_, i) => ({
      id: `idea-${i}`, x: 0, y: 0, type: 'square' as const, text: `רעיון ${i}`,
    }))];
    const tree = fixture(nodes);
    tree.map.edges = nodes.slice(1, -1).map((item, i) => ({ id: `edge-${i}`, fromId: nodes[i].id, toId: item.id }));
    const html = tree.html();
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('רעיונות מנותקים');
    expect(html).toContain('רעיון 19');
    expect(html).toContain('padding-inline-start:24px');
    expect([...html.matchAll(/padding-inline-start:(\d+)px/g)].every(match => Number(match[1]) <= 24)).toBe(true);
  });
});
