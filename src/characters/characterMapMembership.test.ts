import { describe, expect, it } from 'vitest';
import type { CharacterDiagram, CharacterEntry } from '../../types';
import {
  addExistingCharactersToMap,
  getAvailableCharactersForMap,
  getCharacterMapMemberIds,
  removeCharacterFromMap,
} from './characterMapMembership';

const character = (id: string, name = id): CharacterEntry => ({
  id,
  name,
  data: { gender: 'female' },
  customFields: [],
});

const diagram = (overrides: Partial<CharacterDiagram> = {}): CharacterDiagram => ({
  id: 'map-1',
  name: 'Map',
  connections: [],
  positions: {},
  characterIds: [],
  ...overrides,
});

describe('character map membership', () => {
  it('returns only book characters that are not in the active map', () => {
    const characters = [character('a'), character('b'), character('c')];
    const available = getAvailableCharactersForMap(characters, diagram({ characterIds: ['b'] }));

    expect(available.map(item => item.id)).toEqual(['a', 'c']);
  });

  it('adds existing ids without creating or changing character records', () => {
    const originalCharacter = character('existing', 'Existing');
    const map = addExistingCharactersToMap(diagram(), [originalCharacter.id]);

    expect(map.characterIds).toEqual(['existing']);
    expect(map.positions.existing).toBeDefined();
    expect(originalCharacter).toEqual(character('existing', 'Existing'));
  });

  it('assigns separate initial positions when adding several characters', () => {
    const map = addExistingCharactersToMap(diagram(), ['a', 'b', 'c', 'd']);
    const serializedPositions = map.characterIds!.map(id => JSON.stringify(map.positions[id]));

    expect(new Set(serializedPositions).size).toBe(4);
  });

  it('does not add an existing or repeated id twice and preserves stable order', () => {
    const map = addExistingCharactersToMap(diagram({ characterIds: ['a'] }), ['a', 'b', 'b']);

    expect(map.characterIds).toEqual(['a', 'b']);
  });

  it('keeps membership independent between maps', () => {
    const first = addExistingCharactersToMap(diagram({ id: 'first' }), ['a']);
    const second = diagram({ id: 'second' });

    expect(first.characterIds).toEqual(['a']);
    expect(second.characterIds).toEqual([]);
    expect(getAvailableCharactersForMap([character('a')], second).map(item => item.id)).toEqual(['a']);
  });

  it('removing a member from one map does not affect another map or the book record', () => {
    const bookCharacters = [character('a')];
    const first = addExistingCharactersToMap(diagram({ id: 'first' }), ['a']);
    const second = addExistingCharactersToMap(diagram({ id: 'second' }), ['a']);
    const firstAfterRemoval = removeCharacterFromMap(first, 'a');

    expect(getAvailableCharactersForMap(bookCharacters, firstAfterRemoval).map(item => item.id)).toEqual(['a']);
    expect(second.characterIds).toEqual(['a']);
    expect(bookCharacters).toHaveLength(1);
  });

  it('removes membership, position, and every connected edge without mutating the map', () => {
    const original = diagram({
      characterIds: ['a', 'b', 'c'],
      positions: { a: { x: 1, y: 2 }, b: { x: 3, y: 4 } },
      connections: [
        { id: 'from', fromId: 'a', toId: 'b', description: '' },
        { id: 'to', fromId: 'c', toId: 'a', description: '' },
        { id: 'other', fromId: 'b', toId: 'c', description: '' },
      ],
    });

    const result = removeCharacterFromMap(original, 'a');

    expect(result.characterIds).toEqual(['b', 'c']);
    expect(result.positions).toEqual({ b: { x: 3, y: 4 } });
    expect(result.connections.map(connection => connection.id)).toEqual(['other']);
    expect(original.characterIds).toEqual(['a', 'b', 'c']);
    expect(original.positions.a).toEqual({ x: 1, y: 2 });
  });

  it('keeps an explicit empty membership authoritative after removing the last character', () => {
    const result = removeCharacterFromMap(diagram({
      characterIds: ['a'],
      positions: { a: { x: 1, y: 2 } },
    }), 'a');

    expect(result.characterIds).toEqual([]);
    expect(getCharacterMapMemberIds(result)).toEqual([]);
  });

  it('materializes inferred legacy membership before removing a character', () => {
    const result = removeCharacterFromMap(diagram({
      characterIds: undefined,
      positions: { a: { x: 1, y: 2 }, b: { x: 3, y: 4 } },
    }), 'a');

    expect(result.characterIds).toEqual(['b']);
    expect(result.positions).toEqual({ b: { x: 3, y: 4 } });
  });

  it('infers legacy membership from positions and connections when characterIds are absent', () => {
    const legacyMap = diagram({
      characterIds: undefined,
      positions: { positioned: { x: 1, y: 2 } },
      connections: [{ id: 'connection', fromId: 'connected-a', toId: 'connected-b', description: '' }],
    });

    expect(getCharacterMapMemberIds(legacyMap)).toEqual(['positioned', 'connected-a', 'connected-b']);
  });
});
