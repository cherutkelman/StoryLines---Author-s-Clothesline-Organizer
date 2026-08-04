import React from 'react';
import { MAP_NAV_ITEMS, MapTabId } from './mapsDefinitions';

interface MapsNavigationProps {
  activeTab: MapTabId;
  onChange: (tab: MapTabId) => void;
  embedded?: boolean;
}

const MapsNavigation: React.FC<MapsNavigationProps> = ({ activeTab, onChange, embedded = false }) => (
  <div className={`hidden lg:flex items-center gap-1 bg-[var(--theme-card)]/95 border border-[var(--theme-border)] rounded-2xl p-1.5 backdrop-blur-sm ${embedded ? 'shadow-sm' : 'absolute top-4 left-1/2 -translate-x-1/2 z-50 shadow-xl'}`}>
    {MAP_NAV_ITEMS.map(item => {
      const Icon = item.icon;
      const isActive = activeTab === item.id;
      return (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isActive ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-md' : 'text-[var(--theme-primary)]/60 hover:bg-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'}`}
        >
          <Icon size={16} />
          <span>{item.label}</span>
        </button>
      );
    })}
  </div>
);

export default MapsNavigation;
