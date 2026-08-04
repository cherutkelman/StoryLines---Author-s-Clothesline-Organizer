import { describe, expect, it } from 'vitest';
import type { Book, CharacterDiagram, CharacterEntry } from '../../types';
import { deleteCharacterFromBook } from './characterDeletion';

const character = (id: string, characterEntityId: string): CharacterEntry => ({
  id,
  characterEntityId,
  name: id,
  data: {},
  customFields: [],
});

const map = (id: string): CharacterDiagram => ({
  id,
  name: id,
  characterIds: ['remove', 'keep'],
  positions: { remove: { x: 1, y: 2 }, keep: { x: 3, y: 4 } },
  connections: [
    { id: `${id}-from`, fromId: 'remove', toId: 'keep', description: '' },
    { id: `${id}-to`, fromId: 'keep', toId: 'remove', description: '' },
    { id: `${id}-keep`, fromId: 'keep', toId: 'other', description: '' },
  ],
});

const book = (id: string, localCharacterId = 'remove'): Book => ({
  id,
  ownerId: 'owner',
  title: id,
  createdAt: 1,
  updatedAt: 1,
  syncStatus: 'local_only',
  pendingSync: false,
  plotlines: [],
  scenes: [],
  characters: [character(localCharacterId, 'shared-entity'), character('keep', 'keep-entity')],
  characterMaps: [map('first'), map('second')],
  characterMapConnections: [
    { id: 'legacy-remove', fromId: 'remove', toId: 'keep', description: '' },
    { id: 'legacy-keep', fromId: 'keep', toId: 'other', description: '' },
  ],
});

describe('character deletion', () => {
  it('deletes a local character and all of its map references while keeping maps and peers', () => {
    const original = book('active');
    const result = deleteCharacterFromBook(original, 'remove');

    expect(result.characters?.map(item => item.id)).toEqual(['keep']);
    expect(result.characterMaps).toHaveLength(2);
    result.characterMaps?.forEach(characterMap => {
      expect(characterMap.characterIds).toEqual(['keep']);
      expect(characterMap.positions).toEqual({ keep: { x: 3, y: 4 } });
      expect(characterMap.connections.map(connection => connection.id)).toEqual([`${characterMap.id}-keep`]);
    });
    expect(result.characterMapConnections?.map(connection => connection.id)).toEqual(['legacy-keep']);
    expect(original.characters?.map(item => item.id)).toEqual(['remove', 'keep']);
  });

  it('matches only the book-local id, not characterEntityId or another book', () => {
    const active = book('active');
    const other = book('other', 'other-local-id');
    const nextBooks = [active, other].map(item =>
      item.id === active.id ? deleteCharacterFromBook(item, 'remove') : item
    );

    expect(nextBooks[0].characters?.some(item => item.id === 'remove')).toBe(false);
    expect(nextBooks[1]).toBe(other);
    expect(nextBooks[1].characters?.[0].characterEntityId).toBe('shared-entity');
  });
});
