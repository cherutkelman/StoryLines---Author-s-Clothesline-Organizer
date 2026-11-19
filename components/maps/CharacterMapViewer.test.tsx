import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CharacterMapViewer from './CharacterMapViewer';
import { fitMapViewport, type MapViewport } from '../../src/characters/characterMapViewport';

const hooks = vi.hoisted(() => ({
  view: undefined as MapViewport | undefined,
  refs: [] as { current: unknown }[],
  index: 0,
}));

vi.mock('react', async importOriginal => ({
  ...(await importOriginal<typeof React>()),
  useRef: (initial: unknown) => hooks.refs[hooks.index++] ??= { current: initial },
  useState: (initial: MapViewport) => [hooks.view ?? initial, (update: MapViewport | ((view: MapViewport) => MapViewport)) => {
    hooks.view = typeof update === 'function' ? update(hooks.view ?? initial) : update;
  }],
  useLayoutEffect: () => {},
  useMemo: (factory: () => unknown) => factory(),
}));

const characters = Object.freeze([
  { id: 'a', name: 'יעל', x: 100, y: -20, imageUrl: '/yael.png', data: {}, customFields: [] },
  { id: 'b', name: 'מיה', x: 700, y: 80, data: {}, customFields: [] },
  { id: 'c', name: 'רות', x: -500, y: 90, data: {}, customFields: [] },
].map(character => Object.freeze(character)));
const connections = Object.freeze([
  Object.freeze({ id: 'link', fromId: 'a', toId: 'b', description: 'קשר ראשון', labelOffset: { x: 40, y: 70 } }),
  Object.freeze({ id: 'other', fromId: 'b', toId: 'c', description: 'קשר שני' }),
]);

type ViewerElementProps = {
  children?: React.ReactNode;
  'data-character-map-viewer'?: boolean;
  'aria-label'?: string;
  onClick?: () => void;
  onPointerDown?: (event: unknown) => void;
  onPointerMove?: (event: unknown) => void;
  onPointerUp?: (event: unknown) => void;
  onPointerCancel?: (event: unknown) => void;
};
function find(node: React.ReactNode, predicate: (props: ViewerElementProps) => boolean): ViewerElementProps | undefined {
  for (const child of React.Children.toArray(node)) {
    if (!React.isValidElement<ViewerElementProps>(child)) continue;
    if (predicate(child.props)) return child.props;
    const result = find(child.props.children, predicate);
    if (result) return result;
  }
}

const fixture = () => {
  const onBack = vi.fn();
  const render = () => {
    hooks.index = 0;
    return CharacterMapViewer({ characters, connections, onBack });
  };
  const tree = render();
  const canvas = find(tree, props => props['data-character-map-viewer'] === true)!;
  const currentTarget = {
    clientWidth: 320, clientHeight: 260,
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    setPointerCapture: vi.fn(),
  };
  hooks.refs[0].current = currentTarget;
  const pointer = (pointerId: number, clientX: number, clientY: number) => ({
    pointerId, clientX, clientY, button: 0, currentTarget,
  });
  return { tree, onBack, canvas, pointer };
};

beforeEach(() => {
  hooks.view = undefined;
  hooks.refs = [];
});

describe('mobile character map viewer', () => {
  it('shows the characters, portrait, connection paths and descriptions without edit controls', () => {
    const { tree } = fixture();
    const html = renderToStaticMarkup(tree);
    for (const item of ['יעל', 'מיה', 'רות', '/yael.png', 'קשר ראשון', 'קשר שני', 'M 100 -20 C 440 100']) {
      expect(html).toContain(item);
    }
    expect(html.match(/data-map-link/g)).toHaveLength(2);
    expect(html).not.toMatch(/<(input|textarea|select)\b|contenteditable|autofocus|מחיק|הסרה|עריכה/);
  });

  it('pans both axes, pinches, and continues panning with the remaining pointer without editing', () => {
    const { canvas, pointer } = fixture();
    canvas.onPointerDown!(pointer(1, 40, 50));
    canvas.onPointerMove!(pointer(1, 60, 80));
    expect(hooks.view).toEqual({ x: 20, y: 30, zoom: 1 });
    canvas.onPointerDown!(pointer(2, 100, 80));
    canvas.onPointerMove!(pointer(2, 140, 80));
    expect(hooks.view?.zoom).toBe(2);
    canvas.onPointerCancel!(pointer(2, 140, 80));
    const last = hooks.view!;
    canvas.onPointerMove!(pointer(1, 70, 85));
    expect(hooks.view).toEqual({ x: last.x + 10, y: last.y + 5, zoom: 2 });
    canvas.onPointerUp!(pointer(1, 70, 85));
    const stopped = hooks.view;
    canvas.onPointerMove!(pointer(1, 99, 99));
    expect(hooks.view).toBe(stopped);
    expect(characters[0]).toMatchObject({ x: 100, y: -20 });
    expect(connections[0]).toMatchObject({ fromId: 'a', toId: 'b', description: 'קשר ראשון' });
  });

  it('supports zoom buttons and returning to the guide', () => {
    const { tree, onBack } = fixture();
    find(tree, props => props['aria-label'] === 'הגדלת המפה')!.onClick!();
    expect(hooks.view?.zoom).toBe(1.25);
    find(tree, props => props['aria-label'] === 'הקטנת המפה')!.onClick!();
    expect(hooks.view?.zoom).toBe(1);
    find(tree, props => props.children === 'חזרה למדריך')!.onClick!();
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('fits measured content including negative and far-off coordinates at 320px', () => {
    const bounds = { left: -400, top: -160, right: 2600, bottom: 850 };
    const view = fitMapViewport(bounds, 320, 240);
    expect(view.x + bounds.left * view.zoom).toBeGreaterThan(0);
    expect(view.x + bounds.right * view.zoom).toBeLessThan(320);
    expect(view.y + bounds.top * view.zoom).toBeGreaterThan(0);
    expect(view.y + bounds.bottom * view.zoom).toBeLessThan(240);
  });
});
