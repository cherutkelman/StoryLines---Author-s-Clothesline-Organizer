import type { Book } from '../../types';
import { removeCharacterFromMap } from './characterMapMembership';

export const deleteCharacterFromBook = (book: Book, characterId: string): Book => ({
  ...book,
  characters: (book.characters || []).filter(character => character.id !== characterId),
  characterMaps: (book.characterMaps || []).map(map => removeCharacterFromMap(map, characterId)),
  characterMapConnections: (book.characterMapConnections || []).filter(
    connection => connection.fromId !== characterId && connection.toId !== characterId
  ),
});
