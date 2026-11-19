import React, { useSyncExternalStore } from 'react';
import { CopyPlus, Plus, Trash2, Users } from 'lucide-react';
import { CharacterDiagram, QuestionnaireEntry } from '../../types';
import CharacterMap from '../CharacterMap';
import CharacterGuide from './CharacterGuide';
import CharacterMapViewer from './CharacterMapViewer';
import { createCharacterEntry } from '../../src/characters/characterFactory';
import { findCharacterMapPosition, getCharacterMapPosition } from '../../src/characters/characterMapPlacement';
import {
  addExistingCharactersToMap,
  getCharacterMapMemberIds,
  removeCharacterFromMap,
} from '../../src/characters/characterMapMembership';

interface CharacterMapsWorkspaceProps {
  bookId: string | null;
  showGuide: boolean;
  viewingMap: boolean;
  onChangeViewingMap: (viewing: boolean) => void;
  maps: CharacterDiagram[];
  currentMapId: string | null;
  characters: QuestionnaireEntry[];
  onSelectMap: (id: string | null) => void;
  onUpdateMaps: (maps: CharacterDiagram[]) => void;
  onUpdateCharacters: (characters: QuestionnaireEntry[]) => void;
  onOpenImport: () => void;
}

const guideQuery = '(max-width: 1023px)';
const subscribeToGuideLayout = (change: () => void) => {
  const media = window.matchMedia(guideQuery);
  media.addEventListener('change', change);
  return () => media.removeEventListener('change', change);
};
const isGuideLayout = () => window.matchMedia(guideQuery).matches;
export function useMobileCharacterMapLayout() {
  return useSyncExternalStore(subscribeToGuideLayout, isGuideLayout, () => false);
}

