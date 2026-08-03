import React, { useState, useEffect } from 'react';
import CharacterMap from './CharacterMap';
import MapGallery from './MapGallery';
import { type MapTabId } from './mapNavigation';
import MapsNavigation from './maps/MapsNavigation';
import WorldMapsWorkspace from './maps/WorldMapsWorkspace';
import MindMapsWorkspace from './maps/MindMapsWorkspace';
import MapsImportDialog from './maps/MapsImportDialog';
import { MapsManagerProps } from './maps/mapsTypes';
import SelectedMapHeader from './maps/SelectedMapHeader';

const MapsManager: React.FC<MapsManagerProps> = ({
  allBooks,
  activeBookId,
  characters,
  places = [],
  connections,
  maps,
  mindMaps = [],
  mapGallery,
  onUpdateCharacters,
  onUpdateConnections,
  onUpdateMaps,
  onUpdateMindMaps,
  onUpdateMapGallery,
  initialTab = 'characterDiagram',
  onTabChange,
  selectedMapId,
  onMapSelect,
  selectedMindMapId,
  onMindMapSelect
}) => {
  const [activeTab, setActiveTab] = useState<MapTabId>(initialTab);
  const [currentMapId, setCurrentMapId] = useState<string | null>(selectedMapId || null);
  const [currentMindMapId, setCurrentMindMapId] = useState<string | null>(selectedMindMapId || null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCategory, setImportCategory] = useState<'worldMaps' | 'mindMaps'>('worldMaps');

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

  const renameMap = (id: string, name: string) => {
    const updated = maps.map(m => m.id === id ? { ...m, name } : m);
    onUpdateMaps(updated);
  };

  const renameMindMap = (id: string, name: string) => {
    const updated = mindMaps.map(m => m.id === id ? { ...m, name } : m);
    onUpdateMindMaps(updated);
  };

  const currentMap = maps.find(m => m.id === currentMapId);
  const currentMindMap = mindMaps.find(m => m.id === currentMindMapId);

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
        onBackFromWorldMap={() => { setCurrentMapId(null); onMapSelect?.(null); }}
        onBackFromMindMap={() => { setCurrentMindMapId(null); onMindMapSelect?.(null); }}
        onRenameWorldMap={(name) => currentMapId && renameMap(currentMapId, name)}
        onRenameMindMap={(name) => currentMindMapId && renameMindMap(currentMindMapId, name)}
      />

      <div className="flex-1 relative overflow-hidden">
        <MapsNavigation activeTab={activeTab} onChange={switchTab} />
        {activeTab === 'characterDiagram' ? (
          <CharacterMap 
            characters={characters}
            connections={connections}
            onUpdateCharacters={onUpdateCharacters}
            onUpdateConnections={onUpdateConnections}
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
          <div className="h-full box-border lg:pt-24">
            <MapGallery
              gallery={mapGallery}
              onUpdateGallery={onUpdateMapGallery}
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
        onUpdateMaps={onUpdateMaps}
        onUpdateMindMaps={onUpdateMindMaps}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};

export default MapsManager;
