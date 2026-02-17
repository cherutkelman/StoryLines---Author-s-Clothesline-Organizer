
import React, { useMemo, useState } from 'react';
import { Scene, Project, QuestionnaireEntry } from '../types';
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
  Focus,
  UserCircle2,
  Search,
  ArrowRight,
  X,
  MapPin,
  Plus
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
  const [bridgeType, setBridgeType] = useState<'character' | 'place' | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const activeScenes = useMemo(() => {
    const filtered = project.scenes
      .filter(s => visiblePlotlines.includes(s.plotlineId))
      .sort((a, b) => a.position - b.position);
    
    if (filtered.length > 0 && !focusedSceneId && displayMode === 'focus') {
      setFocusedSceneId(filtered[0].id);
    }
    
    return filtered;
  }, [project.scenes, visiblePlotlines, displayMode]);

  const countWords = (text: string) => text.trim().split(/\s+/).filter(word => word.length > 0).length;

  const totalWords = useMemo(() => {
    return activeScenes.reduce((sum, scene) => sum + countWords(scene.content), 0);
  }, [activeScenes]);

  const handlePullInfo = (info: string) => {
    if (!focusedSceneId) return;
    const scene = project.scenes.find(s => s.id === focusedSceneId);
    if (!scene) return;
    
    onUpdateScene(focusedSceneId, { content: scene.content + (scene.content ? "\n" : "") + info });
    setBridgeType(null);
    setSelectedItemId(null);
  };

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

  const bridgeItems = bridgeType === 'character' ? (project.characters || []) : (project.places || []);
  const activeItem = bridgeItems.find(i => i.id === selectedItemId);

  return (
    <div className="max-w-4xl mx-auto py-12 px-8 relative">
      <div className="sticky top-4 z-40 mb-12 flex flex-col items-center gap-4">
        <div className="bg-amber-900/90 backdrop-blur-md text-white px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-6 border border-amber-800/50">
          <div className="flex items-center gap-2 border-l border-white/10 pl-4">
            <Hash size={16} className="text-amber-300" />
            <span className="text-lg font-black tabular-nums">{totalWords.toLocaleString()} מילים</span>
          </div>

          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg">
            <button onClick={() => setDisplayMode('focus')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${displayMode === 'focus' ? 'bg-amber-100 text-amber-900 shadow-sm' : 'text-white/60 hover:text-white'}`}><Focus size={14} /><span>מיקוד</span></button>
            <button onClick={() => setDisplayMode('full')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${displayMode === 'full' ? 'bg-amber-100 text-amber-900 shadow-sm' : 'text-white/60 hover:text-white'}`}><AlignJustify size={14} /><span>מלא</span></button>
          </div>

          <div className="w-px h-6 bg-white/10 mx-1" />

          <div className="flex gap-2">
            <button 
              onClick={onOpenBulkAdd}
              className="flex items-center gap-2 px-4 py-1.5 bg-green-100 text-green-900 rounded-lg text-xs font-bold hover:bg-white transition-all shadow-sm"
              title="הוספת סצנות חדשות"
            >
              <Plus size={14} />
              <span>סצנה חדשה</span>
            </button>
            <button onClick={() => setBridgeType('character')} className="flex items-center gap-2 px-4 py-1.5 bg-amber-100 text-amber-900 rounded-lg text-xs font-bold hover:bg-white transition-all shadow-sm">
              <UserCircle2 size={14} />
              <span>שלוף דמות</span>
            </button>
            <button onClick={() => setBridgeType('place')} className="flex items-center gap-2 px-4 py-1.5 bg-blue-100 text-blue-900 rounded-lg text-xs font-bold hover:bg-white transition-all shadow-sm">
              <MapPin size={14} />
              <span>שלוף מקום</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {activeScenes.map((scene, idx) => {
          const plotline = project.plotlines.find(p => p.id === scene.plotlineId);
          const isExpanded = displayMode === 'full' || focusedSceneId === scene.id;
          return (
            <article key={scene.id} className={`relative pr-8 border-r-4 transition-all duration-500 ease-in-out ${isExpanded ? 'mb-20 opacity-100' : 'mb-2 opacity-70 hover:opacity-100 cursor-pointer'}`} style={{ borderRightColor: plotline?.color }} onClick={() => { if (!isExpanded) setFocusedSceneId(scene.id); }}>
              {!isExpanded ? (
                <div className="group flex items-center justify-between bg-white border border-amber-100/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-black text-amber-900/10 handwritten w-6">{idx + 1}</span>
                    <h3 className="font-bold text-amber-900 truncate max-w-xs">{scene.title || 'ללא כותרת'}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800/30 px-2 py-0.5 bg-amber-50 rounded">{plotline?.name}</span>
                  </div>
                  <ChevronDown size={16} className="text-amber-200 group-hover:text-amber-400" />
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <header className="flex items-center justify-between mb-4">
                    <input className="w-full text-3xl font-bold bg-transparent border-none focus:ring-0 p-0 text-amber-900 handwritten" value={scene.title} placeholder="כותרת הסצנה..." onChange={(e) => onUpdateScene(scene.id, { title: e.target.value })} />
                    <button onClick={() => onAiRefine(scene.id)} disabled={isAiLoading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 shadow-sm">
                      {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                      <span className="text-[10px] font-bold italic">AI</span>
                    </button>
                  </header>
                  <textarea className="w-full min-h-[400px] bg-[#fffaf0] rounded-[2rem] border border-amber-100 p-10 text-xl leading-relaxed focus:ring-4 focus:ring-amber-200/10 focus:border-amber-200 resize-none transition-all shadow-inner" value={scene.content} placeholder="התחל לכתוב..." onChange={(e) => onUpdateScene(scene.id, { content: e.target.value })} />
                </div>
              )}
            </article>
          );
        })}
      </div>

      {bridgeType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-amber-950/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-amber-100 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-8 border-b border-amber-50 flex items-center justify-between bg-amber-50/20">
              <h2 className="text-2xl font-bold text-amber-900 handwritten text-3xl">שלוף מידע מ{bridgeType === 'character' ? 'דמות' : 'מקום'}</h2>
              <button onClick={() => { setBridgeType(null); setSelectedItemId(null); }} className="text-amber-300 hover:text-amber-800 transition-colors p-1"><X size={28} /></button>
            </div>
            
            <div className="flex-1 flex min-h-0">
               <div className="w-1/3 border-l border-amber-50 p-4 overflow-y-auto space-y-2">
                  <div className="text-[10px] font-black text-amber-900/30 uppercase tracking-widest mb-2 px-2">בחר {bridgeType === 'character' ? 'דמות' : 'מקום'}</div>
                  {bridgeItems.map(item => (
                    <button key={item.id} onClick={() => setSelectedItemId(item.id)} className={`w-full text-right p-3 rounded-xl text-sm font-bold transition-all ${selectedItemId === item.id ? 'bg-amber-800 text-white shadow-md' : 'text-amber-700 hover:bg-amber-50'}`}>{item.name}</button>
                  ))}
                  {bridgeItems.length === 0 && <div className="text-xs text-amber-300 italic p-4 text-center">אין פריטים רשומים</div>}
               </div>

               <div className="flex-1 p-6 overflow-y-auto bg-amber-50/10">
                  {activeItem ? (
                    <div className="space-y-4">
                       <div className="text-[10px] font-black text-amber-900/30 uppercase tracking-widest mb-4">מידע זמין</div>
                       {Object.entries(activeItem.data || {}).map(([key, val]) => {
                          if (['gender', 'placeType'].includes(key)) return null;
                          if (!val) return null;
                          return (
                            <button key={key} onClick={() => handlePullInfo(val as string)} className="w-full text-right p-4 bg-white border border-amber-100 rounded-2xl hover:border-amber-400 hover:shadow-md transition-all group relative overflow-hidden">
                               <div className="text-[10px] text-amber-300 mb-1 font-bold">{key}</div>
                               <div className="text-sm text-amber-900 leading-relaxed truncate">{val as string}</div>
                               <div className="absolute top-0 right-0 h-full w-10 bg-amber-50 translate-x-full group-hover:translate-x-0 transition-transform flex items-center justify-center">
                                  <ArrowRight size={16} className="text-amber-800" />
                               </div>
                            </button>
                          );
                       })}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-amber-200 gap-4">
                       <Search size={48} className="opacity-20" />
                       <p className="text-sm font-bold">בחר פריט מהרשימה</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
