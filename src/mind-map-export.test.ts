import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type Konva from 'konva';
import { exportMindMapPng, planMindMapExport } from './mind-map-export';

const drawing = vi.hoisted(() => ({ create: vi.fn(), add: vi.fn(), toCanvas: vi.fn(), destroy: vi.fn(), group: vi.fn() }));
vi.mock('konva', () => ({
  default: {
    Node: { create: drawing.create },
    Group: class {
      constructor(props: unknown) { drawing.group(props); }
      add = drawing.add;
      toCanvas = drawing.toCanvas;
      destroy = drawing.destroy;
    },
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('full mind map PNG', () => {
  it.each([
    { x: 0, y: 0, width: 0, height: 0 },
    { x: 200, y: 300, width: 106, height: 106 },
    { x: -900, y: -130, width: 2900, height: 1800 },
    { x: -90000, y: 12500, width: 2000000, height: 12000 },
    { x: -50000, y: -50000, width: 100000, height: 100000 },
  ])('fits the whole measured artwork with margins and within the canvas budget: %o', bounds => {
    const plan = planMindMapExport(bounds);
    expect(plan.width).toBeGreaterThan(0);
    expect(plan.height).toBeGreaterThan(0);
    expect(Math.max(plan.width, plan.height)).toBeLessThanOrEqual(4096);
    expect(plan.width * plan.height).toBeLessThanOrEqual(4_000_000);
    const left = bounds.x * plan.scale + plan.x;
    const top = bounds.y * plan.scale + plan.y;
    expect(left).toBeCloseTo(24 * plan.scale);
    expect(top).toBeCloseTo(24 * plan.scale);
    expect(left + bounds.width * plan.scale).toBeLessThan(plan.width);
    expect(top + bounds.height * plan.scale).toBeLessThan(plan.height);
    expect(Math.abs(plan.width - (bounds.width + 48) * plan.scale)).toBeLessThan(1);
    expect(Math.abs(plan.height - (bounds.height + 48) * plan.scale)).toBeLessThan(1);
  });

  it('rejects invalid or unrepresentable bounds before allocating a canvas', () => {
    expect(() => planMindMapExport({ x: Infinity, y: 0, width: 100, height: 100 })).toThrow();
    expect(() => planMindMapExport({ x: 0, y: 0, width: 1e308, height: 1e308 })).toThrow();
    expect(drawing.toCanvas).not.toHaveBeenCalled();
  });

  it('draws detached artwork from local bounds, independent of the visible Stage transform', () => {
    const viewport = Object.freeze({ x: 600, y: -100, scaleX: 2, scaleY: 2 });
    const nodes = Object.freeze([
      Object.freeze({ className: 'Line', attrs: { points: [-600, 100, 200, 300] } }),
      Object.freeze({ className: 'Group', attrs: { x: -600, y: 100 } }),
      Object.freeze({ className: 'Group', attrs: { x: 8500, y: -1000 } }),
    ]);
    const layer = {
      getClientRect: vi.fn(() => ({ x: -654, y: -1054, width: 9208, height: 1508 })),
      getChildren: () => nodes.map(node => ({ toObject: () => node })),
      getStage: vi.fn(() => viewport),
    };
    const canvas = { width: 42, height: 42, toDataURL: vi.fn(() => 'data:image/png;base64,test') };
    drawing.toCanvas.mockReturnValue(canvas);
    drawing.create.mockImplementation(node => node);
    const link = { click: vi.fn(), remove: vi.fn(), href: '', download: '' };
    vi.stubGlobal('document', { createElement: () => link, body: { appendChild: vi.fn() } });
    exportMindMapPng(layer as unknown as Konva.Layer, 'מפה מלאה');
    expect(layer.getClientRect).toHaveBeenCalledWith({ relativeTo: layer });
    expect(layer.getStage).not.toHaveBeenCalled();
    expect(drawing.create.mock.calls.map(([node]) => node)).toEqual(nodes);
    const plan = planMindMapExport(layer.getClientRect());
    expect(drawing.group).toHaveBeenCalledWith({ x: plan.x, y: plan.y, scaleX: plan.scale, scaleY: plan.scale, listening: false });
    expect(drawing.toCanvas).toHaveBeenCalledWith({ x: 0, y: 0, width: plan.width, height: plan.height, pixelRatio: 1 });
    expect(link.download).toBe('מפה מלאה.png');
    expect(link.click).toHaveBeenCalledOnce();
    expect(link.remove).toHaveBeenCalledOnce();
    expect(drawing.destroy).toHaveBeenCalledOnce();
    expect(canvas.width).toBe(0);
  });

  it('fails clearly on a browser encoding failure and frees the temporary artwork', () => {
    const canvas = { width: 48, height: 48, toDataURL: () => 'data:,' };
    drawing.toCanvas.mockReturnValue(canvas);
    const layer = { getClientRect: () => ({ x: 0, y: 0, width: 0, height: 0 }), getChildren: () => [] };
    expect(() => exportMindMapPng(layer as unknown as Konva.Layer, '')).toThrow('PNG encoding failed');
    expect(drawing.destroy).toHaveBeenCalledOnce();
    expect(canvas.width).toBe(0);
  });

  it('connects both graphic modes to the same export while preserving desktop drag and artwork', () => {
    const desktop = readFileSync('components/MindMapEditor.tsx', 'utf8');
    const mobile = readFileSync('components/maps/MindMapViewer.tsx', 'utf8');
    expect(desktop).toContain('useMindMapExport(artworkRef, map.name)');
    expect(desktop).toContain('onClick={exportAsImage}');
    expect(desktop).toContain('handleNodeDragEnd(node.id, e)');
    expect(desktop).toContain('<MindMapNodeArtwork');
    expect(mobile).toContain('useMindMapExport(layer, map.name)');
    expect(mobile).toContain('onClick={exportAsImage}');
    expect(mobile).not.toContain('onUpdateMap');
  });
});
