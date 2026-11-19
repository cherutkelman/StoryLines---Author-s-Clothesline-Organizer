import type { CharacterMapConnection } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export function canConnectCharacters(connections: readonly CharacterMapConnection[], fromId: string, toId: string) {
  return fromId !== toId && !connections.some(link =>
    (link.fromId === fromId && link.toId === toId) || (link.fromId === toId && link.toId === fromId),
  );
}

export function createCharacterMapConnection(fromId: string, toId: string): CharacterMapConnection {
  return { id: `conn-${uuidv4()}`, fromId, toId, description: 'תיאור הקשר...' };
}
