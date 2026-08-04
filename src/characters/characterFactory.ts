import { v4 as uuidv4 } from 'uuid';
import type { CharacterEntry } from '../../types';

export const createCharacterId = (): string => uuidv4();

export const createCharacterEntry = (
  overrides: Partial<CharacterEntry> = {}
): CharacterEntry => {
  const {
    id: _ignoredId,
    characterEntityId: _ignoredCharacterEntityId,
    data: dataOverrides,
    customFields,
    ...entryOverrides
  } = overrides;

  return {
    id: createCharacterId(),
    characterEntityId: createCharacterId(),
    name: 'דמות חדשה',
    x: 200,
    y: 200,
    ...entryOverrides,
    data: {
      gender: 'female',
      ...(dataOverrides || {}),
    },
    customFields: customFields ?? [],
  };
};
