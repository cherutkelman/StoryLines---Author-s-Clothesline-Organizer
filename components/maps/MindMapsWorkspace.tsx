import React from 'react';
import { CopyPlus, Plus, Share2, Trash2 } from 'lucide-react';
import { MindMap } from '../../types';
import MindMapEditor from '../MindMapEditor';

interface MindMapsWorkspaceProps {
  maps: MindMap[];
  currentMapId: string | null;
  onSelectMap: (id: string | null) => void;
  onUpdateMaps: (maps: MindMap[]) => void;
  onOpenImport: () => void;
}

const MindMapsWorkspace: React.FC<MindMapsWorkspaceProps> = ({ maps: mindMaps, currentMapId: currentMindMapId, onSelectMap, onUpdateMaps: onUpdateMindMaps, onOpenImport }) => {
  const currentMindMap = mindMaps.find(map => map.id === currentMindMapId);
  const addMindMap = () => {
    const newMap: MindMap = { id: `mind-${Date.now()}`, name: `מפת חשיבה חדשה ${mindMaps.length + 1}`, nodes: [], edges: [] };
    onUpdateMindMaps([...mindMaps, newMap]);
    onSelectMap(newMap.id);
  };
  const deleteMindMap = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm('למחוק את מפת החשיבה?')) return;
    onUpdateMindMaps(mindMaps.filter(map => map.id !== id));
    if (currentMindMapId === id) onSelectMap(null);
  };
  const updateMindMap = (id: string, updates: Partial<MindMap>) =>
    onUpdateMindMaps(mindMaps.map(map => map.id === id ? { ...map, ...updates } : map));

  return (
<div className="h-full flex flex-col">
  {!currentMindMapId ? (
    <div className="flex-1 p-12 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-[var(--theme-accent)] handwritten text-4xl">מפות החשיבה שלי</h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={onOpenImport}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--theme-card)] text-[var(--theme-primary)] border border-[var(--theme-border)] rounded-2xl font-bold hover:bg-[var(--theme-secondary)] transition-all shadow-md"
            >
              <CopyPlus size={20} />
              <span>ייבוא מפות</span>
            </button>
            <button 
              onClick={addMindMap}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg"
            >
              <Plus size={20} />
              <span>מפה חדשה</span>
            </button>
          </div>
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
                onClick={() => onSelectMap(map.id)}
                className="group bg-[var(--theme-card)] rounded-[2rem] border border-[var(--theme-border)]/50 p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
              >
                <div className="aspect-video bg-[var(--theme-secondary)]/30 rounded-xl mb-4 flex items-center justify-center border border-[var(--theme-border)]/50 overflow-hidden">
                  <Share2 size={32} className="text-[var(--theme-primary)]/20" />
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[var(--theme-accent)] handwritten text-2xl truncate flex-1">{map.name}</h4>
                  <button 
                    onClick={(e) => deleteMindMap(map.id, e)}
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
    currentMindMap && (
      <MindMapEditor 
        map={currentMindMap}
        onUpdateMap={(updates) => updateMindMap(currentMindMap.id, updates)}
      />
    )
  )}
</div>
  );
};

export default MindMapsWorkspace;

