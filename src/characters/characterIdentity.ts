import { validate as isUuid } from 'uuid';
import type { Book, CharacterEntry } from '../../types';
import { createCharacterId } from './characterFactory';

export type CharacterIdentityIssueCode =
  | 'missing_id'
  | 'duplicate_id'
  | 'missing_character_entity_id'
  | 'invalid_character_entity_id'
  | 'duplicate_character_entity_id';

export interface CharacterIdentityIssue {
  code: CharacterIdentityIssueCode;
  characterIndex: number;
  value?: string;
}

export const ensureCharacterEntityId = (character: CharacterEntry): CharacterEntry => {
  if (character.characterEntityId) return character;
  return { ...character, characterEntityId: createCharacterId() };
};

export const ensureCharacterEntityIds = (
  characters: CharacterEntry[]
): { characters: CharacterEntry[]; changed: boolean } => {
  let changed = false;
  const normalized = characters.map(character => {
    const next = ensureCharacterEntityId(character);
    if (next !== character) changed = true;
    return next;
  });

  return changed ? { characters: normalized, changed } : { characters, changed };
};

export const normalizeBookCharacterIdentities = (
  book: Book,
  now = Date.now()
): { book: Book; changed: boolean } => {
  if (!Array.isArray(book.characters) || book.characters.length === 0) {
    return { book, changed: false };
  }

  const result = ensureCharacterEntityIds(book.characters);
  if (!result.changed) return { book, changed: false };

  return {
    book: {
      ...book,
      characters: result.characters,
      updatedAt: now,
      pendingSync: true,
    },
    changed: true,
  };
};

export const validateCharacterIdentities = (
  characters: CharacterEntry[]
): CharacterIdentityIssue[] => {
  const issues: CharacterIdentityIssue[] = [];
  const idCounts = new Map<string, number>();
  const entityIdCounts = new Map<string, number>();

  characters.forEach(character => {
    if (character.id) idCounts.set(character.id, (idCounts.get(character.id) || 0) + 1);
    if (character.characterEntityId) {
      entityIdCounts.set(
        character.characterEntityId,
        (entityIdCounts.get(character.characterEntityId) || 0) + 1
      );
    }
  });

  characters.forEach((character, characterIndex) => {
    if (!character.id) {
      issues.push({ code: 'missing_id', characterIndex });
    } else if ((idCounts.get(character.id) || 0) > 1) {
      issues.push({ code: 'duplicate_id', characterIndex, value: character.id });
    }

    if (!character.characterEntityId) {
      issues.push({ code: 'missing_character_entity_id', characterIndex });
    } else {
      if (!isUuid(character.characterEntityId)) {
        issues.push({
          code: 'invalid_character_entity_id',
          characterIndex,
          value: character.characterEntityId,
        });
      }
      if ((entityIdCounts.get(character.characterEntityId) || 0) > 1) {
        issues.push({
          code: 'duplicate_character_entity_id',
          characterIndex,
          value: character.characterEntityId,
        });
      }
    }
  });

  return issues;
};
