import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findCharacterMapPosition, getCharacterMapCardFootprint, getCharacterMapPosition } from './characterMapPlacement';

describe('character map placement', () => {
  const origin = getCharacterMapPosition();
  const { width, height, gap } = getCharacterMapCardFootprint();
  const overlaps = (a: typeof origin, b: typeof origin) =>
    Math.abs(a.x - b.x) < width + gap && Math.abs(a.y - b.y) < height + gap;

  it('keeps the preferred position on an empty map and next to a distant card', () => {
    expect(findCharacterMapPosition(origin, [])).toEqual(origin);
    expect(findCharacterMapPosition(origin, [{ x: 800, y: 800 }])).toEqual(origin);
  });

  it('moves to the nearest free edge when rectangles overlap even with different centers', () => {
    const old = { x: origin.x - 110, y: origin.y };
    expect(findCharacterMapPosition(origin, [old])).toEqual({ x: origin.x + 4, y: origin.y });
    const duplicate = findCharacterMapPosition(origin, [origin, origin]);
    expect(overlaps(duplicate, origin)).toBe(false);
  });

  it('finds a free space outside a dense cluster without moving existing cards', () => {
    const occupied = Object.freeze(Array.from({ length: 81 }, (_, index) => Object.freeze({
      x: origin.x + (index % 9 - 4) * 90,
      y: origin.y + (Math.floor(index / 9) - 4) * 90,
    })));
    const location = findCharacterMapPosition(origin, occupied);
    expect(occupied.some(card => overlaps(card, location))).toBe(false);
    expect(findCharacterMapPosition(origin, occupied)).toEqual(location);
  });

  it('matches the rendered bounds for long names, images and name editing at map scale 1', () => {
    expect({ width, height, gap }).toEqual({ width: 98, height: 103, gap: 16 });
    expect(getCharacterMapCardFootprint(20)).toEqual({ width: 122, height: 124.5, gap: 20 });
    const source = readFileSync('components/CharacterMap.tsx', 'utf8');
    expect(source).toContain('flex flex-col items-center gap-1.5');
    expect(source).toContain('w-16 h-16 rounded-full border-2');
    expect(source).toContain('w-full h-full object-cover');
    expect(source).toContain('px-2 py-1.5 rounded-md border');
    expect(source).toContain('text-[10px] w-20 leading-tight');
    expect(source).toContain('truncate max-w-[80px] block leading-normal py-0.5');
  });

  it.each([0.2, 1, 3])('keeps rectangles separate at map zoom %s', zoom => {
    const point = findCharacterMapPosition(origin, [origin]);
    expect(Math.abs(point.x - origin.x) * zoom).toBeGreaterThan(width * zoom);
  });
});
