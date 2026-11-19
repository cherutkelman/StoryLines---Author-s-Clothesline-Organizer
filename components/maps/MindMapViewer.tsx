import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Group, Layer, Stage } from 'react-konva';
import type Konva from 'konva';
import type { MindMap } from '../../types';
import type { MapPoint } from '../../src/characters/characterMapGeometry';
import { fitMapViewport, initialMapViewport, moveMapViewport, zoomMapViewport } from '../../src/characters/characterMapViewport';
import { MindMapLine, MindMapNodeArtwork } from './MindMapArtwork';
import { getMindMapArtworkBounds } from '../../src/mind-map-export';
import { useMindMapExport } from './useMindMapExport';

const button = 'min-h-11 min-w-11 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-3 py-2 text-sm font-bold';

export function fitMindMapViewer(bounds: { x: number; y: number; width: number; height: number } | undefined, width: number, height: number) {
  if (!bounds || width <= 0 || height <= 0 || bounds.width <= 0 || bounds.height <= 0 ||
    ![bounds.x, bounds.y, bounds.width, bounds.height, width, height].every(Number.isFinite)) return initialMapViewport;
  return fitMapViewport({
    left: bounds.x, top: bounds.y, right: bounds.x + bounds.width, bottom: bounds.y + bounds.height,
  }, width, height);
}

export default function MindMapViewer({ map, onBack }: { map: Pick<MindMap, 'name' | 'nodes' | 'edges'>; onBack: () => void }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState(initialMapViewport);
  const canvas = useRef<HTMLDivElement>(null);
  const layer = useRef<Konva.Layer>(null);
  const { exportAsImage, exportError } = useMindMapExport(layer, map.name);
  const initialized = useRef(false);
  const pointers = useRef(new Map<number, MapPoint>());
  const byId = useMemo(() => new Map(map.nodes.map(node => [node.id, node])), [map.nodes]);

  const fit = () => {
    const bounds = getMindMapArtworkBounds(layer.current);
    setView(fitMindMapViewer(bounds, size.width, size.height));
  };

  useLayoutEffect(() => {
    const element = canvas.current!;
    const resize = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (initialized.current || !size.width || !size.height || !layer.current) return;
    initialized.current = true;
    fit();
  }, [size]);

  const zoomBy = (factor: number) => {
    const center = { x: size.width / 2, y: size.height / 2 };
    setView(previous => zoomMapViewport(previous, center, center, factor));
  };
  const localPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  return (
    <div dir="rtl" className="flex h-full min-h-0 min-w-0 flex-col bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <div className="flex shrink-0 flex-wrap gap-2 border-b border-[var(--theme-border)] p-2">
        <button type="button" className={button} onClick={onBack}>חזרה לרעיונות</button>
        <button type="button" className={button} onClick={fit}>התאם למסך</button>
        <button type="button" className={button} aria-label="הגדלת המפה" onClick={() => zoomBy(1.25)}>+</button>
        <button type="button" className={button} aria-label="הקטנת המפה" onClick={() => zoomBy(0.8)}>−</button>
        <button type="button" className={button} onClick={exportAsImage}>ייצוא תמונה</button>
        {exportError && <p role="alert" className="w-full">לא ניתן לייצא את המפה כתמונה.</p>}
      </div>
      <div ref={canvas} data-mind-map-viewer role="region" aria-label="מפת חשיבה לצפייה בלבד"
        className="relative min-h-0 min-w-0 flex-1 select-none overflow-hidden" style={{ touchAction: 'none' }}
        onPointerDown={event => {
          if (event.button !== 0 || pointers.current.size >= 2) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          pointers.current.set(event.pointerId, localPoint(event));
        }}
        onPointerMove={event => {
          if (!pointers.current.has(event.pointerId)) return;
          const before = [...pointers.current.values()];
          pointers.current.set(event.pointerId, localPoint(event));
          const after = [...pointers.current.values()];
          setView(previous => moveMapViewport(previous, before, after));
        }}
        onPointerUp={event => pointers.current.delete(event.pointerId)}
        onPointerCancel={event => pointers.current.delete(event.pointerId)}
        onLostPointerCapture={event => pointers.current.delete(event.pointerId)}>
        <div className="pointer-events-none absolute inset-0" dir="ltr">
          <Stage width={size.width} height={size.height} x={view.x} y={view.y}
            scaleX={view.zoom} scaleY={view.zoom} listening={false}>
            <Layer ref={layer} listening={false}>
              {map.edges.map(edge => {
                const from = byId.get(edge.fromId);
                const to = byId.get(edge.toId);
                return from && to ? <MindMapLine key={edge.id} from={from} to={to} /> : null;
              })}
              {map.nodes.map(node => (
                <Group key={node.id} x={node.x} y={node.y}>
                  <MindMapNodeArtwork node={node} />
                </Group>
              ))}
            </Layer>
          </Stage>
        </div>
        {!map.nodes.length && <p className="relative p-4">אין עדיין רעיונות במפה הזאת.</p>}
      </div>
    </div>
  );
}
