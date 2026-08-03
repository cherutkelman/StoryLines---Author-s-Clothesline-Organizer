import React from 'react';
import { CheckCircle2, Flag, Pin } from 'lucide-react';
import { ChapterMarker, Project, Scene } from '../../types';
import { BoardChapter } from './boardTypes';
import SceneArcMarkers from './SceneArcMarkers';

interface ChaptersBoardViewProps {
  chapters: BoardChapter[];
  boardProject: Project;
  isPreviewMode: boolean;
  onSceneDoubleClick?: (sceneId: string) => void;
  onUpdateChapterMarker: (id: string, updates: Partial<ChapterMarker>) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
}

const ChaptersBoardView: React.FC<ChaptersBoardViewProps> = ({
  chapters,
  boardProject,
  isPreviewMode,
  onSceneDoubleClick,
  onUpdateChapterMarker,
  updateScene,
}) => (
<div className="space-y-24">
  {chapters.map((chapter) => (
    <div key={chapter.id} className="relative">
      <div className="flex items-center gap-6 mb-12 sticky right-0 z-30 bg-gradient-to-l from-[var(--theme-bg)] via-[var(--theme-bg)]/90 to-transparent pr-8 py-2">
        <div className="bg-[var(--theme-primary)]/10 p-3 rounded-2xl">
          <Flag size={24} className="text-[var(--theme-primary)]" />
        </div>
        {chapter.isEditable ? (
          <input 
            className="text-4xl font-black text-[var(--theme-primary)] handwritten tracking-widest uppercase bg-transparent border-none focus:ring-0 p-0 w-auto min-w-[300px]"
            value={chapter.title}
            readOnly={isPreviewMode}
            onChange={(e) => {
              if (isPreviewMode) return;
              onUpdateChapterMarker(chapter.id, { title: e.target.value });
            }}
          />
        ) : (
          <h2 className="text-4xl font-black text-[var(--theme-primary)] handwritten tracking-widest uppercase">
            {chapter.title}
          </h2>
        )}
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--theme-border)] to-transparent" />
        <span className="text-xs font-black text-[var(--theme-primary)]/30 uppercase tracking-widest bg-[var(--theme-secondary)]/50 px-4 py-1.5 rounded-full border border-[var(--theme-border)]/50">
          {chapter.scenes.length} סצנות
        </span>
      </div>

      <div className="flex flex-wrap gap-12 px-8">
        {chapter.scenes.map((scene) => {
          const plotline = boardProject.plotlines.find(p => p.id === scene.plotlineId);
          const isLinkedToPlotStructure = Object.values(boardProject.plotStructurePoints || {}).some(point => point.sceneId === scene.id);
          return (
            <div
              key={scene.id}
              data-board-scene-id={scene.id}
              onDoubleClick={() => {
                if (isPreviewMode) return;
                onSceneDoubleClick?.(scene.id);
              }}
              className={`w-44 h-44 bg-[var(--theme-card)] shadow-xl border-t-8 p-4 rounded-sm transition-all hover:-translate-y-2 hover:shadow-2xl relative flex flex-col ${scene.isCompleted ? 'opacity-90 grayscale-[0.3]' : ''}`}
              style={{ borderTopColor: plotline?.color }}
            >
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-4 h-10 bg-[var(--theme-secondary)] border border-[var(--theme-border)]/50 rounded-full shadow-md z-20 flex flex-col items-center py-1 gap-1">
                 <div className="w-1 h-1 bg-[var(--theme-primary)]/20 rounded-full" />
                 <div className="w-2 h-4 bg-[var(--theme-primary)]/5 rounded-full" />
              </div>

              {scene.isCompleted && (
                <div className="absolute -top-2 -right-2 text-green-500 bg-[var(--theme-card)] rounded-full shadow-md p-0.5 z-30">
                  <CheckCircle2 size={18} />
                </div>
              )}

              {isLinkedToPlotStructure && (
                <div className="absolute -top-2 right-6 text-[var(--theme-accent)] bg-[var(--theme-card)] rounded-full shadow-md p-1 z-30" title="מקושר למבנה העלילה">
                  <Pin size={14} className="rotate-45" />
                </div>
              )}

              <input 
                className="text-sm font-bold w-full text-center bg-transparent border-none focus:ring-0 p-0 text-[var(--theme-primary)] handwritten"
                value={scene.title}
                readOnly={isPreviewMode}
                onChange={(e) => {
                  if (isPreviewMode) return;
                  updateScene(scene.id, { title: e.target.value });
                }}
              />
              <div className="h-px bg-[var(--theme-secondary)] my-3" />
              <textarea 
                className="text-[11px] text-[var(--theme-primary)]/60 leading-relaxed text-center w-full bg-transparent border-none focus:ring-0 p-0 resize-none h-16 overflow-hidden mb-2"
                value={scene.summary || ''}
                placeholder="תמצית ההתרחשות..."
                readOnly={isPreviewMode}
                onChange={(e) => {
                  if (isPreviewMode) return;
                  updateScene(scene.id, { summary: e.target.value });
                }}
              />
              <SceneArcMarkers project={boardProject} sceneId={scene.id} />
              <div className="mt-auto pt-1 border-t border-amber-50/50 flex justify-center">
                <span className="text-[9px] font-black uppercase tracking-tighter opacity-40 px-2 py-0.5 rounded-full" style={{ backgroundColor: `${plotline?.color}20`, color: plotline?.color }}>
                  {plotline?.name}
                </span>
              </div>
            </div>
          );
        })}
        {chapter.scenes.length === 0 && (
          <div className="w-full h-32 flex items-center justify-center border-2 border-dashed border-[var(--theme-border)] rounded-3xl text-[var(--theme-primary)]/20 font-bold">
            אין סצנות בפרק זה
          </div>
        )}
      </div>
    </div>
  ))}
</div>
);

export default ChaptersBoardView;

