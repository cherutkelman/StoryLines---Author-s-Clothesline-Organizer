import React, { useState, useEffect } from 'react';
import { Users, Map as MapIcon, Plus, Trash2, Edit2, ChevronRight, ChevronLeft, Share2 } from 'lucide-react';
import { QuestionnaireEntry, CharacterMapConnection, WorldMap, MindMap } from '../types';
import CharacterMap from './CharacterMap';
import WorldMapEditor from './WorldMapEditor';
import MindMapEditor from './MindMapEditor';

interface MapsManagerProps {
  characters: QuestionnaireEntry[];
  places: QuestionnaireEntry[];
  connections: CharacterMapConnection[];
  maps: WorldMap[];
  mindMaps: MindMap[];
  onUpdateCharacters: (chars: QuestionnaireEntry[]) => void;
  onUpdateConnections: (conns: CharacterMapConnection[]) => void;
  onUpdateMaps: (maps: WorldMap[]) => void;
  onUpdateMindMaps: (mindMaps: MindMap[]) => void;
  initialTab?: 'characterDiagram' | 'worldMaps' | 'mindMaps';
  onTabChange?: (tab: 'characterDiagram' | 'worldMaps' | 'mindMaps') => void;
  selectedMapId?: string | null;
  onMapSelect?: (id: string | null) => void;
  selectedMindMapId?: string | null;
  onMindMapSelect?: (id: string | null) => void;
}

