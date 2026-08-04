import type { CharacterEntry } from '../../types';

export const isCharacterVisibleInQuestionnaire = (character: CharacterEntry): boolean =>
  character.questionnaireVisibility !== 'hidden';

export const hideCharacterFromQuestionnaire = (character: CharacterEntry): CharacterEntry => ({
  ...character,
  questionnaireVisibility: 'hidden',
});

export const restoreCharacterToQuestionnaire = (character: CharacterEntry): CharacterEntry => ({
  ...character,
  questionnaireVisibility: 'visible',
});

export const restoreCharacterInListToQuestionnaire = (
  characters: CharacterEntry[],
  characterId: string
): CharacterEntry[] => characters.map(character =>
  character.id === characterId ? restoreCharacterToQuestionnaire(character) : character
);
