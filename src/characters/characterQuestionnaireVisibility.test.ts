import { describe, expect, it } from 'vitest';
import type { CharacterEntry } from '../../types';
import {
  hideCharacterFromQuestionnaire,
  isCharacterVisibleInQuestionnaire,
  restoreCharacterToQuestionnaire,
  restoreCharacterInListToQuestionnaire,
  hideCharacterInBookFromQuestionnaire,
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

  it('hides one local record while preserving the book, maps, links, identity, and data', () => {
    const target = {
      ...character('visible'),
      imageUrl: 'image',
      customFields: [{ id: 'custom', label: 'Custom' }],
    };
    const peer = { ...character('visible'), id: 'peer', characterEntityId: target.characterEntityId };
    const map = {
      id: 'map',
      name: 'Map',
      characterIds: [target.id, peer.id],
      positions: { [target.id]: { x: 1, y: 2 }, [peer.id]: { x: 3, y: 4 } },
      connections: [{ id: 'connection', fromId: target.id, toId: peer.id, description: 'Link' }],
    };
    const legacyConnections = [{ id: 'legacy', fromId: target.id, toId: peer.id, description: 'Legacy' }];
    const original: any = {
      id: 'book', ownerId: 'owner', title: 'Book', createdAt: 1, updatedAt: 1,
      syncStatus: 'local_only', pendingSync: false, plotlines: [], scenes: [],
      characters: [target, peer], characterMaps: [map], characterMapConnections: legacyConnections,
    };

    const result = hideCharacterInBookFromQuestionnaire(original, target.id);

    expect(result).not.toBe(original);
    expect(result.characters).toHaveLength(2);
    expect(result.characters?.[0]).toMatchObject({
      id: target.id,
      characterEntityId: target.characterEntityId,
      data: target.data,
      customFields: target.customFields,
      imageUrl: target.imageUrl,
      questionnaireVisibility: 'hidden',
    });
    expect(result.characters?.[1]).toBe(peer);
    expect(result.characterMaps).toBe(original.characterMaps);
    expect(result.characterMaps?.[0].positions).toBe(map.positions);
    expect(result.characterMaps?.[0].connections).toBe(map.connections);
    expect(result.characterMapConnections).toBe(legacyConnections);
    expect(original.characters[0].questionnaireVisibility).toBe('visible');

    const otherBook = {
      ...original,
      id: 'other-book',
      characters: [{ ...target, id: 'other-local-id' }],
    };
    const books = [original, otherBook].map(book =>
      book.id === original.id ? hideCharacterInBookFromQuestionnaire(book, target.id) : book
    );
    expect(books[1]).toBe(otherBook);
    expect(books[1].characters[0].questionnaireVisibility).toBe('visible');
    expect(books[1].characters[0].characterEntityId).toBe(target.characterEntityId);
  });
});
