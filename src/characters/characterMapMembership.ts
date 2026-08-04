import type { CharacterDiagram, CharacterEntry } from '../../types';

export const getCharacterMapMemberIds = (map: CharacterDiagram): string[] => {
  const inferredIds = [
    ...Object.keys(map.positions || {}),
    ...(map.connections || []).flatMap(connection => [connection.fromId, connection.toId]),
  ];
  const sourceIds = Array.isArray(map.characterIds) ? map.characterIds : inferredIds;
  return Array.from(new Set(sourceIds));
};

export const removeCharacterFromMap = (
  map: CharacterDiagram,
  characterId: string
): CharacterDiagram => {
  const characterIds = getCharacterMapMemberIds(map).filter(id => id !== characterId);
  const positions = { ...(map.positions || {}) };
  delete positions[characterId];

  return {
    ...map,
    characterIds,
    positions,
    connections: (map.connections || []).filter(
      connection => connection.fromId !== characterId && connection.toId !== characterId
    ),
  };
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
