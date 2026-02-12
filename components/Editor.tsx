
import React from 'react';
import { Scene, Project } from '../types';
import { Wand2, Loader2, BookOpen, CheckCircle2, Circle } from 'lucide-react';

interface EditorProps {
  project: Project;
  visiblePlotlines: string[];
  onUpdateScene: (id: string, updates: Partial<Scene>) => void;
  onAiRefine: (sceneId: string) => void;
  isAiLoading: boolean;
}

const Editor: React.FC<EditorProps> = ({ project, visiblePlotlines, onUpdateScene, onAiRefine, isAiLoading }) => {
  // Master sort by global 'position' property
  const activeScenes = project.scenes
    .filter(s => visiblePlotlines.includes(s.plotlineId))
    .sort((a, b) => a.position - b.position);

  if (activeScenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-amber-800/20 p-10">
        <BookOpen size={64} className="mb-4 opacity-10" />
        <p className="text-lg font-medium">אין סצנות להצגה</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-8 space-y-24">
      {activeScenes.map((scene, idx) => {
        const plotline = project.plotlines.find(p => p.id === scene.plotlineId);
        
        return (
          <article key={scene.id} className="relative pr-8 border-r-2 transition-all group" style={{ borderRightColor: plotline?.color }}>
            <div className="absolute -right-4 top-0 text-[40px] font-black text-amber-900/5 select-none handwritten">
              {idx + 1}
            </div>
            
            <header className="flex items-center justify-between mb-4">
              <div>
                <input 
                  className={`w-full text-2xl font-bold bg-transparent border-none focus:ring-0 p-0 text-amber-900 handwritten ${scene.isCompleted ? 'line-through opacity-50' : ''}`}
                  value={scene.title}
                  placeholder="כותרת הסצנה..."
                  onChange={(e) => onUpdateScene(scene.id, { title: e.target.value })}
                />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-800/40">
                    {plotline?.name}
                  </span>
                  {scene.isCompleted && (
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">הושלם</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateScene(scene.id, { isCompleted: !scene.isCompleted })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors shadow-sm ${scene.isCompleted ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                  title={scene.isCompleted ? "סמן כלא מושלם" : "סמן כהושלם"}
                >
                  {scene.isCompleted ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  <span className="text-[10px] font-bold">{scene.isCompleted ? "בוצע" : "סיום כתיבה"}</span>
                </button>

                <button
                  onClick={() => onAiRefine(scene.id)}
                  disabled={isAiLoading}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                  <span className="text-[10px] font-bold">קסם AI</span>
                </button>
              </div>
            </header>

            <textarea
              className={`w-full min-h-[140px] bg-[#fffaf0] rounded-xl border border-amber-100 p-6 text-lg leading-relaxed focus:ring-2 focus:ring-amber-200 focus:border-amber-300 resize-none transition-all shadow-sm ${scene.isCompleted ? 'opacity-60 grayscale-[0.5]' : ''}`}
              value={scene.content}
              placeholder="כתוב כאן..."
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
              onChange={(e) => onUpdateScene(scene.id, { content: e.target.value })}
            />
          </article>
        );
      })}
      <div className="h-32" />
    </div>
  );
};

export default Editor;
