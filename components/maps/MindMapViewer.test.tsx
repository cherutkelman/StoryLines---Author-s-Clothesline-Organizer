import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MindMapViewer, { fitMindMapViewer } from './MindMapViewer';
import type { MindMap } from '../../types';
import { exportMindMapPng } from '../../src/mind-map-export';

vi.mock('../../src/mind-map-export', async importOriginal => ({
  ...await importOriginal<typeof import('../../src/mind-map-export')>(),
  exportMindMapPng: vi.fn(),
}));

const hooks = vi.hoisted(() => ({ values: [] as unknown[], refs: [] as { current: unknown }[], index: 0, ref: 0 }));
vi.mock('react', async importOriginal => ({
  ...(await importOriginal<typeof React>()),
  useMemo: (factory: () => unknown) => factory(),
  useLayoutEffect: () => {},
  useRef: (initial: unknown) => hooks.refs[hooks.ref++] ??= { current: initial },
  useState: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = initial;
    return [hooks.values[index], (next: unknown) => {
      hooks.values[index] = typeof next === 'function' ? next(hooks.values[index]) : next;
    }];
  },
}));

vi.mock('react-konva', () => ({
  Stage: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Layer: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Group: ({ x, y, children }: React.PropsWithChildren<{ x: number; y: number }>) => <div data-position={`${x},${y}`}>{children}</div>,
  Circle: () => <span data-shape="circle" />,
  Rect: () => <span data-shape="square" />,
  Line: ({ points }: { points: number[] }) => <span data-edge={points.join(',')} />,
  Text: ({ text }: { text: string }) => <span>{text}</span>,
}));

type Control = React.PropsWithChildren<{
  listening?: boolean;
  'aria-label'?: string;
  'data-mind-map-viewer'?: boolean;
  onClick?: () => void;
  onPointerDown?: (event: unknown) => void;
  onPointerMove?: (event: unknown) => void;
  onPointerCancel?: (event: unknown) => void;
}>;
function find(node: React.ReactNode, predicate: (props: Control) => boolean): Control | undefined {
  for (const child of React.Children.toArray(node)) {
    if (!React.isValidElement<Control>(child)) continue;
    if (predicate(child.props)) return child.props;
    const match = find(child.props.children, predicate);
    if (match) return match;
  }
}

const map: MindMap = {
  id: 'mind', name: 'מפה', nodes: [
    { id: 'a', type: 'circle', x: 100, y: 75, text: 'נושא מרכזי', isRoot: true },
    { id: 'b', type: 'square', x: 400, y: 30, text: 'ענף מחובר' },
    { id: 'c', type: 'circle', x: -900, y: 300, text: 'רעיון מנותק' },
  ],
  edges: [{ id: 'link', fromId: 'a', toId: 'b' }, { id: 'missing', fromId: 'a', toId: 'missing' }],
};
const fixture = () => {
  hooks.values[0] = { width: 320, height: 240 };
  const back = vi.fn();
  const tree = MindMapViewer({ map, onBack: back });
  const canvas = find(tree, props => props['data-mind-map-viewer'] === true)!;
  const currentTarget = { getBoundingClientRect: () => ({ left: 0, top: 0 }), setPointerCapture: vi.fn() };
  const point = (pointerId: number, clientX: number, clientY: number) => ({ pointerId, clientX, clientY, button: 0, currentTarget });
  return { tree, back, canvas, point };
};

beforeEach(() => {
  hooks.values = [];
  hooks.refs = [];
  hooks.index = hooks.ref = 0;
});