const MapsManager: React.FC<MapsManagerProps> = ({
  characters,
  places = [],
  connections,
  maps,
  mindMaps = [],
  onUpdateCharacters,
  onUpdateConnections,
  onUpdateMaps,
  onUpdateMindMaps,
  initialTab = 'characterDiagram',
  onTabChange,
  selectedMapId,
  onMapSelect,
  selectedMindMapId,
  onMindMapSelect
}) => {
  const [activeTab, setActiveTab] = useState<'characterDiagram' | 'worldMaps' | 'mindMaps'>(initialTab);
  const [currentMapId, setCurrentMapId] = useState<string | null>(selectedMapId || null);
  const [currentMindMapId, setCurrentMindMapId] = useState<string | null>(selectedMindMapId || null);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (selectedMapId) setCurrentMapId(selectedMapId);
  }, [selectedMapId]);

  useEffect(() => {
    if (selectedMindMapId) setCurrentMindMapId(selectedMindMapId);
  }, [selectedMindMapId]);

  const handleTabChange = (tab: 'characterDiagram' | 'worldMaps' | 'mindMaps') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const addMap = () => {
    const newMap: WorldMap = {
      id: `map-${Date.now()}`,
      name: `מפה חדשה ${maps.length + 1}`,
      elements: []
    };
    onUpdateMaps([...maps, newMap]);
    setCurrentMapId(newMap.id);
    onMapSelect?.(newMap.id);
  };

  const deleteMap = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('למחוק את המפה?')) {
      const updated = maps.filter(m => m.id !== id);
      onUpdateMaps(updated);
      if (currentMapId === id) {
        setCurrentMapId(null);
        onMapSelect?.(null);
      }
    }
  };

  const renameMap = (id: string, name: string) => {
    const updated = maps.map(m => m.id === id ? { ...m, name } : m);
    onUpdateMaps(updated);
  };

  const updateMap = (id: string, updates: Partial<WorldMap>) => {
    const updated = maps.map(m => m.id === id ? { ...m, ...updates } : m);
    onUpdateMaps(updated);
  };

  const addMindMap = () => {
    const newMap: MindMap = {
      id: `mind-${Date.now()}`,
      name: `מפת חשיבה חדשה ${mindMaps.length + 1}`,
      nodes: [],
      edges: []
    };
    onUpdateMindMaps([...mindMaps, newMap]);
    setCurrentMindMapId(newMap.id);
    onMindMapSelect?.(newMap.id);
  };

  const deleteMindMap = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('למחוק את מפת החשיבה?')) {
      const updated = mindMaps.filter(m => m.id !== id);
      onUpdateMindMaps(updated);
      if (currentMindMapId === id) {
        setCurrentMindMapId(null);
        onMindMapSelect?.(null);
      }
    }
  };

  const renameMindMap = (id: string, name: string) => {
    const updated = mindMaps.map(m => m.id === id ? { ...m, name } : m);
    onUpdateMindMaps(updated);
  };

  const updateMindMap = (id: string, updates: Partial<MindMap>) => {
    const updated = mindMaps.map(m => m.id === id ? { ...m, ...updates } : m);
    onUpdateMindMaps(updated);
  };

  const currentMap = maps.find(m => m.id === currentMapId);
  const currentMindMap = mindMaps.find(m => m.id === currentMindMapId);

  return (
    <div className="h-full flex flex-col bg-[var(--theme-bg)]">
      <div className="flex-shrink-0 bg-[var(--theme-card)] border-b border-[var(--theme-border)] px-6 py-2 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-1 bg-[var(--theme-secondary)]/50 p-1 rounded-xl border border-[var(--theme-border)]/50 overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => handleTabChange('characterDiagram')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'characterDiagram' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-md' : 'text-[var(--theme-primary)]/60 hover:text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]'}`}
          >
            <Users size={14} />
            <span>מפת דמויות</span>
          </button>
          <button 
            onClick={() => handleTabChange('worldMaps')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'worldMaps' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-md' : 'text-[var(--theme-primary)]/60 hover:text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]'}`}
          >
            <MapIcon size={14} />
            <span>מפות עולם</span>
          </button>
          <button 
            onClick={() => handleTabChange('mindMaps')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'mindMaps' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-md' : 'text-[var(--theme-primary)]/60 hover:text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]'}`}
          >
            <Share2 size={14} />
            <span>מפות חשיבה</span>
          </button>
        </div>

        {activeTab === 'worldMaps' && currentMapId && (
          <div className="flex items-center gap-3">
             <button 
               onClick={() => { setCurrentMapId(null); onMapSelect?.(null); }}
               className="text-xs font-bold text-[var(--theme-primary)] hover:underline flex items-center gap-1"
             >
               <ChevronRight size={14} />
               חזרה לרשימה
             </button>
             <div className="h-4 w-px bg-[var(--theme-border)]" />
             <input 
               value={currentMap?.name || ''}
               onChange={(e) => renameMap(currentMapId, e.target.value)}
               className="text-sm font-bold bg-transparent border-none focus:ring-0 p-0 text-[var(--theme-accent)] handwritten text-xl"
               placeholder="שם המפה..."
             />
          </div>
        )}

        {activeTab === 'mindMaps' && currentMindMapId && (
          <div className="flex items-center gap-3">
             <button 
               onClick={() => { setCurrentMindMapId(null); onMindMapSelect?.(null); }}
               className="text-xs font-bold text-[var(--theme-primary)] hover:underline flex items-center gap-1"
             >
               <ChevronRight size={14} />
               חזרה לרשימה
             </button>
             <div className="h-4 w-px bg-[var(--theme-border)]" />
             <input 
               value={currentMindMap?.name || ''}
               onChange={(e) => renameMindMap(currentMindMapId, e.target.value)}
               className="text-sm font-bold bg-transparent border-none focus:ring-0 p-0 text-[var(--theme-accent)] handwritten text-xl"
               placeholder="שם המפה..."
             />
          </div>
        )}
      </div>

      <div className="flex-1 relative overflow-hidden">
        {activeTab === 'characterDiagram' ? (
          <CharacterMap 
            characters={characters}
            connections={connections}
            onUpdateCharacters={onUpdateCharacters}
            onUpdateConnections={onUpdateConnections}
          />
        ) : activeTab === 'worldMaps' ? (
          <div className="h-full flex flex-col">
            {!currentMapId ? (
              <div className="flex-1 p-12 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-[var(--theme-accent)] handwritten text-4xl">המפות שלי</h2>
                    <button 
                      onClick={addMap}
                      className="flex items-center gap-2 px-6 py-3 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg"
                    >
                      <Plus size={20} />
                      <span>מפה חדשה</span>
                    </button>
                  </div>

                  {maps.length === 0 ? (
                    <div className="bg-[var(--theme-card)]/50 border-2 border-dashed border-[var(--theme-border)] rounded-[3rem] p-20 text-center">
                      <div className="w-20 h-20 bg-[var(--theme-secondary)] text-[var(--theme-primary)] rounded-full flex items-center justify-center mx-auto mb-6">
                        <MapIcon size={40} />
                      </div>
                      <h3 className="text-xl font-bold text-[var(--theme-accent)] mb-2">אין עדיין מפות</h3>
                      <p className="text-[var(--theme-primary)]/60 max-w-sm mx-auto">צור מפה חדשה כדי להתחיל לאייר את העולם שלך, להוסיף בתים, הרים ושמות למקומות.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {maps.map(map => (
                        <div 
                          key={map.id}
                          onClick={() => { setCurrentMapId(map.id); onMapSelect?.(map.id); }}
                          className="group bg-[var(--theme-card)] rounded-[2rem] border border-[var(--theme-border)]/50 p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                        >
                          <div className="aspect-video bg-[var(--theme-secondary)]/30 rounded-xl mb-4 flex items-center justify-center border border-[var(--theme-border)]/50 overflow-hidden">
                            {map.backgroundImage ? (
                              <img src={map.backgroundImage} alt={map.name} className="w-full h-full object-cover opacity-50" />
                            ) : (
                              <MapIcon size={32} className="text-[var(--theme-primary)]/20" />
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-[var(--theme-accent)] handwritten text-2xl truncate flex-1">{map.name}</h4>
                            <button 
                              onClick={(e) => deleteMap(map.id, e)}
                              className="p-2 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
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
            ) : (
              currentMap && (
                <WorldMapEditor 
                  map={currentMap}
                  places={places}
                  onUpdateMap={(updates) => updateMap(currentMap.id, updates)}
                />
              )
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {!currentMindMapId ? (
              <div className="flex-1 p-12 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-[var(--theme-accent)] handwritten text-4xl">מפות החשיבה שלי</h2>
                    <button 
                      onClick={addMindMap}
                      className="flex items-center gap-2 px-6 py-3 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg"
                    >
                      <Plus size={20} />
                      <span>מפה חדשה</span>
                    </button>
                  </div>

                  {mindMaps.length === 0 ? (
                    <div className="bg-[var(--theme-card)]/50 border-2 border-dashed border-[var(--theme-border)] rounded-[3rem] p-20 text-center">
                      <div className="w-20 h-20 bg-[var(--theme-secondary)] text-[var(--theme-primary)] rounded-full flex items-center justify-center mx-auto mb-6">
                        <Share2 size={40} />
                      </div>
                      <h3 className="text-xl font-bold text-[var(--theme-accent)] mb-2">אין עדיין מפות חשיבה</h3>
                      <p className="text-[var(--theme-primary)]/60 max-w-sm mx-auto">צור מפת חשיבה חדשה כדי לארגן את הרעיונות שלך, לחבר בין מושגים ולתכנן את העלילה.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {mindMaps.map(map => (
                        <div 
                          key={map.id}
                          onClick={() => { setCurrentMindMapId(map.id); onMindMapSelect?.(map.id); }}
                          className="group bg-[var(--theme-card)] rounded-[2rem] border border-[var(--theme-border)]/50 p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                        >
                          <div className="aspect-video bg-[var(--theme-secondary)]/30 rounded-xl mb-4 flex items-center justify-center border border-[var(--theme-border)]/50 overflow-hidden">
                            <Share2 size={32} className="text-[var(--theme-primary)]/20" />
                          </div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-[var(--theme-accent)] handwritten text-2xl truncate flex-1">{map.name}</h4>
                            <button 
                              onClick={(e) => deleteMindMap(map.id, e)}
                              className="p-2 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
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
            ) : (
              currentMindMap && (
                <MindMapEditor 
                  map={currentMindMap}
                  onUpdateMap={(updates) => updateMindMap(currentMindMap.id, updates)}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MapsManager;
