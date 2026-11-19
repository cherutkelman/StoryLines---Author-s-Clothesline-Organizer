import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { User } from 'lucide-react';
import type { CharacterMapConnection, QuestionnaireEntry } from '../../types';
import { getCharacterMapPosition } from '../../src/characters/characterMapPlacement';
import { getConnectionLabelPoint, getConnectionPath, type MapPoint } from '../../src/characters/characterMapGeometry';
import { fitMapViewport, initialMapViewport, moveMapViewport, zoomMapViewport } from '../../src/characters/characterMapViewport';

const button = 'min-h-11 min-w-11 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-3 py-2 text-sm font-bold';

interface CharacterMapViewerProps {
  characters: readonly QuestionnaireEntry[];
  connections: readonly CharacterMapConnection[];
  onBack: () => void;
}

export default function CharacterMapViewer({ characters, connections, onBack }: CharacterMapViewerProps) {
  const canvas = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, MapPoint>());
  const [view, setView] = useState(initialMapViewport);
  const positions = useMemo(() => new Map(characters.map(character => [character.id, getCharacterMapPosition(character)])), [characters]);
  const links = useMemo(() => connections.flatMap(link => {
    const from = positions.get(link.fromId);
    const to = positions.get(link.toId);
    if (!from || !to) return [];
    const label = getConnectionLabelPoint(link, from, to);
    return [{ link, label, path: getConnectionPath(from, to, label) }];
  }), [connections, positions]);

  const fit = () => {
    if (!canvas.current || !content.current) return;
    const { clientWidth: width, clientHeight: height } = canvas.current;
    if (!width || !height) return;
    const origin = content.current.getBoundingClientRect();
    const boxes = Array.from(content.current.children)
      .filter(element => element.hasAttribute('data-map-view-item'));
    if (!boxes.length) {
      setView(initialMapViewport);
      return;
    }
    const bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
    for (const box of boxes) {
      const rect = box.getBoundingClientRect();
      bounds.left = Math.min(bounds.left, (rect.left - origin.left) / view.zoom);
      bounds.top = Math.min(bounds.top, (rect.top - origin.top) / view.zoom);
      bounds.right = Math.max(bounds.right, (rect.right - origin.left) / view.zoom);
      bounds.bottom = Math.max(bounds.bottom, (rect.bottom - origin.top) / view.zoom);
    }
    setView(fitMapViewport(bounds, width, height));
  };
  useLayoutEffect(() => { fit(); }, []);

  const zoomBy = (factor: number) => {
    if (!canvas.current) return;
    const center = { x: canvas.current.clientWidth / 2, y: canvas.current.clientHeight / 2 };
    setView(previous => zoomMapViewport(previous, center, center, factor));
  };

  const localPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  return (
    <div dir="rtl" className="flex h-full min-h-0 flex-col bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--theme-border)] p-2">
        <button type="button" className={button} onClick={onBack}>חזרה למדריך</button>
        <button type="button" className={button} onClick={fit}>התאמה למסך</button>
        <button type="button" className={button} aria-label="הגדלת המפה" onClick={() => zoomBy(1.25)}>+</button>
        <button type="button" className={button} aria-label="הקטנת המפה" onClick={() => zoomBy(0.8)}>−</button>
      </div>
      <div ref={canvas} data-character-map-viewer role="region" aria-label="מפת דמויות לצפייה בלבד" tabIndex={0}
        className="relative min-h-0 flex-1 select-none overflow-hidden"
        style={{ touchAction: 'none' }}
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
        onLostPointerCapture={event => pointers.current.delete(event.pointerId)}
        onKeyDown={event => {
          const movements: Record<string, MapPoint> = {
            ArrowLeft: { x: -48, y: 0 }, ArrowRight: { x: 48, y: 0 },
            ArrowUp: { x: 0, y: -48 }, ArrowDown: { x: 0, y: 48 },
          };
          const delta = movements[event.key];
          if (!delta) return;
          event.preventDefault();
          setView(previous => ({ ...previous, x: previous.x + delta.x, y: previous.y + delta.y }));
        }}>
        <div ref={content} dir="ltr" className="pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
          <svg aria-hidden="true" className="absolute left-0 top-0 h-px w-px overflow-visible">
            {links.map(({ link, path }) => <path key={link.id} d={path} data-map-link fill="none"
              stroke="var(--theme-primary)" strokeWidth="2" strokeDasharray="5,5" />)}
          </svg>
          {characters.map(character => {
            const { x, y } = positions.get(character.id)!;
            return (
              <div key={character.id} data-map-view-item="character" dir="rtl"
                className="absolute flex w-max flex-col items-center gap-1.5"
                style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}>
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--theme-border)] bg-[var(--theme-card)]">
                  {character.imageUrl
                    ? <img src={character.imageUrl} alt="" draggable={false} className="h-full w-full object-cover" />
                    : <User size={32} aria-hidden="true" />}
                </div>
                <span className="max-w-[112px] break-words rounded-md border border-[var(--theme-border)] bg-[var(--theme-card)] px-2 py-1 text-center text-xs font-bold">
                  {character.name}
                </span>
              </div>
            );
          })}
          {links.map(({ link, label }) => (
            <div key={link.id} data-map-view-item="connection" dir="auto"
              className="absolute w-max max-w-[144px] whitespace-pre-wrap break-words rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] px-2 py-1 text-center text-xs"
              style={{ left: label.x, top: label.y, transform: 'translate(-50%, -50%)' }}>
              {link.description}
            </div>
          ))}
        </div>
        {!characters.length && <p className="p-4">אין עדיין דמויות במפה הזאת.</p>}
      </div>
    </div>
  );
}
