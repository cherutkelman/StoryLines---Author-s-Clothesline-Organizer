import React from 'react';
import { ChevronRight } from 'lucide-react';
import { MapTabId } from './mapsDefinitions';

interface SelectedMapHeaderProps {
  activeTab: MapTabId;
  worldMapId: string | null;
  worldMapName: string;
  mindMapId: string | null;
  mindMapName: string;
  onBackFromWorldMap: () => void;
  onBackFromMindMap: () => void;
  onRenameWorldMap: (name: string) => void;
  onRenameMindMap: (name: string) => void;
}

const SelectedMapHeader: React.FC<SelectedMapHeaderProps> = props => {
  const isWorldMap = props.activeTab === 'worldMaps' && props.worldMapId;
  const isMindMap = props.activeTab === 'mindMaps' && props.mindMapId;
  if (!isWorldMap && !isMindMap) return null;

  const isWorld = Boolean(isWorldMap);
  return (
    <div className="flex-shrink-0 bg-[var(--theme-card)] border-b border-[var(--theme-border)] px-6 py-2 flex items-center justify-end shadow-sm z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={isWorld ? props.onBackFromWorldMap : props.onBackFromMindMap}
          className="text-xs font-bold text-[var(--theme-primary)] hover:underline flex items-center gap-1"
        >
          <ChevronRight size={14} />
          חזרה לרשימה
        </button>
        <div className="h-4 w-px bg-[var(--theme-border)]" />
        <input
          value={isWorld ? props.worldMapName : props.mindMapName}
          onChange={event => isWorld ? props.onRenameWorldMap(event.target.value) : props.onRenameMindMap(event.target.value)}
          className="text-sm font-bold bg-transparent border-none focus:ring-0 p-0 text-[var(--theme-accent)] handwritten text-xl"
          placeholder="שם המפה..."
        />
      </div>
    </div>
  );
};

export default SelectedMapHeader;
