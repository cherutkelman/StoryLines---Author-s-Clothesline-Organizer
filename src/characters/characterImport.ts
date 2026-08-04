import { validate as isUuid } from 'uuid';
import type { CharacterEntry } from '../../types';
import { createCharacterEntry, createCharacterId } from './characterFactory';
import { SHARED_CHARACTER_DATA_KEYS } from './characterSharedData';

export {
  BOOK_SPECIFIC_CHARACTER_DATA_KEYS,
  SHARED_CHARACTER_DATA_KEYS,
} from './characterSharedData';

export type LinkedCharacterImportResult =
  | { ok: true; character: CharacterEntry }
  | {
      ok: false;
      reason: 'missing_character_entity_id' | 'invalid_character_entity_id';
    };

export type CharacterImportAvailability =
  | { status: 'available' }
  | { status: 'already_exists'; existingCharacter: CharacterEntry }
  | { status: 'invalid_source_identity' };

export type CharacterImportResult =
  | {
      status: 'imported';
      characters: CharacterEntry[];
      importedCharacter: CharacterEntry;
    }
  | {
      status: 'already_exists';
      characters: CharacterEntry[];
      existingCharacter: CharacterEntry;
    }
  | { status: 'invalid_source_identity'; characters: CharacterEntry[] };

export interface PreparedCharactersForImportedMaps {
  characters: CharacterEntry[];
  characterIdMap: Record<string, string>;
  addedCharacters: CharacterEntry[];
}

const hasValidEntityId = (
  character: CharacterEntry
): character is CharacterEntry & { characterEntityId: string } =>
  typeof character.characterEntityId === 'string' && isUuid(character.characterEntityId);

export const extractSharedCharacterData = (
  source: CharacterEntry
): Partial<CharacterEntry> => {
  const data: Record<string, string> = {};

  SHARED_CHARACTER_DATA_KEYS.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(source.data, key)) {
      data[key] = source.data[key];
    }
  });

  return {
    name: source.name,
    ...(source.imageUrl !== undefined ? { imageUrl: source.imageUrl } : {}),
    ...(source.characterEntityId !== undefined
      ? { characterEntityId: source.characterEntityId }
      : {}),
    data,
  };
};

export const createLinkedCharacterImport = (
  source: CharacterEntry
): LinkedCharacterImportResult => {
  if (!source.characterEntityId) {
    return { ok: false, reason: 'missing_character_entity_id' };
  }
  if (!hasValidEntityId(source)) {
    return { ok: false, reason: 'invalid_character_entity_id' };
  }

  const shared = extractSharedCharacterData(source);
  return {
    ok: true,
    character: {
      id: createCharacterId(),
      characterEntityId: source.characterEntityId,
      questionnaireVisibility: 'visible',
      name: shared.name ?? '',
      ...(shared.imageUrl !== undefined ? { imageUrl: shared.imageUrl } : {}),
      data: { ...(shared.data || {}) },
    },
  };
};

export const findCharacterByEntityId = (
  characters: CharacterEntry[],
  characterEntityId: string
): CharacterEntry | undefined =>
  characters.find(character => character.characterEntityId === characterEntityId);

export const getCharacterImportAvailability = (
  targetCharacters: CharacterEntry[],
  sourceCharacter: CharacterEntry
): CharacterImportAvailability => {
  if (!hasValidEntityId(sourceCharacter)) return { status: 'invalid_source_identity' };

  const existingCharacter = findCharacterByEntityId(
    targetCharacters,
    sourceCharacter.characterEntityId
  );
  return existingCharacter
    ? { status: 'already_exists', existingCharacter }
    : { status: 'available' };
};

export const canImportCharacterEntity = (
  targetCharacters: CharacterEntry[],
  sourceCharacter: CharacterEntry
): boolean =>
  getCharacterImportAvailability(targetCharacters, sourceCharacter).status === 'available';

export const importLinkedCharacterIntoBook = (
  targetCharacters: CharacterEntry[],
  sourceCharacter: CharacterEntry
): CharacterImportResult => {
  const availability = getCharacterImportAvailability(targetCharacters, sourceCharacter);
  if (availability.status === 'invalid_source_identity') {
    return { status: 'invalid_source_identity', characters: targetCharacters };
  }
  if (availability.status === 'already_exists') {
    return {
      status: 'already_exists',
      characters: targetCharacters,
      existingCharacter: availability.existingCharacter,
    };
  }

  const imported = createLinkedCharacterImport(sourceCharacter);
  if (!imported.ok) {
    return { status: 'invalid_source_identity', characters: targetCharacters };
  }

  return {
    status: 'imported',
    characters: [...targetCharacters, imported.character],
    importedCharacter: imported.character,
  };
};

export const prepareCharactersForImportedMaps = (
  targetCharacters: CharacterEntry[],
  sourceCharacters: CharacterEntry[],
  sourceCharacterIds: string[]
): PreparedCharactersForImportedMaps => {
  const characters = [...targetCharacters];
  const characterIdMap: Record<string, string> = {};
  const addedCharacters: CharacterEntry[] = [];
  const sourceById = new Map(sourceCharacters.map(character => [character.id, character]));

  Array.from(new Set(sourceCharacterIds)).forEach(sourceCharacterId => {
    const source = sourceById.get(sourceCharacterId);
    if (!source) return;

    const availability = getCharacterImportAvailability(characters, source);
    if (availability.status === 'already_exists') {
      characterIdMap[source.id] = availability.existingCharacter.id;
      return;
    }

    let importedCharacter: CharacterEntry;
    if (availability.status === 'available') {
      const linkedImport = createLinkedCharacterImport(source);
      if (!linkedImport.ok) return;
      importedCharacter = {
        ...linkedImport.character,
        questionnaireVisibility: 'hidden',
      };
    } else {
      const shared = extractSharedCharacterData(source);
      importedCharacter = createCharacterEntry({
        name: shared.name,
        ...(shared.imageUrl !== undefined ? { imageUrl: shared.imageUrl } : {}),
        data: { ...(shared.data || {}) },
        questionnaireVisibility: 'hidden',
        x: undefined,
        y: undefined,
      });
    }

    characters.push(importedCharacter);
    addedCharacters.push(importedCharacter);
    characterIdMap[source.id] = importedCharacter.id;
  });

  return { characters, characterIdMap, addedCharacters };
};
