import { describe, expect, it } from 'vitest';
import type { CharacterDiagram } from '../../types';
import {
  getSourceCharacterIdsForImportedMaps,
  remapImportedCharacterMap,
} from './MapsImportDialog';

const map = (overrides: Partial<CharacterDiagram> = {}): CharacterDiagram => ({
  id: 'source-map',
  name: 'Source map',
  characterIds: ['source-a', 'source-b'],
  positions: {
    'source-a': { x: 10, y: 20 },
    'source-b': { x: 30, y: 40 },
  },
  connections: [{
    id: 'source-connection',
    fromId: 'source-a',
    toId: 'source-b',
    description: 'Keep description',
  }],
  ...overrides,
});

describe('character-map import membership', () => {
  it('collects only selected-map members once in deterministic order', () => {
    const result = getSourceCharacterIdsForImportedMaps([
      map({ id: 'first', characterIds: ['a', 'b'] }),
      map({ id: 'second', characterIds: ['b', 'c'] }),
    ]);

    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('keeps an explicit empty membership authoritative', () => {
    const result = getSourceCharacterIdsForImportedMaps([map({
      characterIds: [],
      positions: { legacy: { x: 1, y: 2 } },
      connections: [{ id: 'legacy', fromId: 'legacy', toId: 'other', description: '' }],
    })]);

    expect(result).toEqual([]);
  });

  it('infers membership for a legacy map without characterIds', () => {
    const result = getSourceCharacterIdsForImportedMaps([map({
      characterIds: undefined,
      positions: { positioned: { x: 1, y: 2 } },
      connections: [{ id: 'legacy', fromId: 'connected-a', toId: 'connected-b', description: '' }],
    })]);

    expect(result).toEqual(['positioned', 'connected-a', 'connected-b']);
  });
});

describe('imported character-map remapping', () => {
  it('remaps membership, positions, and both connection endpoints to target local ids', () => {
    const result = remapImportedCharacterMap(map(), {
      'source-a': 'target-existing',
      'source-b': 'target-new',
    }, 'imported-map');

    expect(result.id).toBe('imported-map');
    expect(result.characterIds).toEqual(['target-existing', 'target-new']);
    expect(result.positions).toEqual({
      'target-existing': { x: 10, y: 20 },
      'target-new': { x: 30, y: 40 },
    });
    expect(result.connections).toHaveLength(1);
    expect(result.connections[0]).toMatchObject({
      fromId: 'target-existing',
      toId: 'target-new',
      description: 'Keep description',
    });
    expect(result.connections[0].id).not.toBe('source-connection');
  });

  it('deduplicates mapped membership and drops unresolved positions and connections', () => {
    const result = remapImportedCharacterMap(map({
      characterIds: ['source-a', 'source-alias', 'missing'],
      positions: { 'source-a': { x: 1, y: 2 }, missing: { x: 3, y: 4 } },
      connections: [{ id: 'unresolved', fromId: 'source-a', toId: 'missing', description: '' }],
    }), {
      'source-a': 'target',
      'source-alias': 'target',
    }, 'imported-map');

    expect(result.characterIds).toEqual(['target']);
    expect(result.positions).toEqual({ target: { x: 1, y: 2 } });
    expect(result.connections).toEqual([]);
  });

  it('does not revive legacy positions or connections when characterIds is explicitly empty', () => {
    const result = remapImportedCharacterMap(map({
      characterIds: [],
      positions: { 'source-a': { x: 1, y: 2 } },
      connections: [{ id: 'legacy', fromId: 'source-a', toId: 'source-b', description: '' }],
    }), {
      'source-a': 'target-a',
      'source-b': 'target-b',
    }, 'imported-map');

    expect(result.characterIds).toEqual([]);
    expect(result.positions).toEqual({});
    expect(result.connections).toEqual([]);
  });
});
