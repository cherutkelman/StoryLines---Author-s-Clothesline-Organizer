
import React, { useMemo, useState } from 'react';
import { Scene, Project } from '../types';
import { 
  Wand2, 
  Loader2, 
  BookOpen, 
  CheckCircle2, 
  Circle, 
  Hash, 
  CopyPlus, 
  Maximize2, 
  Minimize2, 
  ChevronDown, 
  ChevronUp,
  AlignJustify,
  Focus
} from 'lucide-react';

interface EditorProps {
  project: Project;
  visiblePlotlines: string[];
  onUpdateScene: (id: string, updates: Partial<Scene>) => void;
  onAiRefine: (sceneId: string) => void;
  isAiLoading: boolean;
  onOpenBulkAdd: () => void;
}

const Editor: React.FC<EditorProps> = ({ project, visiblePlotlines, onUpdateScene, onAiRefine, isAiLoading, onOpenBulkAdd }) => {
  const [displayMode, setDisplayMode] = useState<'full' | 'focus'>('focus');
  const [focusedSceneId, setFocusedSceneId] = useState<string | null>(null);

  // Master sort by global 'position' property
  const activeScenes = useMemo(() => {
    const filtered = project.scenes
      .filter(s => visiblePlotlines.includes(s.plotlineId))
      .sort((a, b) => a.position - b.position);
    
    // Set first scene as focused if none selected and in focus mode
    if (filtered.length > 0 && !focusedSceneId && displayMode === 'focus') {
      setFocusedSceneId(filtered[0].id);
    }
    
    return filtered;
  }, [project.scenes, visiblePlotlines, displayMode]);

  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const totalWords = useMemo(() => {
    return activeScenes.reduce((sum, scene) => sum + countWords(scene.content), 0);
  }, [activeScenes]);

  if (activeScenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-amber-800/20 p-10">
        <BookOpen size={64} className="mb-4 opacity-10" />
        <p className="text-lg font-medium mb-4">אין סצנות להצגה</p>
        <button 
          onClick={onOpenBulkAdd}
          className="flex items-center gap-2 px-6 py-3 bg-amber-800 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-amber-900 transition-all"
        >
          <CopyPlus size={18} />
          <span>הוספה מהירה של סצנות</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-8">
      {/* Tool Bar */}
      <div className="sticky top-4 z-20 mb-12 flex flex-col items-center gap-4">
        <div className="bg-amber-900/90 backdrop-blur-sm text-white px-6 py-2 rounded-full shadow-lg flex items-center gap-6 border border-amber-800/50">
          <div className="flex items-center gap-2 border-l border-white/10 pl-4">
            <Hash size={16} className="text-amber-300" />
            <span className="text-lg font-black tabular-nums">{totalWords.toLocaleString()} מילים</span>
          </div>

          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg">
            <button 
              onClick={() => setDisplayMode('focus')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${displayMode === 'focus' ? 'bg-amber-100 text-amber-900 shadow-sm' : 'text-white/60 hover:text-white'}`}
            >
              <Focus size={14} />
              <span>מצב מיקוד</span>
            </button>
            <button 
              onClick={() => setDisplayMode('full')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${displayMode === 'full' ? 'bg-amber-100 text-amber-900 shadow-sm' : 'text-white/60 hover:text-white'}`}
            >
              <AlignJustify size={14} />
              <span>תצוגה מלאה</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {activeScenes.map((scene, idx) => {
          const plotline = project.plotlines.find(p => p.id === scene.plotlineId);
          const sceneWords = countWords(scene.content);
          const isExpanded = displayMode === 'full' || focusedSceneId === scene.id;
          
          return (
            <article 
              key={scene.id} 
              className={`relative pr-8 border-r-4 transition-all duration-500 ease-in-out ${isExpanded ? 'mb-20 opacity-100' : 'mb-2 opacity-70 hover:opacity-100 cursor-pointer'}`} 
              style={{ borderRightColor: plotline?.color }}
              onClick={() => { if (!isExpanded) setFocusedSceneId(scene.id); }}
            >
              {/* Collapsed View Row */}
              {!isExpanded && (
                <div className="group flex items-center justify-between bg-white border border-amber-100/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-black text-amber-900/10 handwritten w-6">{idx + 1}</span>
                    <h3 className="font-bold text-amber-900 truncate max-w-xs">{scene.title || 'ללא כותרת'}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800/30 px-2 py-0.5 bg-amber-50 rounded">
                      {plotline?.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono font-bold text-amber-900/30">{sceneWords.toLocaleString()} מילים</span>
                    <ChevronDown size={16} className="text-amber-200 group-hover:text-amber-400" />
                  </div>
                </div>
              )}

              {/* Expanded View */}
              {isExpanded && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="absolute -right-6 top-0 text-[50px] font-black text-amber-900/5 select-none handwritten">
                    {idx + 1}
                  </div>
                  
                  <header className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <input 
                        className={`w-full text-3xl font-bold bg-transparent border-none focus:ring-0 p-0 text-amber-900 handwritten ${scene.isCompleted ? 'line-through opacity-50' : ''}`}
                        value={scene.title}
                        placeholder="כותרת הסצנה..."
                        autoFocus={displayMode === 'focus'}
                        onChange={(e) => onUpdateScene(scene.id, { title: e.target.value })}
                      />
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-widest text-amber-800/40">
                          {plotline?.name}
                        </span>
                        {scene.isCompleted && (
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={10} />
                            הושלם
                          </span>
                        )}
                        {displayMode === 'focus' && (
                           <button 
                            onClick={(e) => { e.stopPropagation(); setFocusedSceneId(null); }}
                            className="text-[10px] font-bold text-amber-400 hover:text-amber-600 flex items-center gap-1"
                          >
                            <Minimize2 size={12} />
                            צמצם
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onUpdateScene(scene.id, { isCompleted: !scene.isCompleted }); }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors shadow-sm ${scene.isCompleted ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                        title={scene.isCompleted ? "סמן כלא מושלם" : "סמן כהושלם"}
                      >
                        {scene.isCompleted ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                        <span className="text-[10px] font-bold">{scene.isCompleted ? "בוצע" : "סיום כתיבה"}</span>
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); onAiRefine(scene.id); }}
                        disabled={isAiLoading}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors disabled:opacity-50 shadow-sm"
                      >
                        {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                        <span className="text-[10px] font-bold">קסם AI</span>
                      </button>
                    </div>
                  </header>

                  <div className="relative">
                    <textarea
                      className={`w-full min-h-[250px] bg-[#fffaf0] rounded-2xl border border-amber-100 p-8 text-xl leading-relaxed focus:ring-4 focus:ring-amber-200/20 focus:border-amber-200 resize-none transition-all shadow-inner ${scene.isCompleted ? 'opacity-60 grayscale-[0.5]' : ''}`}
                      value={scene.content}
                      placeholder="התחל לכתוב את הקסם כאן..."
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                      onChange={(e) => onUpdateScene(scene.id, { content: e.target.value })}
                    />
                    
                    {/* Individual Scene Word Counter */}
                    <div className="absolute bottom-4 left-6 flex items-center gap-3 text-[10px] font-mono font-bold text-amber-900/30 bg-white/40 px-3 py-1 rounded-full backdrop-blur-md border border-white/20">
                      <span>{sceneWords.toLocaleString()} מילים</span>
                      <span className="opacity-20">|</span>
                      <span>{scene.content.length.toLocaleString()} תווים</span>
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}

        <div className="flex flex-col items-center py-16">
           <button 
            onClick={onOpenBulkAdd}
            className="group flex flex-col items-center gap-4 p-8 border-2 border-dashed border-amber-200 rounded-[2rem] text-amber-300 hover:border-amber-400 hover:text-amber-400 transition-all w-full max-w-md hover:bg-amber-50/30"
          >
            <div className="bg-amber-50 p-4 rounded-full group-hover:bg-amber-100 transition-colors shadow-sm">
              <CopyPlus size={28} />
            </div>
            <div className="text-center">
              <span className="block text-sm font-bold uppercase tracking-widest mb-1">הוספת סצנות חדשות</span>
              <span className="block text-[10px] opacity-60">השתמש בהוספה מהירה כדי לתכנן את הפרק הבא</span>
            </div>
          </button>
        </div>
      </div>
      <div className="h-40" />
    </div>
  );
};

export default Editor;
