import React, { useState, useEffect, useMemo } from 'react';
import MapGallery from './MapGallery';
import { type MapTabId } from './mapNavigation';
import MapsNavigation from './maps/MapsNavigation';
import WorldMapsWorkspace from './maps/WorldMapsWorkspace';
import MindMapsWorkspace from './maps/MindMapsWorkspace';
import MapsImportDialog from './maps/MapsImportDialog';
import { MapsManagerProps } from './maps/mapsTypes';
import SelectedMapHeader from './maps/SelectedMapHeader';
import CharacterMapsWorkspace from './maps/CharacterMapsWorkspace';
import { ImportMapCategory } from './maps/mapsDefinitions';

const MapsManager: React.FC<MapsManagerProps> = ({
  allBooks,
  activeBookId,
  characters,
  places = [],
  connections,
  characterMaps = [],
  maps,
  mindMaps = [],
  mapGallery,
  onUpdateCharacters,
  onUpdateConnections,
  onUpdateCharacterMaps,
  onUpdateMaps,
  onUpdateMindMaps,
  onUpdateMapGallery,
  initialTab = 'characterDiagram',
  onTabChange,
  selectedMapId,
  onMapSelect,
  selectedMindMapId,
  onMindMapSelect,
  selectedCharacterMapId,
  onCharacterMapSelect
}) => {
  const [activeTab, setActiveTab] = useState<MapTabId>(initialTab);
  const [currentMapId, setCurrentMapId] = useState<string | null>(selectedMapId || null);
  const [currentMindMapId, setCurrentMindMapId] = useState<string | null>(selectedMindMapId || null);
  const [currentCharacterMapId, setCurrentCharacterMapId] = useState<string | null>(selectedCharacterMapId || null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCategory, setImportCategory] = useState<ImportMapCategory>('worldMaps');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setCurrentMapId(selectedMapId || null);
  }, [selectedMapId]);

  useEffect(() => {
    setCurrentMindMapId(selectedMindMapId || null);
  }, [selectedMindMapId]);

  useEffect(() => {
    setCurrentCharacterMapId(selectedCharacterMapId || null);
  }, [selectedCharacterMapId]);

  const effectiveCharacterMaps = useMemo(() => {
    if (characterMaps.length > 0) return characterMaps;
    const positions = Object.fromEntries(
      characters
        .filter(character => typeof character.x === 'number' && typeof character.y === 'number')
        .map(character => [character.id, { x: character.x!, y: character.y! }])
    );
    if (characters.length === 0 && connections.length === 0 && Object.keys(positions).length === 0) return [];
    return [{ id: 'legacy-character-map', name: 'מפת דמויות 1', connections, positions, characterIds: characters.map(character => character.id) }];
  }, [characterMaps, characters, connections]);

  useEffect(() => {
    if (currentMapId && !maps.some(map => map.id === currentMapId)) {
      setCurrentMapId(null);
      onMapSelect?.(null);
    }
  }, [maps, currentMapId, onMapSelect]);

  useEffect(() => {
    if (currentMindMapId && !mindMaps.some(map => map.id === currentMindMapId)) {
      setCurrentMindMapId(null);
      onMindMapSelect?.(null);
    }
  }, [mindMaps, currentMindMapId, onMindMapSelect]);

  useEffect(() => {
    if (currentCharacterMapId && !effectiveCharacterMaps.some(map => map.id === currentCharacterMapId)) {
      setCurrentCharacterMapId(null);
      onCharacterMapSelect?.(null);
    }
  }, [effectiveCharacterMaps, currentCharacterMapId, onCharacterMapSelect]);

  const renameMap = (id: string, name: string) => {
    const updated = maps.map(m => m.id === id ? { ...m, name } : m);
    onUpdateMaps(updated);
  };

  const renameMindMap = (id: string, name: string) => {
    const updated = mindMaps.map(m => m.id === id ? { ...m, name } : m);
    onUpdateMindMaps(updated);
  };

  const renameCharacterMap = (id: string, name: string) => {
    onUpdateCharacterMaps(effectiveCharacterMaps.map(map => map.id === id ? { ...map, name } : map));
  };

  const currentMap = maps.find(m => m.id === currentMapId);
  const currentMindMap = mindMaps.find(m => m.id === currentMindMapId);
  const currentCharacterMap = effectiveCharacterMaps.find(m => m.id === currentCharacterMapId);
  const hasSelectedMap = Boolean(
    (activeTab === 'characterDiagram' && currentCharacterMapId) ||
    (activeTab === 'worldMaps' && currentMapId) ||
    (activeTab === 'mindMaps' && currentMindMapId)
  );

  const switchTab = (tab: MapTabId) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--theme-bg)]">
      <SelectedMapHeader
        activeTab={activeTab}
        worldMapId={currentMapId}
        worldMapName={currentMap?.name || ''}
        mindMapId={currentMindMapId}
        mindMapName={currentMindMap?.name || ''}
        characterMapId={currentCharacterMapId}
        characterMapName={currentCharacterMap?.name || ''}
        onBackFromWorldMap={() => { setCurrentMapId(null); onMapSelect?.(null); }}
        onBackFromMindMap={() => { setCurrentMindMapId(null); onMindMapSelect?.(null); }}
        onBackFromCharacterMap={() => { setCurrentCharacterMapId(null); onCharacterMapSelect?.(null); }}
        onRenameWorldMap={(name) => currentMapId && renameMap(currentMapId, name)}
        onRenameMindMap={(name) => currentMindMapId && renameMindMap(currentMindMapId, name)}
        onRenameCharacterMap={(name) => currentCharacterMapId && renameCharacterMap(currentCharacterMapId, name)}
        navigation={<MapsNavigation activeTab={activeTab} onChange={switchTab} embedded />}
      />

      <div className="flex-1 relative overflow-hidden">
        {!hasSelectedMap && activeTab !== 'gallery' && (
          <MapsNavigation activeTab={activeTab} onChange={switchTab} />
        )}
        {activeTab === 'characterDiagram' ? (
          <CharacterMapsWorkspace
            maps={effectiveCharacterMaps}
            currentMapId={currentCharacterMapId}
            characters={characters}
            onSelectMap={(id) => { setCurrentCharacterMapId(id); onCharacterMapSelect?.(id); }}
            onUpdateMaps={onUpdateCharacterMaps}
            onUpdateCharacters={onUpdateCharacters}
            onOpenImport={() => { setImportCategory('characterMaps'); setIsImportModalOpen(true); }}
          />
        ) : activeTab === 'worldMaps' ? (
          <WorldMapsWorkspace
            maps={maps}
            currentMapId={currentMapId}
            places={places}
            onSelectMap={(id) => { setCurrentMapId(id); onMapSelect?.(id); }}
            onUpdateMaps={onUpdateMaps}
            onOpenImport={() => { setImportCategory('worldMaps'); setIsImportModalOpen(true); }}
          />
        ) : activeTab === 'mindMaps' ? (
          <MindMapsWorkspace
            maps={mindMaps}
            currentMapId={currentMindMapId}
            onSelectMap={(id) => { setCurrentMindMapId(id); onMindMapSelect?.(id); }}
            onUpdateMaps={onUpdateMindMaps}
            onOpenImport={() => { setImportCategory('mindMaps'); setIsImportModalOpen(true); }}
          />
        ) : (
          <div className="h-full box-border">
            <MapGallery
              gallery={mapGallery}
              onUpdateGallery={onUpdateMapGallery}
              navigation={<MapsNavigation activeTab={activeTab} onChange={switchTab} embedded />}
            />
          </div>
        )}
      </div>

      <MapsImportDialog
        isOpen={isImportModalOpen}
        category={importCategory}
        allBooks={allBooks}
        activeBookId={activeBookId}
        maps={maps}
        mindMaps={mindMaps}
        characterMaps={effectiveCharacterMaps}
        characters={characters}
        onUpdateMaps={onUpdateMaps}
        onUpdateMindMaps={onUpdateMindMaps}
        onUpdateCharacterMaps={onUpdateCharacterMaps}
        onUpdateCharacters={onUpdateCharacters}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};

export default MapsManager;