describe('mobile mind map viewer', () => {
  it('renders desktop shapes, text, edges and disconnected coordinates without inputs or editing actions', () => {
    vi.stubGlobal('document', { documentElement: {} });
    vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '' }));
    try {
      const { tree } = fixture();
      const html = renderToStaticMarkup(tree);
      for (const item of ['data-shape="circle"', 'data-shape="square"', 'נושא מרכזי', 'ענף מחובר',
        'רעיון מנותק', 'data-position="-900,300"', 'data-edge="100,75,400,30"']) expect(html).toContain(item);
      expect(html.match(/data-edge=/g)).toHaveLength(1);
      expect(html).not.toMatch(/input|textarea|עריכת טקסט|מחק רעיון|הוסף ענף/);
      expect(find(tree, props => props.listening === false)).toBeDefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('pans and pinches from the canvas, cancels a pointer and keeps all model data unchanged', () => {
    const original = structuredClone(map);
    const { canvas, point } = fixture();
    canvas.onPointerDown!(point(1, 100, 75));
    canvas.onPointerMove!(point(1, 120, 85));
    expect(hooks.values[1]).toEqual({ x: 20, y: 10, zoom: 1 });
    canvas.onPointerDown!(point(2, 160, 85));
    canvas.onPointerMove!(point(2, 200, 85));
    expect(hooks.values[1]).toMatchObject({ zoom: 2 });
    canvas.onPointerCancel!(point(2, 200, 85));
    const stopped = hooks.values[1];
    canvas.onPointerMove!(point(2, 220, 85));
    expect(hooks.values[1]).toBe(stopped);
    expect(map).toEqual(original);
  });

  it('supports navigation buttons and fits the measured layer bounds, including distant nodes', () => {
    const { tree, back } = fixture();
    find(tree, props => props['aria-label'] === 'הגדלת המפה')!.onClick!();
    expect(hooks.values[1]).toMatchObject({ zoom: 1.25 });
    find(tree, props => props['aria-label'] === 'הקטנת המפה')!.onClick!();
    expect(hooks.values[1]).toMatchObject({ zoom: 1 });
    const bounds = { x: -955, y: -10, width: 1411, height: 365 };
    const layer = { getClientRect: vi.fn(() => bounds) };
    hooks.refs[1].current = layer;
    find(tree, props => props.children === 'התאם למסך')!.onClick!();
    expect(layer.getClientRect).toHaveBeenCalledWith({ relativeTo: layer });
    expect(hooks.values[1]).toEqual(fitMindMapViewer(bounds, 320, 240));
    find(tree, props => props.children === 'חזרה לרעיונות')!.onClick!();
    expect(back).toHaveBeenCalledOnce();
  });

  it('exports the current artwork from mobile without changing the model or viewport', () => {
    const { tree, canvas, point } = fixture();
    const layer = { getClientRect: vi.fn() };
    hooks.refs[1].current = layer;
    canvas.onPointerDown!(point(1, 100, 75));
    canvas.onPointerMove!(point(1, 120, 85));
    find(tree, props => props['aria-label'] === 'הגדלת המפה')!.onClick!();
    const view = hooks.values[1];
    const original = structuredClone(map);
    find(tree, props => props.children === 'ייצוא תמונה')!.onClick!();
    expect(exportMindMapPng).toHaveBeenCalledWith(layer, map.name);
    expect(hooks.values[1]).toBe(view);
    expect(map).toEqual(original);
  });

  it('fits empty, single-node and dense maps without losing the shape margins', () => {
    expect(fitMindMapViewer(undefined, 320, 200)).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(fitMindMapViewer({ x: 0, y: 0, width: 0, height: 0 }, 320, 200).zoom).toBe(1);
    for (const [width, height] of [[110, 110], [4000, 3000]]) {
      const box = { x: -500, y: -150, width, height };
      const view = fitMindMapViewer(box, 320, 200);
      expect(view.zoom).toBeGreaterThan(0);
      expect(view.x + box.x * view.zoom).toBeGreaterThan(0);
      expect(view.y + box.y * view.zoom).toBeGreaterThan(0);
      expect(view.x + (box.x + width) * view.zoom).toBeLessThan(320);
      expect(view.y + (box.y + height) * view.zoom).toBeLessThan(200);
    }
  });
});
