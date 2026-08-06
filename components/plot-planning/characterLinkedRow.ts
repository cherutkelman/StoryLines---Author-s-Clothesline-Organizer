import type { CharacterEntry } from '../../types';

export interface CharacterLinkedRow {
  characterId?: string;
  characterName?: string;
  title?: string;
}

export type CharacterLinkResolution =
  | { status: 'linked'; characterId: string; displayName: string }
  | { status: 'legacy_match'; characterId: string; displayName: string; legacyName: string }
  | { status: 'legacy_unmatched'; legacyName: string }
  | { status: 'deleted'; characterId: string }
  | { status: 'unassigned' };

export const getLegacyCharacterName = (row: CharacterLinkedRow): string =>
  row.characterName ?? row.title ?? '';

export const resolveCharacterLink = (
  row: CharacterLinkedRow,
  characters: CharacterEntry[]
): CharacterLinkResolution => {
  if (row.characterId) {
    const linkedCharacter = characters.find(character => character.id === row.characterId);
    return linkedCharacter
      ? { status: 'linked', characterId: linkedCharacter.id, displayName: linkedCharacter.name }
      : { status: 'deleted', characterId: row.characterId };
  }

  const legacyName = getLegacyCharacterName(row);
  if (!legacyName) return { status: 'unassigned' };
  const matches = characters.filter(character => character.name === legacyName);
  return matches.length === 1
    ? { status: 'legacy_match', characterId: matches[0].id, displayName: matches[0].name, legacyName }
    : { status: 'legacy_unmatched', legacyName };
};

export const normalizeCharacterLinkOnEdit = <T extends CharacterLinkedRow>(
  row: T,
  characters: CharacterEntry[]
): T => {
  const resolution = resolveCharacterLink(row, characters);
  if (resolution.status !== 'legacy_match') return row;
  return { ...row, characterId: resolution.characterId };
};

export const getCharacterLinkedRowDisplayName = (
  row: CharacterLinkedRow,
  characters: CharacterEntry[]
): string => {
  const resolution = resolveCharacterLink(row, characters);
  if (resolution.status === 'linked' || resolution.status === 'legacy_match') return resolution.displayName;
  if (resolution.status === 'deleted') return 'דמות שנמחקה';
  if (resolution.status === 'legacy_unmatched') return resolution.legacyName;
  return 'ללא דמות משויכת';
};
