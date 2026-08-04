import { describe, expect, it } from 'vitest';
import type { CharacterEntry } from '../../types';
import {
  hideCharacterFromQuestionnaire,
  isCharacterVisibleInQuestionnaire,
  restoreCharacterToQuestionnaire,
  restoreCharacterInListToQuestionnaire,
} from './characterQuestionnaireVisibility';

const character = (questionnaireVisibility?: 'visible' | 'hidden'): CharacterEntry => ({
  id: 'local-id',
  characterEntityId: 'entity-id',
  name: 'Character',
  data: { age: '30' },
  customFields: [],
  questionnaireVisibility,
});

describe('character questionnaire visibility', () => {
  it('treats missing and explicit visible states as visible', () => {
    expect(isCharacterVisibleInQuestionnaire(character())).toBe(true);
    expect(isCharacterVisibleInQuestionnaire(character('visible'))).toBe(true);
  });

  it('treats only hidden as not visible', () => {
    expect(isCharacterVisibleInQuestionnaire(character('hidden'))).toBe(false);
  });

  it('hides and restores without mutating identity, data, or the source object', () => {
    const original = character();
    const hidden = hideCharacterFromQuestionnaire(original);
    const restored = restoreCharacterToQuestionnaire(hidden);

    expect(hidden).not.toBe(original);
    expect(restored).not.toBe(hidden);
    expect(original.questionnaireVisibility).toBeUndefined();
    expect(hidden).toMatchObject({ id: original.id, characterEntityId: original.characterEntityId, data: original.data, questionnaireVisibility: 'hidden' });
    expect(restored).toMatchObject({ id: original.id, characterEntityId: original.characterEntityId, data: original.data, questionnaireVisibility: 'visible' });
  });

  it('restores the same list record without duplicating it or touching peers', () => {
    const hidden = character('hidden');
    const peer = { ...character('visible'), id: 'peer' };
    const result = restoreCharacterInListToQuestionnaire([hidden, peer], hidden.id);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: hidden.id, characterEntityId: hidden.characterEntityId, questionnaireVisibility: 'visible' });
    expect(result[1]).toBe(peer);
  });
});
