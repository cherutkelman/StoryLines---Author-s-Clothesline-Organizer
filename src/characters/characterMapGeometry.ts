import type { CharacterMapConnection } from '../../types';

export type MapPoint = { x: number; y: number };

export function getConnectionLabelPoint(conn: CharacterMapConnection, from: Partial<MapPoint>, to: Partial<MapPoint>) {
  const t = conn.labelPosition ?? 0.5;
  const x1 = from.x ?? 0;
  const y1 = from.y ?? 0;
  const baseX = x1 + ((to.x ?? 0) - x1) * t;
  const baseY = y1 + ((to.y ?? 0) - y1) * t;
  return { x: baseX + (conn.labelOffset?.x ?? 0), y: baseY + (conn.labelOffset?.y ?? 0), baseX, baseY };
}

export function getConnectionPath(from: Partial<MapPoint>, to: Partial<MapPoint>, label: MapPoint) {
  return `M ${from.x ?? 0} ${from.y ?? 0} C ${label.x} ${label.y}, ${label.x} ${label.y}, ${to.x ?? 0} ${to.y ?? 0}`;
}
