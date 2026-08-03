import React from 'react';
import { CheckCircle2, ChevronDown, Flag } from 'lucide-react';
import type { Plotline, Scene } from '../../types';
import type { BookSequenceDisplayItem } from '../../src/book-sequence';
import type { EditorDisplayMode } from './editorTypes';

interface EditorSceneListProps {
  items: BookSequenceDisplayItem[];
  plotlines: Plotline[];
  displayMode: EditorDisplayMode;
  expandedSceneIds: string[];
  onSelectScene: (sceneId: string) => void | Promise<void>;
  renderExpandedScene: (scene: Scene, plotline: Plotline | undefined) => React.ReactNode;
}

const isInteractiveElement = (target: EventTarget | null) => {
  return target instanceof HTMLElement && Boolean(target.closest('button, input, textarea, select, a'));
};

const EditorSceneList: React.FC<EditorSceneListProps> = ({ items, plotlines, displayMode, expandedSceneIds, onSelectScene, renderExpandedScene }) => (
  <div className="space-y-4">
    {items.map((item, idx) => {
      if (item.type === 'chapter-divider') {
        return (
          <div key={item.id} className="pt-16 pb-6 border-b-4 border-[var(--theme-primary)]/10 mb-12 flex items-center gap-4">
            <div className="bg-[var(--theme-primary)] p-2 rounded-xl text-[var(--theme-card)]">
              <Flag size={20} />
            </div>
            <div className="text-4xl font-black text-[var(--theme-primary)] handwritten uppercase tracking-widest">
              {item.chapterMarker.title}
            </div>
          </div>
        );
      }

      const scene = item.scene;
      const plotline = plotlines.find(candidate => candidate.id === scene.plotlineId);
      const isExpanded = displayMode === 'full' || expandedSceneIds.includes(scene.id);

      return (
        <React.Fragment key={scene.id}>
          <article
            className={`relative pr-8 border-r-4 transition-all duration-500 ease-in-out ${isExpanded ? `mb-20 opacity-100 ${displayMode === 'focus' ? 'cursor-pointer' : ''}` : 'mb-2 opacity-70 hover:opacity-100 cursor-pointer'} ${scene.isCompleted ? 'grayscale-[0.3]' : ''}`}
            style={{ borderRightColor: plotline?.color }}
            onClick={(event) => {
              if (displayMode === 'full' || isInteractiveElement(event.target)) return;
              void onSelectScene(scene.id);
            }}
          >
            {!isExpanded ? (
              <div className={`group flex items-center justify-between bg-[var(--theme-card)] border border-[var(--theme-border)]/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all ${scene.isCompleted ? 'bg-green-50/20' : ''}`}>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-black text-[var(--theme-primary)]/10 handwritten w-6">{idx + 1}</span>
                  <div className="flex flex-col">
                    <h3 className="font-bold text-[var(--theme-primary)] truncate max-w-xs">{scene.title || 'ללא כותרת'}</h3>
                    {scene.summary && (
                      <p className="mt-0.5 max-w-md truncate text-[11px] font-medium text-[var(--theme-primary)]/40">
                        {scene.summary}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-primary)]/30 px-2 py-0.5 bg-[var(--theme-secondary)] rounded">{plotline?.name}</span>
                  {scene.isCompleted && <CheckCircle2 size={16} className="text-green-500" />}
                </div>
                <ChevronDown size={16} className="text-[var(--theme-primary)]/20 group-hover:text-[var(--theme-primary)]/40" />
              </div>
            ) : renderExpandedScene(scene, plotline)}
          </article>
        </React.Fragment>
      );
    })}
  </div>
);

export default EditorSceneList;
