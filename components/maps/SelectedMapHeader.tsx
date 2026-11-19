import React from 'react';
import { ChevronRight } from 'lucide-react';
import { MapTabId } from './mapsDefinitions';

interface SelectedMapHeaderProps {
  activeTab: MapTabId;
  worldMapId: string | null;
  worldMapName: string;
  mindMapId: string | null;
  mindMapName: string;
  mindMapReadOnly?: boolean;
  characterMapId: string | null;
  characterMapName: string;
  characterMapReadOnly: boolean;
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
  const compactHeader = isCharacterMap || isMindMap;
  const readOnly = (isCharacterMap && props.characterMapReadOnly) || (isMindMap && props.mindMapReadOnly);

  const isWorld = Boolean(isWorldMap);
  const selectedName = isWorld ? props.worldMapName : isMindMap ? props.mindMapName : props.characterMapName;
  const goBack = isWorld ? props.onBackFromWorldMap : isMindMap ? props.onBackFromMindMap : props.onBackFromCharacterMap;
  const rename = isWorld ? props.onRenameWorldMap : isMindMap ? props.onRenameMindMap : props.onRenameCharacterMap;
  return (
    <div className={`flex-shrink-0 bg-[var(--theme-card)] border-b border-[var(--theme-border)] py-2 flex items-center justify-between shadow-sm z-10 ${compactHeader ? 'px-3 gap-2 lg:px-6 lg:gap-6' : 'px-6 gap-6'}`}>
      <div className={`flex-1 justify-center ${compactHeader ? 'hidden lg:flex' : 'flex'}`}>
        {props.navigation}
      </div>
      <div className={`flex items-center gap-3 ${compactHeader ? 'w-full min-w-0 lg:w-auto lg:shrink-0' : 'shrink-0'}`}>
        <button
          onClick={goBack}
          className={`text-xs font-bold text-[var(--theme-primary)] hover:underline flex items-center gap-1 ${compactHeader ? 'shrink-0 min-h-11 lg:min-h-0' : ''}`}
        >
          <ChevronRight size={14} />
          חזרה לרשימה
        </button>
        <div className="h-4 w-px bg-[var(--theme-border)]" />
        {readOnly ? (
          <span className="min-w-0 truncate font-bold text-[var(--theme-accent)]" title={selectedName}>{selectedName}</span>
        ) : <input
          value={selectedName}
          onChange={event => rename(event.target.value)}
          className={`text-sm font-bold bg-transparent border-none focus:ring-0 p-0 text-[var(--theme-accent)] handwritten text-xl ${compactHeader ? 'min-w-0 w-full lg:w-auto' : ''} ${isMindMap ? 'min-h-11 lg:min-h-0' : ''}`}
          aria-label={compactHeader ? 'שם המפה' : undefined}
          dir={isMindMap ? 'rtl' : undefined}
          placeholder="שם המפה..."
        />}
      </div>
    </div>
  );
};

export default SelectedMapHeader;
