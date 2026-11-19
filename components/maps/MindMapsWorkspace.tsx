import React from 'react';
import { CopyPlus, Plus, Share2, Trash2 } from 'lucide-react';
import { MindMap } from '../../types';
import MindMapEditor from '../MindMapEditor';
import MindMapIdeas from './MindMapIdeas';
import MindMapViewer from './MindMapViewer';
import './mindMapsGallery.css';

interface MindMapsWorkspaceProps {
  bookId?: string;
  showIdeas?: boolean;
  viewingMap?: boolean;
  onChangeViewingMap: (viewing: boolean) => void;
  maps: MindMap[];
  currentMapId: string | null;
  onSelectMap: (id: string | null) => void;
  onUpdateMaps: (maps: MindMap[]) => void;
  onOpenImport: () => void;
}

const MindMapsWorkspace: React.FC<MindMapsWorkspaceProps> = ({
  bookId, showIdeas, viewingMap, onChangeViewingMap, maps: mindMaps, currentMapId: currentMindMapId,
  onSelectMap, onUpdateMaps: onUpdateMindMaps, onOpenImport,
}) => {
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
    <div dir="rtl" className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3 sm:p-6 lg:p-12 lg:pt-24">
      <div className="min-w-0 max-w-4xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 lg:mb-8">
          <h2 className="text-3xl font-bold text-[var(--theme-accent)] handwritten lg:text-4xl">מפות החשיבה שלי</h2>
          <div className="flex min-w-0 flex-wrap items-center gap-2 lg:gap-3">
            <button 
              onClick={onOpenImport}
              className="flex min-h-11 items-center gap-2 px-3 py-3 lg:px-6 bg-[var(--theme-card)] text-[var(--theme-primary)] border border-[var(--theme-border)] rounded-2xl font-bold hover:bg-[var(--theme-secondary)] transition-all shadow-md"
            >
              <CopyPlus size={20} />
              <span>ייבוא מפות</span>
            </button>
            <button 
              onClick={addMindMap}
              className="flex min-h-11 items-center gap-2 px-3 py-3 lg:px-6 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg"
            >
              <Plus size={20} />
              <span>מפה חדשה</span>
            </button>
          </div>
        </div>

        {mindMaps.length === 0 ? (
          <div className="bg-[var(--theme-card)]/50 border-2 border-dashed border-[var(--theme-border)] rounded-[3rem] p-6 lg:p-20 text-center">
            <div className="w-20 h-20 bg-[var(--theme-secondary)] text-[var(--theme-primary)] rounded-full flex items-center justify-center mx-auto mb-6">
              <Share2 size={40} />
            </div>
            <h3 className="text-xl font-bold text-[var(--theme-accent)] mb-2">אין עדיין מפות חשיבה</h3>
            <p className="text-[var(--theme-primary)]/60 max-w-sm mx-auto">צור מפת חשיבה חדשה כדי לארגן את הרעיונות שלך, לחבר בין מושגים ולתכנן את העלילה.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {mindMaps.map(map => (
              <div 
                key={map.id}
                className="mind-map-gallery-card group relative min-w-0 overflow-hidden rounded-[2rem] border border-[var(--theme-border)]/50 bg-[var(--theme-card)] p-4 shadow-sm transition-all hover:shadow-xl lg:p-6"
              >
                <div className="aspect-video bg-[var(--theme-secondary)]/30 rounded-xl mb-4 flex items-center justify-center border border-[var(--theme-border)]/50 overflow-hidden">
                  <Share2 size={32} className="text-[var(--theme-primary)]/20" />
                </div>
                <button type="button" aria-label={`פתיחת מפה: ${map.name}`} onClick={() => onSelectMap(map.id)}
                  className="absolute inset-0 cursor-pointer rounded-[2rem] focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-[var(--theme-accent)]" />
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <h4 className="min-w-0 flex-1 break-words font-bold text-[var(--theme-accent)] handwritten text-2xl lg:truncate">{map.name}</h4>
                  <button 
                    onClick={(e) => deleteMindMap(map.id, e)}
                    className="mind-map-gallery-delete relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-red-400 transition-all hover:bg-red-50 hover:text-red-500"
                    aria-label={`מחיקת מפה: ${map.name}`}
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
    currentMindMap && (showIdeas && viewingMap ? (
      <MindMapViewer
        key={JSON.stringify([bookId, currentMindMap.id])}
        map={currentMindMap}
        onBack={() => onChangeViewingMap(false)}
      />
    ) : showIdeas ? (
      <MindMapIdeas
        key={JSON.stringify([bookId, currentMindMap.id])}
        map={currentMindMap}
        onShowMap={() => onChangeViewingMap(true)}
        onUpdateMap={updates => updateMindMap(currentMindMap.id, updates)}
      />
    ) : (
      <MindMapEditor 
        map={currentMindMap}
        onUpdateMap={(updates) => updateMindMap(currentMindMap.id, updates)}
      />
    ))
  )}
</div>
  );
};

export default MindMapsWorkspace;
