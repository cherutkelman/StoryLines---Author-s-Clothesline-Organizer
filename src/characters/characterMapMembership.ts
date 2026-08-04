import type { CharacterDiagram, CharacterEntry } from '../../types';

export const getCharacterMapMemberIds = (map: CharacterDiagram): string[] => {
  const inferredIds = [
    ...Object.keys(map.positions || {}),
    ...(map.connections || []).flatMap(connection => [connection.fromId, connection.toId]),
  ];
  const sourceIds = map.characterIds?.length ? map.characterIds : inferredIds;
  return Array.from(new Set(sourceIds));
};

export const getAvailableCharactersForMap = (
  characters: CharacterEntry[],
  map: CharacterDiagram
): CharacterEntry[] => {
  const memberIds = new Set(getCharacterMapMemberIds(map));
  return characters.filter(character => !memberIds.has(character.id));
};

export const addExistingCharactersToMap = (
  map: CharacterDiagram,
  characterIds: string[]
): CharacterDiagram => {
  const existingIds = getCharacterMapMemberIds(map);
  const existingIdSet = new Set(existingIds);
  const idsToAdd = Array.from(new Set(characterIds)).filter(id => !existingIdSet.has(id));
  if (idsToAdd.length === 0) return map;

  const positions = { ...(map.positions || {}) };
  idsToAdd.forEach((characterId, index) => {
    positions[characterId] = {
      x: 240 + (index % 3) * 150,
      y: 220 + Math.floor(index / 3) * 140,
    };
  });

  return {
    ...map,
    characterIds: [...existingIds, ...idsToAdd],
    positions,
  };
};
