import { validate as isUuid } from 'uuid';
import type { Book, CharacterEntry } from '../../types';
import {
  isSharedCharacterFieldPath,
  SHARED_CHARACTER_FIELD_PATHS,
  type SharedCharacterDataKey,
  type SharedCharacterFieldPath,
} from './characterSharedData';

export type { SharedCharacterFieldPath } from './characterSharedData';

export interface CharacterAppearance {
  bookId: string;
  bookTitle: string;
  characterId: string;
  character: CharacterEntry;
}

export type CharacterSyncDiagnostic =
  | {
      code: 'name_data_name_mismatch';
      bookId: string;
      characterId: string;
    }
  | {
      code: 'duplicate_character_record_in_book';
      bookId: string;
      characterIds: string[];
    }
  | {
      code: 'invalid_character_entity_id';
      bookId: string;
      characterId: string;
      value: string;
    }
  | {
      code: 'non_string_shared_field';
      bookId: string;
      characterId: string;
      field: SharedCharacterFieldPath;
    };

export interface CharacterSyncFieldAppearanceValue {
  bookId: string;
  bookTitle: string;
  characterId: string;
  value: unknown;
  normalizedValue: string;
  isEmpty: boolean;
}

export interface CharacterSyncValueOption {
  value: string;
  normalizedValue: string;
  appearances: Array<{ bookId: string; characterId: string }>;
}

export interface CharacterSyncFieldPlan {
  field: SharedCharacterFieldPath;
  status: 'unchanged' | 'fillable' | 'conflict';
  appearanceValues: CharacterSyncFieldAppearanceValue[];
  options: CharacterSyncValueOption[];
  suggestedValue?: string;
}

export interface CharacterSyncPlan {
  characterEntityId: string;
  appearances: CharacterAppearance[];
  fields: CharacterSyncFieldPlan[];
  diagnostics: CharacterSyncDiagnostic[];
}

export type CharacterSyncPlanResult =
  | { status: 'ready'; plan: CharacterSyncPlan }
  | { status: 'invalid_character_entity_id' }
  | { status: 'not_found' }
  | { status: 'single_appearance'; appearance: CharacterAppearance };

export type CharacterSyncResolution =
  | { field: SharedCharacterFieldPath; action: 'skip' }
  | { field: SharedCharacterFieldPath; action: 'use_value'; value: string };

export type CharacterSyncResolutionIssue =
  | { code: 'duplicate_resolution'; field: string }
  | { code: 'invalid_field'; field: string }
  | { code: 'invalid_value'; field: string };

export type CharacterSyncApplyResult =
  | {
      status: 'updated';
      books: Book[];
      updatedBookIds: string[];
      updatedFields: SharedCharacterFieldPath[];
    }
  | { status: 'no_changes'; books: Book[] }
  | { status: 'invalid_character_entity_id'; books: Book[] }
  | { status: 'not_found'; books: Book[] }
  | {
      status: 'invalid_resolutions';
      books: Book[];
      issues: CharacterSyncResolutionIssue[];
    };

const normalizeForComparison = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.replace(/\r\n?/g, '\n').trim();
};

export const getCharacterAppearances = (
  books: Book[],
  characterEntityId: string
): CharacterAppearance[] => books.flatMap(book =>
  (book.characters || [])
    .filter(character => character.characterEntityId === characterEntityId)
    .map(character => ({
      bookId: book.id,
      bookTitle: book.title,
      characterId: character.id,
      character,
    }))
);

export const getSharedCharacterFieldValue = (
  character: CharacterEntry,
  field: SharedCharacterFieldPath
): unknown => {
  if (!isSharedCharacterFieldPath(field)) return undefined;
  if (field === 'name') return character.name;
  if (field === 'imageUrl') return character.imageUrl;
  return character.data[field.slice(5) as SharedCharacterDataKey];
};

export const setSharedCharacterFieldValue = (
  character: CharacterEntry,
  field: SharedCharacterFieldPath,
  value: string
): CharacterEntry => {
  if (!isSharedCharacterFieldPath(field)) return character;
  if (field === 'name') {
    return character.name === value ? character : { ...character, name: value };
  }
  if (field === 'imageUrl') {
    return character.imageUrl === value ? character : { ...character, imageUrl: value };
  }

  const key = field.slice(5) as SharedCharacterDataKey;
  return character.data[key] === value
    ? character
    : { ...character, data: { ...character.data, [key]: value } };
};

const buildDiagnostics = (
  appearances: CharacterAppearance[]
): CharacterSyncDiagnostic[] => {
  const diagnostics: CharacterSyncDiagnostic[] = [];
  const appearancesByBook = new Map<string, CharacterAppearance[]>();

  appearances.forEach(appearance => {
    const sameBook = appearancesByBook.get(appearance.bookId) || [];
    sameBook.push(appearance);
    appearancesByBook.set(appearance.bookId, sameBook);

    const entityId = appearance.character.characterEntityId;
    if (typeof entityId === 'string' && !isUuid(entityId)) {
      diagnostics.push({
        code: 'invalid_character_entity_id',
        bookId: appearance.bookId,
        characterId: appearance.characterId,
        value: entityId,
      });
    }

    const topName = normalizeForComparison(appearance.character.name);
    const dataName = normalizeForComparison(appearance.character.data.name);
    if (topName && dataName && topName !== dataName) {
      diagnostics.push({
        code: 'name_data_name_mismatch',
        bookId: appearance.bookId,
        characterId: appearance.characterId,
      });
    }

    SHARED_CHARACTER_FIELD_PATHS.forEach(field => {
      const value = getSharedCharacterFieldValue(appearance.character, field);
      if (value !== undefined && value !== null && typeof value !== 'string') {
        diagnostics.push({
          code: 'non_string_shared_field',
          bookId: appearance.bookId,
          characterId: appearance.characterId,
          field,
        });
      }
    });
  });

  appearancesByBook.forEach((sameBook, bookId) => {
    if (sameBook.length > 1) {
      diagnostics.push({
        code: 'duplicate_character_record_in_book',
        bookId,
        characterIds: sameBook.map(appearance => appearance.characterId),
      });
    }
  });

  return diagnostics;
};

