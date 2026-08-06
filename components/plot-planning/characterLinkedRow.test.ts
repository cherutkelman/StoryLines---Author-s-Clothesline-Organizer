import { describe, expect, it } from 'vitest';
import type { CharacterEntry } from '../../types';
import {
  getCharacterLinkedRowDisplayName,
  normalizeCharacterLinkOnEdit,
  resolveCharacterLink,
} from './characterLinkedRow';

const character = (id: string, name: string): CharacterEntry => ({
  id,
  characterEntityId: `entity-${id}`,
  name,
  data: {},
  customFields: [],
});

describe('character-linked planning rows', () => {
  it('uses characterId as identity and reflects renamed characters in display', () => {
    const row = { id: 'row', characterId: 'hero', characterName: 'שם ישן' };
    expect(getCharacterLinkedRowDisplayName(row, [character('hero', 'שם חדש')])).toBe('שם חדש');
  });

  it('matches a legacy name only when exactly one character has that name', () => {
    const legacy = { id: 'row', characterName: 'נועה' };
    const unique = [character('noa', 'נועה'), character('other', 'אחרת')];
    const duplicate = [...unique, character('second-noa', 'נועה')];

    expect(resolveCharacterLink(legacy, unique)).toMatchObject({ status: 'legacy_match', characterId: 'noa' });
    expect(normalizeCharacterLinkOnEdit(legacy, unique)).toEqual({ ...legacy, characterId: 'noa' });
    expect(resolveCharacterLink(legacy, duplicate)).toEqual({ status: 'legacy_unmatched', legacyName: 'נועה' });
    expect(normalizeCharacterLinkOnEdit(legacy, duplicate)).toBe(legacy);
  });

  it('preserves unmatched legacy text and does not invent an id', () => {
    const legacy = { id: 'row', characterName: 'דמות היסטורית', otherData: 'נשמר' };
    expect(resolveCharacterLink(legacy, [])).toEqual({ status: 'legacy_unmatched', legacyName: 'דמות היסטורית' });
    expect(normalizeCharacterLinkOnEdit(legacy, [])).toBe(legacy);
    expect(getCharacterLinkedRowDisplayName(legacy, [])).toBe('דמות היסטורית');
  });

  it('marks a missing linked character without changing the row', () => {
    const row = { id: 'row', characterId: 'deleted', characterName: 'השם שנשמר', content: 'מידע חשוב' };
    expect(resolveCharacterLink(row, [])).toEqual({ status: 'deleted', characterId: 'deleted' });
    expect(normalizeCharacterLinkOnEdit(row, [])).toBe(row);
    expect(getCharacterLinkedRowDisplayName(row, [])).toBe('דמות שנמחקה');
  });

  it('supports an unassigned row', () => {
    const row = { id: 'row', characterName: '' };
    expect(resolveCharacterLink(row, [])).toEqual({ status: 'unassigned' });
    expect(getCharacterLinkedRowDisplayName(row, [])).toBe('ללא דמות משויכת');
  });
});
