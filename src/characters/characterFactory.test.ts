import { describe, expect, it } from 'vitest';
import { createCharacterEntry, createCharacterId } from './characterFactory';

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('characterFactory', () => {
  it('creates distinct valid UUIDs', () => {
    const first = createCharacterId();
    const second = createCharacterId();

    expect(first).not.toBe(second);
    expect(first).toMatch(UUID_V4_PATTERN);
    expect(second).toMatch(UUID_V4_PATTERN);
  });

  it('creates a character with the existing defaults', () => {
    const character = createCharacterEntry();

    expect(character).toMatchObject({
      name: 'דמות חדשה',
      x: 200,
      y: 200,
      data: { gender: 'female' },
      customFields: [],
    });
    expect(character.id).toMatch(UUID_V4_PATTERN);
    expect(character.characterEntityId).toMatch(UUID_V4_PATTERN);
    expect(character.id).not.toBe(character.characterEntityId);
    expect(character.questionnaireVisibility).not.toBe('hidden');
  });

  it('allows map creation to request a hidden questionnaire state', () => {
    const character = createCharacterEntry({ questionnaireVisibility: 'hidden' });

    expect(character.questionnaireVisibility).toBe('hidden');
  });

  it('preserves entry overrides and merges data with defaults', () => {
    const character = createCharacterEntry({
      name: 'נועה',
      imageUrl: 'data:image/png;base64,image',
      x: 42,
      y: 84,
      data: { age: '31' },
    });

    expect(character).toMatchObject({
      name: 'נועה',
      imageUrl: 'data:image/png;base64,image',
      x: 42,
      y: 84,
      data: { gender: 'female', age: '31' },
      customFields: [],
    });
  });

  it('always creates new identities instead of accepting identity overrides', () => {
    const character = createCharacterEntry({
      id: 'legacy-character-id',
      characterEntityId: 'legacy-entity-id',
    });

    expect(character.id).not.toBe('legacy-character-id');
    expect(character.characterEntityId).not.toBe('legacy-entity-id');
    expect(character.id).toMatch(UUID_V4_PATTERN);
    expect(character.characterEntityId).toMatch(UUID_V4_PATTERN);
  });

  it('creates four unique identities for two new characters', () => {
    const first = createCharacterEntry();
    const second = createCharacterEntry();
    const identities = [first.id, first.characterEntityId, second.id, second.characterEntityId];

    expect(new Set(identities).size).toBe(4);
  });
});
