type Position = { x: number; y: number };

export const DEFAULT_CHARACTER_MAP_POSITION: Position = { x: 200, y: 200 };

export function getCharacterMapPosition(position?: Partial<Position>): Position {
  return {
    x: position?.x ?? DEFAULT_CHARACTER_MAP_POSITION.x,
    y: position?.y ?? DEFAULT_CHARACTER_MAP_POSITION.y,
  };
}

export function getCharacterMapCardFootprint(rem = 16) {
  // CharacterMap uses a 4rem avatar, a .375rem gap and a bordered,
  // padded nameplate. Measure the larger of the display and edit states.
  const avatar = 4 * rem;
  const nameWidth = Math.max(80, 5 * rem) + rem + 2;
  const nameHeight = Math.max(10 * 1.5 + rem / 4, 10 * 1.25) + 0.75 * rem + 2;
  return { width: Math.max(avatar, nameWidth), height: avatar + 0.375 * rem + nameHeight, gap: rem };
}

export function getCharacterMapRootFontSize(element: HTMLElement | null): number | undefined {
  const document = element?.ownerDocument;
  const size = Number.parseFloat(document?.defaultView?.getComputedStyle(document.documentElement).fontSize ?? '');
  return Number.isFinite(size) && size > 0 ? size : undefined;
}

export function findCharacterMapPosition(
  preferred: Position,
  occupied: readonly Position[],
  rem?: number,
): Position {
  const { width, height, gap } = getCharacterMapCardFootprint(rem);
  const clearanceX = Math.ceil(width + gap);
  const clearanceY = Math.ceil(height + gap);
  const blocked = occupied.map(({ x, y }) => ({
    left: x - clearanceX, right: x + clearanceX,
    top: y - clearanceY, bottom: y + clearanceY,
  })).sort((a, b) => a.left - b.left);

  // Between two horizontal edges the blocked x intervals stay the same.
  // The closest point is therefore on the preferred row or an edge row.
  const rows = new Set([preferred.y, ...blocked.flatMap(rect => [rect.top, rect.bottom])]);
  let best = preferred;
  let bestDistance = Infinity;
  for (const y of rows) {
    const dy = y - preferred.y;
    if (dy ** 2 >= bestDistance) continue;
    let left = Infinity;
    let right = -Infinity;
    for (const rect of blocked) {
      if (y <= rect.top || y >= rect.bottom) continue;
      if (rect.left >= right) {
        if (left < preferred.x && preferred.x < right) break;
        if (rect.left >= preferred.x) break;
        left = rect.left;
        right = rect.right;
      } else {
        right = Math.max(right, rect.right);
      }
    }
    const x = left < preferred.x && preferred.x < right
      ? (preferred.x - left <= right - preferred.x ? left : right)
      : preferred.x;
    const distance = (x - preferred.x) ** 2 + dy ** 2;
    if (distance >= bestDistance) continue;
    best = { x, y };
    bestDistance = distance;
  }
  return best;
}