const CharacterMapsWorkspace: React.FC<CharacterMapsWorkspaceProps> = ({
  bookId,
  showGuide,
  viewingMap,
  onChangeViewingMap,
  maps,
  currentMapId,
  characters,
  onSelectMap,
  onUpdateMaps,
  onUpdateCharacters,
  onOpenImport,
}) => {
  const currentMap = maps.find(map => map.id === currentMapId);

  const addMap = () => {
    const newMap: CharacterDiagram = {
      id: `character-map-${Date.now()}`,
      name: `מפת דמויות חדשה ${maps.length + 1}`,
      connections: [],
      positions: {},
      characterIds: [],
    };
    onUpdateMaps([...maps, newMap]);
    onSelectMap(newMap.id);
  };

  const deleteMap = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm('למחוק את מפת הדמויות?')) return;
    onUpdateMaps(maps.filter(map => map.id !== id));
    if (currentMapId === id) onSelectMap(null);
  };

  const updateCurrentMap = (updates: Partial<CharacterDiagram>) => {
    if (!currentMap) return;
    onUpdateMaps(maps.map(map => map.id === currentMap.id ? { ...map, ...updates } : map));
  };

  const mapCharacters = currentMap
    ? (() => {
        const characterIds = new Set(getCharacterMapMemberIds(currentMap));
        return characters.filter(character => characterIds.has(character.id)).map(character => {
          const position = currentMap.positions[character.id];
          return position ? { ...character, ...position } : { ...character, x: undefined, y: undefined };
        });
      })()
    : characters;

  const addExistingCharacters = (characterIds: string[], rootFontSize?: number) => {
    if (!currentMap) return;
    const updatedMap = addExistingCharactersToMap(currentMap, characterIds, rootFontSize);
    if (updatedMap === currentMap) return;
    onUpdateMaps(maps.map(map => map.id === currentMap.id ? updatedMap : map));
  };

  const removeCharacter = (characterId: string) => {
    if (!currentMap) return;
    const updatedMap = removeCharacterFromMap(currentMap, characterId);
    onUpdateMaps(maps.map(map => map.id === currentMap.id ? updatedMap : map));
  };

  const updateCharacters = (updatedCharacters: QuestionnaireEntry[]) => {
    const positions = Object.fromEntries(
      updatedCharacters
        .filter(character => typeof character.x === 'number' && typeof character.y === 'number')
        .map(character => [character.id, { x: character.x!, y: character.y! }])
    );
    updateCurrentMap({ positions, characterIds: updatedCharacters.map(character => character.id) });

    const updatedById = new Map(updatedCharacters.map(character => [character.id, character]));
    const mergedCharacters = characters.map(character => {
      const updated = updatedById.get(character.id);
      if (!updated) return character;
      updatedById.delete(character.id);
      return { ...updated, x: character.x, y: character.y };
    });
    onUpdateCharacters([
      ...mergedCharacters,
      ...Array.from(updatedById.values()).map(character => ({ ...character, x: undefined, y: undefined })),
    ]);
  };

  const addNewCharacter = (rootFontSize?: number) => {
    const newNode = createCharacterEntry({ questionnaireVisibility: 'hidden' });
    const position = findCharacterMapPosition(
      getCharacterMapPosition(newNode), mapCharacters.map(getCharacterMapPosition), rootFontSize,
    );
    updateCharacters([...mapCharacters, { ...newNode, ...position }]);
    return newNode.id;
  };

  const editGuideCharacter = (id: string, updates: Partial<QuestionnaireEntry>) => {
    if (!mapCharacters.some(character => character.id === id)) return;
    onUpdateCharacters(characters.map(character => character.id === id ? { ...character, ...updates } : character));
  };

  return (
    <div className="h-full flex flex-col">
      {!currentMapId ? (
        <div className="flex-1 p-4 lg:p-12 lg:pt-24 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
              <h2 className="font-bold text-[var(--theme-accent)] handwritten text-3xl lg:text-4xl">מפות הדמויות שלי</h2>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={onOpenImport}
                  className="flex items-center gap-2 px-6 py-3 bg-[var(--theme-card)] text-[var(--theme-primary)] border border-[var(--theme-border)] rounded-2xl font-bold hover:bg-[var(--theme-secondary)] transition-all shadow-md"
                >
                  <CopyPlus size={20} />
                  <span>ייבוא מפות</span>
                </button>
                <button
                  onClick={addMap}
                  className="flex items-center gap-2 px-6 py-3 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg"
                >
                  <Plus size={20} />
                  <span>מפה חדשה</span>
                </button>
              </div>
            </div>

            {maps.length === 0 ? (
              <div className="bg-[var(--theme-card)]/50 border-2 border-dashed border-[var(--theme-border)] rounded-[3rem] p-8 lg:p-20 text-center">
                <div className="w-20 h-20 bg-[var(--theme-secondary)] text-[var(--theme-primary)] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users size={40} />
                </div>
                <h3 className="text-xl font-bold text-[var(--theme-accent)] mb-2">אין עדיין מפות דמויות</h3>
                <p className="text-[var(--theme-primary)]/60">צרו מפה חדשה כדי לארגן דמויות וקשרים בקבוצות שונות.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {maps.map(map => (
                  <div
                    key={map.id}
                    onClick={() => onSelectMap(map.id)}
                    className="group bg-[var(--theme-card)] rounded-[2rem] border border-[var(--theme-border)]/50 p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                  >
                    <div className="aspect-video bg-[var(--theme-secondary)]/30 rounded-xl mb-4 flex items-center justify-center border border-[var(--theme-border)]/50">
                      <Users size={36} className="text-[var(--theme-primary)]/30" />
                    </div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-[var(--theme-accent)] handwritten text-2xl truncate flex-1">{map.name}</h4>
                      <button
                        onClick={event => deleteMap(map.id, event)}
                        className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                        title="מחיקת מפה"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : currentMap && showGuide && viewingMap ? (
        <CharacterMapViewer
          key={JSON.stringify([bookId, currentMap.id])}
          characters={mapCharacters}
          connections={currentMap.connections}
          onBack={() => onChangeViewingMap(false)}
        />
      ) : currentMap && showGuide ? (
        <CharacterGuide
          key={JSON.stringify([bookId, currentMap.id])}
          characters={mapCharacters}
          bookCharacters={characters}
          onShowMap={() => onChangeViewingMap(true)}
          connections={currentMap.connections}
          onEditCharacter={editGuideCharacter}
          onAddNewCharacter={addNewCharacter}
          onAddExistingCharacters={addExistingCharacters}
          onRemoveCharacter={removeCharacter}
          onUpdateConnections={connections => updateCurrentMap({ connections })}
        />
      ) : currentMap ? (
        <CharacterMap
          characters={mapCharacters}
          bookCharacters={characters}
          connections={currentMap.connections}
          onUpdateCharacters={updateCharacters}
          onAddNewCharacter={addNewCharacter}
          onUpdateConnections={connections => updateCurrentMap({ connections })}
          onAddExistingCharacters={addExistingCharacters}
          onRemoveCharacterFromMap={removeCharacter}
        />
      ) : null}
    </div>
  );
};

export default CharacterMapsWorkspace;
