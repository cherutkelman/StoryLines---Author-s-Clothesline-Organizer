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
    expect(createCharacterEntry()).toMatchObject({
      name: 'דמות חדשה',
      x: 200,
      y: 200,
      data: { gender: 'female' },
      customFields: [],
    });
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

  it('always creates a new identity instead of accepting an existing id', () => {
    const character = createCharacterEntry({ id: 'legacy-character-id' });

    expect(character.id).not.toBe('legacy-character-id');
    expect(character.id).toMatch(UUID_V4_PATTERN);
  });
});
