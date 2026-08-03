import React from 'react';
import { Layout, Share2, TrendingUp, X } from 'lucide-react';
import type { PlotStructureSubView } from '../../types';

interface PlotPlanningNavigationProps {
  activeSubView: PlotStructureSubView;
  onChange: (subView: PlotStructureSubView) => void;
}

const items: Array<{ id: PlotStructureSubView; label: string; icon: React.ElementType }> = [
  { id: 'structure', label: 'מבנה עלילה', icon: Layout },
  { id: 'relationships', label: 'מערכת יחסים', icon: Share2 },
  { id: 'arc', label: 'קשת התפתחות', icon: TrendingUp },
  { id: 'conflicts', label: 'מניע ומטרה', icon: X },
];

const PlotPlanningNavigation: React.FC<PlotPlanningNavigationProps> = ({ activeSubView, onChange }) => (
  <div className="flex items-center justify-center gap-2 mb-8 bg-[var(--theme-secondary)]/30 p-2 rounded-3xl border border-[var(--theme-border)]/30 w-fit mx-auto">
    {items.map(item => {
      const Icon = item.icon;
      return (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all ${
            activeSubView === item.id
              ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-lg'
              : 'text-[var(--theme-primary)]/60 hover:text-[var(--theme-primary)]'
          }`}
        >
          <Icon size={18} />
          {item.label}
        </button>
      );
    })}
  </div>
);

export default PlotPlanningNavigation;
