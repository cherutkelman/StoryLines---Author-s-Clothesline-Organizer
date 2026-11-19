import type { MapPoint } from './characterMapGeometry';

export type MapViewport = MapPoint & { zoom: number };

export const initialMapViewport: MapViewport = { x: 0, y: 0, zoom: 1 };

export function zoomMapViewport(view: MapViewport, from: MapPoint, to: MapPoint, factor: number): MapViewport {
  const zoom = Math.min(3, Math.max(Math.min(0.05, view.zoom), view.zoom * factor));
  const scale = zoom / view.zoom;
  return { x: to.x - (from.x - view.x) * scale, y: to.y - (from.y - view.y) * scale, zoom };
}

export function moveMapViewport(view: MapViewport, before: readonly MapPoint[], after: readonly MapPoint[]): MapViewport {
  const center = ([a, b]: readonly MapPoint[]) => b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a;
  const distance = ([a, b]: readonly MapPoint[]) => b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  const oldDistance = distance(before);
  const newDistance = distance(after);
  return zoomMapViewport(view, center(before), center(after),
    oldDistance >= 1 && newDistance >= 1 ? newDistance / oldDistance : 1);
}

export function fitMapViewport(
  bounds: { left: number; top: number; right: number; bottom: number },
  width: number,
  height: number,
): MapViewport {
  const zoom = Math.min(1, width * 0.9 / (bounds.right - bounds.left), height * 0.9 / (bounds.bottom - bounds.top));
  return { x: width / 2 - (bounds.left + bounds.right) / 2 * zoom,
    y: height / 2 - (bounds.top + bounds.bottom) / 2 * zoom, zoom };
}
