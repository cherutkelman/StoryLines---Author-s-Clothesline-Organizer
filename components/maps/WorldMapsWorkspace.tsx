import React from 'react';
import { CopyPlus, Map as MapIcon, Plus, Trash2 } from 'lucide-react';
import { QuestionnaireEntry, WorldMap } from '../../types';
import WorldMapEditor from '../WorldMapEditor';

interface WorldMapsWorkspaceProps {
  maps: WorldMap[];
  currentMapId: string | null;
  places: QuestionnaireEntry[];
  onSelectMap: (id: string | null) => void;
  onUpdateMaps: (maps: WorldMap[]) => void;
  onOpenImport: () => void;
}

const WorldMapsWorkspace: React.FC<WorldMapsWorkspaceProps> = ({
  maps,
  currentMapId,
  places,
  onSelectMap,
  onUpdateMaps,
  onOpenImport,
}) => {
  const currentMap = maps.find(map => map.id === currentMapId);
  const addMap = () => {
    const newMap: WorldMap = { id: `map-${Date.now()}`, name: `מפה חדשה ${maps.length + 1}`, elements: [] };
    onUpdateMaps([...maps, newMap]);
    onSelectMap(newMap.id);
  };
  const deleteMap = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm('למחוק את המפה?')) return;
    onUpdateMaps(maps.filter(map => map.id !== id));
    if (currentMapId === id) onSelectMap(null);
  };
  const updateMap = (id: string, updates: Partial<WorldMap>) =>
    onUpdateMaps(maps.map(map => map.id === id ? { ...map, ...updates } : map));

  return (
<div className="h-full flex flex-col">
  {!currentMapId ? (
    <div className="flex-1 p-12 lg:pt-24 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-[var(--theme-accent)] handwritten text-4xl">המפות שלי</h2>
          <div className="flex items-center gap-3">
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
                onClick={() => onSelectMap(map.id)}
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
                    className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
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
  );
};

export default WorldMapsWorkspace;
