import { describe, expect, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import type { CharacterEntry } from '../../types';
import { createCharacterEntry } from './characterFactory';
import {
  canImportCharacterEntity,
  createLinkedCharacterImport,
  extractSharedCharacterData,
  findCharacterByEntityId,
  getCharacterImportAvailability,
  importLinkedCharacterIntoBook,
} from './characterImport';

const sourceCharacter = (overrides: Partial<CharacterEntry> = {}): CharacterEntry => ({
  id: 'source-local-id',
  characterEntityId: uuidv4(),
  name: 'Source character',
  imageUrl: 'data:image/png;base64,image',
  role: 'main',
  x: 10,
  y: 20,
  parentId: 'parent',
  data: {
    gender: 'female',
    age: '31',
    traits: 'curious',
    goal: 'save this book',
    central_dilemma: 'stay or leave',
    unknown_field: 'do not copy',
  },
  sceneIdsByQuestionId: { goal: ['scene-1'] },
  customFields: [{ id: 'custom-1', label: 'Private' }],
  developmentStages: [{
    id: 'stage-1',
    title: 'Beginning',
    data: {},
  }],
  specialItems: [],
  uniquePowers: [],
  specificLocations: [],
  loreItems: [],
  ...overrides,
});

describe('shared character data extraction', () => {
  it('copies only approved shared top-level and data fields', () => {
    const source = sourceCharacter();
    const extracted = extractSharedCharacterData(source);

    expect(extracted).toEqual({
      name: source.name,
      imageUrl: source.imageUrl,
      characterEntityId: source.characterEntityId,
      data: { gender: 'female', age: '31', traits: 'curious' },
    });
    expect(extracted).not.toHaveProperty('id');
    expect(extracted).not.toHaveProperty('role');
    expect(extracted).not.toHaveProperty('customFields');
    expect(extracted).not.toHaveProperty('developmentStages');
    expect(extracted.data).not.toHaveProperty('goal');
    expect(extracted.data).not.toHaveProperty('central_dilemma');
    expect(extracted.data).not.toHaveProperty('unknown_field');
  });

  it('creates a new data object and never mutates the source', () => {
    const source = sourceCharacter();
    const snapshot = structuredClone(source);
    const extracted = extractSharedCharacterData(source);

    expect(extracted.data).not.toBe(source.data);
    extracted.data!.age = '99';
    expect(source).toEqual(snapshot);
  });
});

describe('linked character import creation', () => {
  it('creates a new local id while preserving the entity identity and shared fields', () => {
    const source = sourceCharacter();
    const result = createLinkedCharacterImport(source);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.character.id).not.toBe(source.id);
    expect(result.character.characterEntityId).toBe(source.characterEntityId);
    expect(result.character.name).toBe(source.name);
    expect(result.character.imageUrl).toBe(source.imageUrl);
    expect(result.character.data).toEqual({ gender: 'female', age: '31', traits: 'curious' });
    expect(result.character).not.toHaveProperty('role');
    expect(result.character).not.toHaveProperty('x');
    expect(result.character).not.toHaveProperty('y');
    expect(result.character).not.toHaveProperty('parentId');
    expect(result.character).not.toHaveProperty('sceneIdsByQuestionId');
    expect(result.character).not.toHaveProperty('developmentStages');
    expect(result.character).not.toHaveProperty('customFields');
  });

  it('does not share mutable data references with the source', () => {
    const source = sourceCharacter();
    const result = createLinkedCharacterImport(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    result.character.data.age = '99';
    expect(source.data.age).toBe('31');
  });

  it('rejects missing and invalid source identities explicitly', () => {
    const missing = sourceCharacter({ characterEntityId: undefined });
    const invalid = sourceCharacter({ characterEntityId: 'not-a-uuid' });

    expect(createLinkedCharacterImport(missing)).toEqual({
      ok: false,
      reason: 'missing_character_entity_id',
    });
    expect(createLinkedCharacterImport(invalid)).toEqual({
      ok: false,
      reason: 'invalid_character_entity_id',
    });
  });
});

describe('target book import safety', () => {
  it('finds and blocks the same entity regardless of name', () => {
    const entityId = uuidv4();
    const existing = sourceCharacter({ id: 'target-id', characterEntityId: entityId, name: 'Old name' });
    const source = sourceCharacter({ characterEntityId: entityId, name: 'New name' });
    const target = [existing];

    expect(findCharacterByEntityId(target, entityId)).toBe(existing);
    expect(canImportCharacterEntity(target, source)).toBe(false);
    expect(getCharacterImportAvailability(target, source)).toEqual({
      status: 'already_exists',
      existingCharacter: existing,
    });

    const result = importLinkedCharacterIntoBook(target, source);
    expect(result.status).toBe('already_exists');
    expect(result.characters).toBe(target);
    expect(existing.name).toBe('Old name');
  });

  it('allows identical names when entity identities differ', () => {
    const existing = sourceCharacter({ id: 'target-id', name: 'Same name' });
    const source = sourceCharacter({ name: 'Same name' });

    expect(canImportCharacterEntity([existing], source)).toBe(true);
    expect(importLinkedCharacterIntoBook([existing], source).status).toBe('imported');
  });

  it('returns a new array only for a successful import without mutating inputs', () => {
    const existing = sourceCharacter({ id: 'target-id' });
    const source = sourceCharacter();
    const target = [existing];
    const targetSnapshot = structuredClone(target);
    const sourceSnapshot = structuredClone(source);
    const result = importLinkedCharacterIntoBook(target, source);

    expect(result.status).toBe('imported');
    expect(result.characters).not.toBe(target);
    expect(result.characters).toHaveLength(2);
    expect(result.characters[0]).toBe(existing);
    expect(target).toEqual(targetSnapshot);
    expect(source).toEqual(sourceSnapshot);
  });

  it('returns the original array for invalid source identities', () => {
    const target = [sourceCharacter({ id: 'target-id' })];
    const result = importLinkedCharacterIntoBook(
      target,
      sourceCharacter({ characterEntityId: 'invalid' })
    );

    expect(result).toEqual({ status: 'invalid_source_identity', characters: target });
    expect(result.characters).toBe(target);
  });
});

describe('identity creation boundaries', () => {
  it('keeps new character creation independent from linked imports', () => {
    const source = sourceCharacter();
    const fresh = createCharacterEntry({ characterEntityId: source.characterEntityId });

    expect(fresh.characterEntityId).not.toBe(source.characterEntityId);
  });
});
