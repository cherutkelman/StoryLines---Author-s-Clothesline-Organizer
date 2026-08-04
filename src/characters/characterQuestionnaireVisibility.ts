import type { Book, CharacterEntry } from '../../types';

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

export const hideCharacterInListFromQuestionnaire = (
  characters: CharacterEntry[],
  characterId: string
): CharacterEntry[] => characters.map(character =>
  character.id === characterId ? hideCharacterFromQuestionnaire(character) : character
);

export const hideCharacterInBookFromQuestionnaire = (
  book: Book,
  characterId: string
): Book => ({
  ...book,
  characters: hideCharacterInListFromQuestionnaire(book.characters || [], characterId),
});
