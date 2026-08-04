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
  prepareCharactersForImportedMaps,
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
    if (result.status === 'imported') {
      expect(result.importedCharacter.questionnaireVisibility).toBe('visible');
    }
  });

  it('does not copy a hidden questionnaire state into a direct import', () => {
    const source = sourceCharacter({ questionnaireVisibility: 'hidden' });
    const result = importLinkedCharacterIntoBook([], source);

    expect(result.status).toBe('imported');
    if (result.status !== 'imported') return;
    expect(result.importedCharacter.questionnaireVisibility).toBe('visible');
    expect(source.questionnaireVisibility).toBe('hidden');
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

describe('character preparation for imported maps', () => {
  it('reuses an existing target entity without changing its local data or visibility', () => {
    const entityId = uuidv4();
    const source = sourceCharacter({ id: 'source', characterEntityId: entityId, name: 'Source name', questionnaireVisibility: 'hidden' });
    const existing = sourceCharacter({
      id: 'target', characterEntityId: entityId, name: 'Local name', imageUrl: 'local-image',
      questionnaireVisibility: 'visible', data: { age: '99', local: 'keep' },
    });
    const result = prepareCharactersForImportedMaps([existing], [source], [source.id]);

    expect(result.characters).toEqual([existing]);
    expect(result.characters[0]).toBe(existing);
    expect(result.addedCharacters).toEqual([]);
    expect(result.characterIdMap).toEqual({ source: 'target' });
    expect(existing).toMatchObject({ name: 'Local name', imageUrl: 'local-image', questionnaireVisibility: 'visible', data: { age: '99', local: 'keep' } });
  });

  it.each([undefined, 'hidden'] as const)('preserves an existing target visibility of %s', visibility => {
    const entityId = uuidv4();
    const source = sourceCharacter({ id: 'source', characterEntityId: entityId });
    const existing = sourceCharacter({ id: 'target', characterEntityId: entityId, questionnaireVisibility: visibility });
    const result = prepareCharactersForImportedMaps([existing], [source], ['source']);

    expect(result.characters[0]).toBe(existing);
    expect(result.characters[0].questionnaireVisibility).toBe(visibility);
  });

  it('does not match by name or by a coincidentally equal local id', () => {
    const target = sourceCharacter({ id: 'same-local-id', characterEntityId: uuidv4(), name: 'Same name' });
    const sameName = sourceCharacter({ id: 'source-name', characterEntityId: uuidv4(), name: 'Same name' });
    const sameLocalId = sourceCharacter({ id: 'same-local-id', characterEntityId: uuidv4(), name: 'Different' });
    const result = prepareCharactersForImportedMaps([target], [sameName, sameLocalId], [sameName.id, sameLocalId.id]);

    expect(result.addedCharacters).toHaveLength(2);
    expect(result.characterIdMap[sameName.id]).not.toBe(target.id);
    expect(result.characterIdMap[sameLocalId.id]).not.toBe(target.id);
  });

  it('creates one hidden linked appearance per entity and keeps the source identity', () => {
    const entityId = uuidv4();
    const firstSource = sourceCharacter({ id: 'first-source', characterEntityId: entityId });
    const secondSource = sourceCharacter({ id: 'second-source', characterEntityId: entityId });
    const result = prepareCharactersForImportedMaps([], [firstSource, secondSource], [firstSource.id, secondSource.id]);

    expect(result.addedCharacters).toHaveLength(1);
    expect(result.addedCharacters[0]).toMatchObject({ characterEntityId: entityId, questionnaireVisibility: 'hidden' });
    expect(result.characterIdMap[firstSource.id]).toBe(result.addedCharacters[0].id);
    expect(result.characterIdMap[secondSource.id]).toBe(result.addedCharacters[0].id);
  });

  it('processes only requested source ids and does not mutate inputs', () => {
    const included = sourceCharacter({ id: 'included' });
    const excluded = sourceCharacter({ id: 'excluded' });
    const sources = [included, excluded];
    const snapshot = structuredClone(sources);
    const result = prepareCharactersForImportedMaps([], sources, ['included', 'included']);

    expect(result.addedCharacters).toHaveLength(1);
    expect(result.characterIdMap).toHaveProperty('included');
    expect(result.characterIdMap).not.toHaveProperty('excluded');
    expect(sources).toEqual(snapshot);
  });

  it('falls back to a fresh hidden identity for an invalid source identity without matching by name', () => {
    const existing = sourceCharacter({ id: 'target', name: 'Same name' });
    const invalid = sourceCharacter({ id: 'invalid-source', characterEntityId: undefined, name: 'Same name' });
    const result = prepareCharactersForImportedMaps([existing], [invalid], [invalid.id]);

    expect(result.addedCharacters).toHaveLength(1);
    expect(result.addedCharacters[0].id).not.toBe(existing.id);
    expect(result.addedCharacters[0].characterEntityId).not.toBe(existing.characterEntityId);
    expect(result.addedCharacters[0].questionnaireVisibility).toBe('hidden');
  });

  it('reuses a previously imported entity on a repeated import', () => {
    const source = sourceCharacter({ id: 'source' });
    const first = prepareCharactersForImportedMaps([], [source], [source.id]);
    const second = prepareCharactersForImportedMaps(first.characters, [source], [source.id]);

    expect(second.addedCharacters).toEqual([]);
    expect(second.characters).toEqual(first.characters);
    expect(second.characterIdMap[source.id]).toBe(first.addedCharacters[0].id);
  });
});
