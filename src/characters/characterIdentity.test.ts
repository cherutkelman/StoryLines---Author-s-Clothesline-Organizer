import { describe, expect, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import type { Book, CharacterEntry } from '../../types';
import {
  ensureCharacterEntityId,
  ensureCharacterEntityIds,
  normalizeBookCharacterIdentities,
  validateCharacterIdentities,
} from './characterIdentity';

const character = (overrides: Partial<CharacterEntry> = {}): CharacterEntry => ({
  id: 'book-character-1',
  name: 'דמות',
  data: { gender: 'female', note: 'preserved' },
  customFields: [],
  ...overrides,
});

const book = (characters: CharacterEntry[]): Book => ({
  id: 'book-1',
  ownerId: 'owner-1',
  title: 'Book',
  createdAt: 1,
  updatedAt: 2,
  syncStatus: 'synced',
  pendingSync: false,
  plotlines: [],
  scenes: [],
  characters,
  characterMaps: [{
    id: 'map-1',
    name: 'Map',
    characterIds: ['book-character-1'],
    positions: { 'book-character-1': { x: 10, y: 20 } },
    connections: [],
  }],
  relationships: [{
    id: 'relationship-1',
    char1Id: 'book-character-1',
    char2Id: 'book-character-2',
    steps: [],
  }],
});

describe('character identity normalization', () => {
  it('keeps an existing entity identity and object reference unchanged', () => {
    const source = character({ characterEntityId: uuidv4() });

    expect(ensureCharacterEntityId(source)).toBe(source);
  });

  it('adds an entity identity without changing the legacy id or other fields', () => {
    const source = character();
    const normalized = ensureCharacterEntityId(source);

    expect(normalized).not.toBe(source);
    expect(normalized.id).toBe(source.id);
    expect(normalized.name).toBe(source.name);
    expect(normalized.data).toBe(source.data);
    expect(normalized.characterEntityId).toBeTruthy();
  });

  it('returns the same array reference when every character is valid', () => {
    const characters = [character({ characterEntityId: uuidv4() })];
    const result = ensureCharacterEntityIds(characters);

    expect(result.changed).toBe(false);
    expect(result.characters).toBe(characters);
    expect(result.characters[0]).toBe(characters[0]);
  });

  it('is idempotent after assigning missing identities', () => {
    const first = ensureCharacterEntityIds([character()]);
    const second = ensureCharacterEntityIds(first.characters);

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(second.characters).toBe(first.characters);
    expect(second.characters[0].characterEntityId).toBe(first.characters[0].characterEntityId);
  });

  it('normalizes an old book once and preserves map and relationship links by local id', () => {
    const source = book([character()]);
    const originalMap = source.characterMaps![0];
    const originalRelationship = source.relationships![0];
    const result = normalizeBookCharacterIdentities(source, 100);

    expect(result.changed).toBe(true);
    expect(result.book.id).toBe(source.id);
    expect(result.book.characters![0].id).toBe('book-character-1');
    expect(result.book.characters![0].characterEntityId).toBeTruthy();
    expect(result.book.characterMaps![0]).toBe(originalMap);
    expect(result.book.characterMaps![0].characterIds).toEqual(['book-character-1']);
    expect(result.book.characterMaps![0].positions).toEqual({ 'book-character-1': { x: 10, y: 20 } });
    expect(result.book.relationships![0]).toBe(originalRelationship);
    expect(result.book.relationships![0].char1Id).toBe('book-character-1');
    expect(result.book.updatedAt).toBe(100);
    expect(result.book.pendingSync).toBe(true);
  });

  it('keeps a normalized book reference and metadata unchanged on later loads', () => {
    const source = book([character({ characterEntityId: uuidv4() })]);
    const result = normalizeBookCharacterIdentities(source, 100);

    expect(result.changed).toBe(false);
    expect(result.book).toBe(source);
    expect(result.book.updatedAt).toBe(2);
    expect(result.book.pendingSync).toBe(false);
  });

  it('preserves an assigned identity through save and reload serialization', () => {
    const firstLoad = normalizeBookCharacterIdentities(book([character()]), 100).book;
    const savedAndReloaded = JSON.parse(JSON.stringify(firstLoad)) as Book;
    const secondLoad = normalizeBookCharacterIdentities(savedAndReloaded, 200);

    expect(secondLoad.changed).toBe(false);
    expect(secondLoad.book.characters![0].characterEntityId).toBe(firstLoad.characters![0].characterEntityId);
    expect(secondLoad.book.updatedAt).toBe(100);
  });

  it('does not merge same-name or duplicate-local-id records', () => {
    const characters = [
      character({ id: 'duplicate', name: 'אותו שם' }),
      character({ id: 'duplicate', name: 'אותו שם' }),
    ];
    const result = ensureCharacterEntityIds(characters);

    expect(result.characters).toHaveLength(2);
    expect(result.characters[0].characterEntityId).not.toBe(result.characters[1].characterEntityId);
  });
});

describe('character identity validator', () => {
  it('reports missing, invalid, and duplicate identities without mutating data', () => {
    const duplicateEntityId = uuidv4();
    const characters = [
      character({ id: '' }),
      character({ id: 'duplicate-id', characterEntityId: 'not-a-uuid' }),
      character({ id: 'duplicate-id', characterEntityId: duplicateEntityId }),
      character({ id: 'unique-id', characterEntityId: duplicateEntityId }),
    ];
    const snapshot = JSON.stringify(characters);
    const issues = validateCharacterIdentities(characters);

    expect(issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      'missing_id',
      'missing_character_entity_id',
      'duplicate_id',
      'invalid_character_entity_id',
      'duplicate_character_entity_id',
    ]));
    expect(JSON.stringify(characters)).toBe(snapshot);
  });
});
