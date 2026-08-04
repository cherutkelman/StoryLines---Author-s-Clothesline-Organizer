import { validate as isUuid } from 'uuid';
import type { CharacterEntry } from '../../types';
import { createCharacterId } from './characterFactory';

export const SHARED_CHARACTER_DATA_KEYS = [
  'gender',
  'name',
  'age',
  'residence',
  'daily_life',
  'favorite_food',
  'favorite_color',
  'general_appearance',
  'unique_features',
  'gestures',
  'common_phrases',
  'traits',
  'abilities',
  'special_powers',
  'values',
  'hobbies',
  'favorite_place',
  'strengths',
  'difficulties',
  'life_motto',
  'sweet_memories',
  'bad_memories',
  'traumas',
] as const;

export const BOOK_SPECIFIC_CHARACTER_DATA_KEYS = [
  'role',
  'goal',
  'obstacles',
  'avoidance',
  'central_dilemma',
  'choice_between',
  'first_choice_revelation',
  'choice_price',
  'belief_impact',
  'similar_dilemma_later',
  'later_choice_diff',
  'social_start_end',
  'family_start_end',
  'romantic_start_end',
  'enemy_start_end',
  'changing_connections',
  'other_connections',
] as const;

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
