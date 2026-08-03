import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Scene } from '../../types';

export const MultiScenePicker: React.FC<{
  links: { id: string; sceneId?: string; sceneName?: string }[];
  onUpdate: (newLinks: any[]) => void;
  scenes: Scene[];
  placeholder: string;
}> = ({ links = [], onUpdate, scenes = [], placeholder }) => {
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customName, setCustomName] = useState('');

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[24px]">
        {(links || []).map((link, idx) => (
          <div key={link.id} className="flex items-center gap-1.5 bg-white border border-[var(--theme-border)]/40 px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-sm group/chip">
            <span className="text-[var(--theme-primary)]">
              {link.sceneName || scenes.find(s => s.id === link.sceneId)?.title || '...'}
            </span>
            <button 
              onClick={() => onUpdate(links.filter((_, i) => i !== idx))}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {!isAddingCustom ? (
          <>
            <select
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                const scene = (scenes || []).find(s => s.id === e.target.value);
                onUpdate([...(links || []), { id: `link-${Date.now()}`, sceneId: e.target.value, sceneName: scene?.title }]);
              }}
              className="text-[11px] bg-white/80 border border-[var(--theme-border)]/30 rounded-lg px-2 py-1.5 outline-none flex-1 focus:ring-1 focus:ring-[var(--theme-accent)]/30 transition-all font-medium"
            >
              <option value="">{placeholder}</option>
              {(scenes || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            <button 
              onClick={() => setIsAddingCustom(true)}
              className="p-1.5 bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] rounded-lg hover:bg-[var(--theme-accent)]/20 transition-all"
              title="הוספה חופשית"
            >
              <Plus size={14} />
            </button>
          </>
        ) : (
          <div className="flex gap-1 flex-1">
            <input 
              autoFocus
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customName.trim()) {
                  onUpdate([...links, { id: `link-${Date.now()}`, sceneName: customName.trim() }]);
                  setCustomName('');
                  setIsAddingCustom(false);
                } else if (e.key === 'Escape') {
                  setIsAddingCustom(false);
                  setCustomName('');
                }
              }}
              placeholder="שם הסצנה..."
              className="text-[11px] bg-white border border-[var(--theme-border)]/30 rounded-lg px-2 py-1.5 outline-none flex-1 font-medium"
            />
            <button 
              onClick={() => {
                if (customName.trim()) {
                  onUpdate([...links, { id: `link-${Date.now()}`, sceneName: customName.trim() }]);
                  setCustomName('');
                  setIsAddingCustom(false);
                }
              }}
              className="px-2 py-1 bg-green-500 text-white rounded-lg text-[10px] font-bold"
            >
              הוסף
            </button>
            <button 
              onClick={() => setIsAddingCustom(false)}
              className="px-2 py-1 bg-gray-200 text-gray-600 rounded-lg text-[10px] font-bold"
            >
              ביטול
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiScenePicker;

