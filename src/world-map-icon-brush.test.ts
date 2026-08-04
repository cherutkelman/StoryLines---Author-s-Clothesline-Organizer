import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getMapIconBrushSpacing } from '../components/maps/worldMapDefinitions';

describe('world map icon brush spacing', () => {
  it('places high-density icons closer together', () => {
    expect(getMapIconBrushSpacing(30, 90)).toBeLessThan(getMapIconBrushSpacing(30, 10));
  });

  it('scales spacing with the selected icon size', () => {
    expect(getMapIconBrushSpacing(60, 50)).toBeCloseTo(getMapIconBrushSpacing(30, 50) * 2);
  });

  it('clamps density to the supported slider range', () => {
    expect(getMapIconBrushSpacing(30, 0)).toBe(getMapIconBrushSpacing(30, 1));
    expect(getMapIconBrushSpacing(30, 101)).toBe(getMapIconBrushSpacing(30, 100));
  });

  it('stores the selected angle on clicked and dragged icons', () => {
    const source = readFileSync('components/WorldMapEditor.tsx', 'utf8');

    expect(source).toContain('rotation: brushSettings.rotation');
    expect(source.match(/rotation: brushSettings\.rotation/g)).toHaveLength(2);
    expect(source).toContain('aria-label="זווית"');
    expect(source).toContain('>90°</text>');
    expect(source).toContain('>180°</text>');
    expect(source).toContain('>270°</text>');
  });
});
