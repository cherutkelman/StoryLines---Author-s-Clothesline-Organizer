import React from 'react';
import { ChevronRight } from 'lucide-react';
import { MapTabId } from './mapsDefinitions';

interface SelectedMapHeaderProps {
  activeTab: MapTabId;
  worldMapId: string | null;
  worldMapName: string;
  mindMapId: string | null;
  mindMapName: string;
  characterMapId: string | null;
  characterMapName: string;
  onBackFromWorldMap: () => void;
  onBackFromMindMap: () => void;
  onBackFromCharacterMap: () => void;
  onRenameWorldMap: (name: string) => void;
  onRenameMindMap: (name: string) => void;
  onRenameCharacterMap: (name: string) => void;
  navigation: React.ReactNode;
}

const SelectedMapHeader: React.FC<SelectedMapHeaderProps> = props => {
  const isWorldMap = props.activeTab === 'worldMaps' && props.worldMapId;
  const isMindMap = props.activeTab === 'mindMaps' && props.mindMapId;
  const isCharacterMap = props.activeTab === 'characterDiagram' && props.characterMapId;
  if (!isWorldMap && !isMindMap && !isCharacterMap) return null;

  const isWorld = Boolean(isWorldMap);
  const selectedName = isWorld ? props.worldMapName : isMindMap ? props.mindMapName : props.characterMapName;
  const goBack = isWorld ? props.onBackFromWorldMap : isMindMap ? props.onBackFromMindMap : props.onBackFromCharacterMap;
  const rename = isWorld ? props.onRenameWorldMap : isMindMap ? props.onRenameMindMap : props.onRenameCharacterMap;
  return (
    <div className="flex-shrink-0 bg-[var(--theme-card)] border-b border-[var(--theme-border)] px-6 py-2 flex items-center justify-between gap-6 shadow-sm z-10">
      <div className="flex-1 flex justify-center">
        {props.navigation}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          onClick={goBack}
          className="text-xs font-bold text-[var(--theme-primary)] hover:underline flex items-center gap-1"
        >
          <ChevronRight size={14} />
          חזרה לרשימה
        </button>
        <div className="h-4 w-px bg-[var(--theme-border)]" />
        <input
          value={selectedName}
          onChange={event => rename(event.target.value)}
          className="text-sm font-bold bg-transparent border-none focus:ring-0 p-0 text-[var(--theme-accent)] handwritten text-xl"
          placeholder="שם המפה..."
        />
      </div>
    </div>
  );
};

export default SelectedMapHeader;
