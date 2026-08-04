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
});