const buildFieldPlan = (
  appearances: CharacterAppearance[],
  field: SharedCharacterFieldPath
): CharacterSyncFieldPlan => {
  const appearanceValues = appearances.map(appearance => {
    const value = getSharedCharacterFieldValue(appearance.character, field);
    const normalizedValue = normalizeForComparison(value);
    return {
      bookId: appearance.bookId,
      bookTitle: appearance.bookTitle,
      characterId: appearance.characterId,
      value,
      normalizedValue,
      isEmpty: normalizedValue === '',
    };
  });
  const optionsByValue = new Map<string, CharacterSyncValueOption>();

  appearanceValues.forEach(item => {
    if (item.isEmpty || typeof item.value !== 'string') return;
    const existing = optionsByValue.get(item.normalizedValue);
    if (existing) {
      existing.appearances.push({ bookId: item.bookId, characterId: item.characterId });
    } else {
      optionsByValue.set(item.normalizedValue, {
        value: item.value,
        normalizedValue: item.normalizedValue,
        appearances: [{ bookId: item.bookId, characterId: item.characterId }],
      });
    }
  });

  const options = Array.from(optionsByValue.values());
  const hasEmpty = appearanceValues.some(item => item.isEmpty);
  const status = options.length > 1
    ? 'conflict'
    : options.length === 1 && hasEmpty
      ? 'fillable'
      : 'unchanged';

  return {
    field,
    status,
    appearanceValues,
    options,
    ...(status === 'fillable' ? { suggestedValue: options[0].value } : {}),
  };
};

export const buildCharacterSyncPlan = (
  books: Book[],
  characterEntityId: string
): CharacterSyncPlanResult => {
  if (!isUuid(characterEntityId)) return { status: 'invalid_character_entity_id' };
  const appearances = getCharacterAppearances(books, characterEntityId);
  if (appearances.length === 0) return { status: 'not_found' };
  if (appearances.length === 1) return { status: 'single_appearance', appearance: appearances[0] };

  return {
    status: 'ready',
    plan: {
      characterEntityId,
      appearances,
      fields: SHARED_CHARACTER_FIELD_PATHS.map(field => buildFieldPlan(appearances, field)),
      diagnostics: buildDiagnostics(appearances),
    },
  };
};

export const validateCharacterSyncResolutions = (
  resolutions: CharacterSyncResolution[]
): CharacterSyncResolutionIssue[] => {
  const issues: CharacterSyncResolutionIssue[] = [];
  const seen = new Set<string>();

  resolutions.forEach(resolution => {
    const field = String(resolution.field);
    if (seen.has(field)) issues.push({ code: 'duplicate_resolution', field });
    seen.add(field);
    if (!isSharedCharacterFieldPath(field)) {
      issues.push({ code: 'invalid_field', field });
      return;
    }
    if (resolution.action === 'use_value'
      && (typeof resolution.value !== 'string' || normalizeForComparison(resolution.value) === '')) {
      issues.push({ code: 'invalid_value', field });
    }
  });

  return issues;
};

export const applyCharacterSyncResolutions = (
  books: Book[],
  characterEntityId: string,
  resolutions: CharacterSyncResolution[],
  now = Date.now()
): CharacterSyncApplyResult => {
  if (!isUuid(characterEntityId)) return { status: 'invalid_character_entity_id', books };
  const appearances = getCharacterAppearances(books, characterEntityId);
  if (appearances.length === 0) return { status: 'not_found', books };

  const issues = validateCharacterSyncResolutions(resolutions);
  if (issues.length > 0) return { status: 'invalid_resolutions', books, issues };
  const activeResolutions = resolutions.filter(
    (resolution): resolution is Extract<CharacterSyncResolution, { action: 'use_value' }> =>
      resolution.action === 'use_value'
  );
  if (activeResolutions.length === 0) return { status: 'no_changes', books };

  const updatedBookIds: string[] = [];
  const changedFields = new Set<SharedCharacterFieldPath>();
  const nextBooks = books.map(book => {
    let bookChanged = false;
    const characters = book.characters || [];
    const nextCharacters = characters.map(character => {
      if (character.characterEntityId !== characterEntityId) return character;
      let nextCharacter = character;
      activeResolutions.forEach(resolution => {
        const updated = setSharedCharacterFieldValue(
          nextCharacter,
          resolution.field,
          resolution.value
        );
        if (updated !== nextCharacter) changedFields.add(resolution.field);
        nextCharacter = updated;
      });
      if (nextCharacter !== character) bookChanged = true;
      return nextCharacter;
    });

    if (!bookChanged) return book;
    updatedBookIds.push(book.id);
    return { ...book, characters: nextCharacters, updatedAt: now, pendingSync: true };
  });

  if (updatedBookIds.length === 0) return { status: 'no_changes', books };
  return {
    status: 'updated',
    books: nextBooks,
    updatedBookIds,
    updatedFields: SHARED_CHARACTER_FIELD_PATHS.filter(field => changedFields.has(field)),
  };
};
