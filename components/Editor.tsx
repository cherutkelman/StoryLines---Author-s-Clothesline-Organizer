
import React, { useMemo, useState } from 'react';
import { Scene, Project, QuestionnaireEntry } from '../types';
import { 
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
  Plus,
  Download,
  Trash2
} from 'lucide-react';

interface EditorProps {
  project: Project;
  visiblePlotlines: string[];
  onUpdateScene: (id: string, updates: Partial<Scene>) => void;
  onDeleteScene: (id: string) => void;
  onOpenBulkAdd: () => void;
  initialFocusedSceneId?: string | null;
  onFocusScene?: (id: string | null) => void;
  initialDisplayMode?: 'full' | 'focus';
  onDisplayModeChange?: (mode: 'full' | 'focus') => void;
  onExport?: () => void;
}

const Editor: React.FC<EditorProps> = ({ project, visiblePlotlines, onUpdateScene, onDeleteScene, onOpenBulkAdd, initialFocusedSceneId, onFocusScene, initialDisplayMode, onDisplayModeChange, onExport }) => {
  const [displayMode, setDisplayMode] = useState<'full' | 'focus'>(initialDisplayMode || 'focus');
  const [focusedSceneId, setFocusedSceneId] = useState<string | null>(initialFocusedSceneId || null);
  const [bridgeType, setBridgeType] = useState<'characters' | 'places' | 'periods' | 'twists' | 'fantasyWorlds' | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleDisplayModeChange = (mode: 'full' | 'focus') => {
    setDisplayMode(mode);
    onDisplayModeChange?.(mode);
  };

  const handleFocusScene = (id: string | null) => {
    setFocusedSceneId(id);
    onFocusScene?.(id);
  };

  const activeScenes = useMemo(() => {
    let filtered = project.scenes
      .filter(s => visiblePlotlines.includes(s.plotlineId))
      .sort((a, b) => a.position - b.position);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(query) || 
        s.content.toLowerCase().includes(query)
      );
    }

    if (filtered.length > 0 && !focusedSceneId && displayMode === 'focus') {
      handleFocusScene(filtered[0].id);
    }
    
    return filtered;
  }, [project.scenes, visiblePlotlines, displayMode, searchQuery]);

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

  const handlePullChapterTitle = (sceneId: string, title: string) => {
    const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return;

    // Apply to this scene and all following scenes until a scene with a different (non-empty) chapter title is found
    // Or just apply to all following scenes for now as a simple 'pull'
    const updatedScenes = [...project.scenes];
    for (let i = sceneIndex; i < updatedScenes.length; i++) {
        // If we hit a scene that already has a DIFFERENT chapter title, we might want to stop?
        // But 'pull' usually means overwrite.
        onUpdateScene(updatedScenes[i].id, { chapterTitle: title });
    }
  };

  if (activeScenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--theme-primary)]/20 p-10">
        <BookOpen size={64} className="mb-4 opacity-10" />
        <p className="text-lg font-medium mb-4">אין סצנות להצגה</p>
        <button 
          onClick={onOpenBulkAdd}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-xl text-sm font-bold shadow-lg hover:opacity-90 transition-all"
        >
          <CopyPlus size={18} />
          <span>הוספה מהירה של סצנות</span>
        </button>
      </div>
    );
  }

  const bridgeItems = bridgeType ? (project[bridgeType] || []) : [];
  const activeItem = bridgeItems.find(i => i.id === selectedItemId);

  const getQuestionLabel = (id: string, type: typeof bridgeType): string => {
    // This is a simplified mapping. In a real app, these would be shared constants.
    const mappings: Record<string, string> = {
      name: "שם", age: "גיל", residence: "מקום מגורים", daily_life: "סדר יום",
      traits: "תכונות", goal: "מטרה", obstacles: "מכשולים",
      city_country: "עיר וארץ", landscape: "נוף",
      period_name: "תקופה", technology_capabilities: "טכנולוגיה",
      pre_state: "מצב קודם", truth_moment: "רגע האמת",
      hero_choices_impact: "השפעת בחירות", external_events: "אירועים חיצוניים",
      powers: "כוחות", description: "תיאור"
    };

    if (activeItem?.customFields) {
      const custom = activeItem.customFields.find(cf => cf.id === id);
      if (custom) return custom.label;
    }

    return mappings[id] || id;
  };

  const categories = [
    { id: 'characters', label: 'דמויות', icon: <UserCircle2 size={14} /> },
    { id: 'places', label: 'מקומות', icon: <MapPin size={14} /> },
    { id: 'periods', label: 'תקופות', icon: <Circle size={14} /> },
    { id: 'twists', label: 'תפניות', icon: <Hash size={14} /> },
    { id: 'fantasyWorlds', label: 'עולמות פנטזיה', icon: <BookOpen size={14} /> },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto py-12 px-8 relative">
      <div className="sticky top-4 z-40 mb-12 flex flex-col items-center gap-4">
        <div className="bg-[var(--theme-primary)]/90 backdrop-blur-md text-[var(--theme-bg)] px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-6 border border-[var(--theme-primary)]/50">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-[var(--theme-bg)] text-[var(--theme-primary)] rounded-lg shadow-sm">
            <Hash size={16} className="opacity-70" />
            <span className="text-sm font-black tabular-nums">{totalWords.toLocaleString()} מילים</span>
          </div>

          <div className="flex items-center gap-1 bg-black/10 p-1 rounded-lg">
            <button onClick={() => handleDisplayModeChange('focus')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${displayMode === 'focus' ? 'bg-[var(--theme-bg)] text-[var(--theme-primary)] shadow-sm' : 'text-[var(--theme-bg)]/60 hover:text-[var(--theme-bg)]'}`}><Focus size={14} /><span>מיקוד</span></button>
            <button onClick={() => handleDisplayModeChange('full')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${displayMode === 'full' ? 'bg-[var(--theme-bg)] text-[var(--theme-primary)] shadow-sm' : 'text-[var(--theme-bg)]/60 hover:text-[var(--theme-bg)]'}`}><AlignJustify size={14} /><span>מלא</span></button>
          </div>

          <div className="w-px h-6 bg-[var(--theme-bg)]/10 mx-1" />

          <div className="flex items-center gap-2">
            {isSearchOpen ? (
              <div className="flex items-center bg-[var(--theme-bg)] text-[var(--theme-primary)] rounded-lg px-3 py-1.5 shadow-sm animate-in fade-in slide-in-from-right-2">
                <Search size={14} className="opacity-70 mr-2" />
                <input 
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חפש מילים..."
                  className="bg-transparent border-none focus:ring-0 text-xs text-[var(--theme-primary)] placeholder:text-[var(--theme-primary)]/40 w-32"
                />
                <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="text-[var(--theme-primary)]/40 hover:text-[var(--theme-primary)] ml-2">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 px-4 py-1.5 bg-[var(--theme-bg)] text-[var(--theme-primary)] rounded-lg text-xs font-bold hover:opacity-80 transition-all shadow-sm"
                title="חיפוש"
              >
                <Search size={14} />
                <span>חיפוש</span>
              </button>
            )}
            
            <button 
              onClick={onOpenBulkAdd}
              className="flex items-center gap-2 px-4 py-1.5 bg-[var(--theme-bg)] text-[var(--theme-primary)] rounded-lg text-xs font-bold hover:opacity-80 transition-all shadow-sm"
              title="הוספת סצנות חדשות"
            >
              <Plus size={14} />
              <span>סצנה חדשה</span>
            </button>
            <button 
              onClick={() => setBridgeType('characters')} 
              className="flex items-center gap-2 px-4 py-1.5 bg-[var(--theme-bg)] text-[var(--theme-primary)] rounded-lg text-xs font-bold hover:opacity-80 transition-all shadow-sm"
              title="שליפת מידע מהשאלונים"
            >
              <BookOpen size={14} />
              <span>שלוף משאלון</span>
            </button>
            <div className="w-px h-6 bg-[var(--theme-bg)]/10 mx-1" />
            <button 
              onClick={onExport}
              className="flex items-center gap-2 px-4 py-1.5 bg-[var(--theme-bg)] text-[var(--theme-primary)] rounded-lg text-xs font-bold hover:opacity-80 transition-all shadow-sm"
              title="ייצוא כתב יד"
            >
              <Download size={14} />
              <span>ייצוא</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {activeScenes.map((scene, idx) => {
          const plotline = project.plotlines.find(p => p.id === scene.plotlineId);
          const isExpanded = displayMode === 'full' || focusedSceneId === scene.id;
          const prevScene = idx > 0 ? activeScenes[idx - 1] : null;
          const isNewChapter = idx === 0 || (scene.chapterTitle && scene.chapterTitle !== prevScene?.chapterTitle);

          return (
            <React.Fragment key={scene.id}>
              {isNewChapter && scene.chapterTitle && (
                <div className="pt-12 pb-4 border-b-2 border-[var(--theme-primary)]/10 mb-8">
                  <h2 className="text-4xl font-black text-[var(--theme-primary)]/20 handwritten uppercase tracking-widest">
                    {scene.chapterTitle}
                  </h2>
                </div>
              )}
              
              <article className={`relative pr-8 border-r-4 transition-all duration-500 ease-in-out ${isExpanded ? 'mb-20 opacity-100' : 'mb-2 opacity-70 hover:opacity-100 cursor-pointer'} ${scene.isCompleted ? 'grayscale-[0.3]' : ''}`} style={{ borderRightColor: plotline?.color }} onClick={() => { if (!isExpanded) handleFocusScene(scene.id); }}>
                {!isExpanded ? (
                  <div className={`group flex items-center justify-between bg-[var(--theme-card)] border border-[var(--theme-border)]/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all ${scene.isCompleted ? 'bg-green-50/20' : ''}`}>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-black text-[var(--theme-primary)]/10 handwritten w-6">{idx + 1}</span>
                      <div className="flex flex-col">
                        <h3 className="font-bold text-[var(--theme-primary)] truncate max-w-xs">{scene.title || 'ללא כותרת'}</h3>
                        {scene.chapterTitle && <span className="text-[10px] text-[var(--theme-accent)] font-bold">{scene.chapterTitle}</span>}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-primary)]/30 px-2 py-0.5 bg-[var(--theme-secondary)] rounded">{plotline?.name}</span>
                      {scene.isCompleted && <CheckCircle2 size={16} className="text-green-500" />}
                    </div>
                    <ChevronDown size={16} className="text-[var(--theme-primary)]/20 group-hover:text-[var(--theme-primary)]/40" />
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="mb-6 flex items-center gap-4 group/chapter">
                      <div className="flex-1 relative">
                        <input 
                          className="w-full bg-[var(--theme-secondary)]/50 border-none border-b border-transparent focus:border-[var(--theme-border)] focus:ring-0 text-sm font-bold text-[var(--theme-primary)] p-2 rounded-lg placeholder:text-[var(--theme-primary)]/20"
                          value={scene.chapterTitle || ''} 
                          placeholder="כותרת פרק (אופציונלי)..." 
                          onChange={(e) => onUpdateScene(scene.id, { chapterTitle: e.target.value })} 
                        />
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover/chapter:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handlePullChapterTitle(scene.id, scene.chapterTitle || ''); }}
                            className="flex items-center gap-1 px-2 py-1 bg-[var(--theme-secondary)] text-[var(--theme-primary)] rounded text-[10px] font-bold hover:bg-[var(--theme-border)]"
                            title="החל כותרת פרק זו על כל הסצנות הבאות"
                          >
                            <Download size={10} className="rotate-180" />
                            שלוף לכל הפרק
                          </button>
                        </div>
                      </div>
                    </div>

                    <header className="flex items-center justify-between mb-4">
                    <div className="flex-1 flex items-center gap-4">
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: plotline?.color }} />
                          <span className="text-[10px] font-black text-[var(--theme-primary)]/40 uppercase tracking-widest">{plotline?.name}</span>
                        </div>
                        <input className="text-3xl font-bold bg-transparent border-none focus:ring-0 p-0 text-[var(--theme-primary)] handwritten w-full" value={scene.title} placeholder="כותרת הסצנה..." onChange={(e) => onUpdateScene(scene.id, { title: e.target.value })} />
                      </div>
                      <button 
                        onClick={() => onUpdateScene(scene.id, { isCompleted: !scene.isCompleted })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm border ${scene.isCompleted ? 'bg-green-100 text-green-800 border-green-200' : 'bg-[var(--theme-card)] text-[var(--theme-primary)] border-[var(--theme-border)] hover:bg-[var(--theme-secondary)]'}`}
                      >
                        <CheckCircle2 size={16} />
                        <span>{scene.isCompleted ? 'הושלם' : 'סיימתי לכתוב'}</span>
                      </button>
                      <button 
                        onClick={() => onDeleteScene(scene.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="מחק סצנה"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </header>
                  <textarea className={`w-full min-h-[400px] rounded-[2rem] border border-[var(--theme-border)] p-10 text-xl leading-relaxed focus:ring-4 focus:ring-[var(--theme-primary)]/10 focus:border-[var(--theme-border)] resize-none transition-all shadow-inner ${scene.isCompleted ? 'bg-green-50/10' : 'bg-[var(--theme-card)]'}`} value={scene.content} placeholder="התחל לכתוב..." onChange={(e) => onUpdateScene(scene.id, { content: e.target.value })} />
                </div>
              )}
            </article>
          </React.Fragment>
          );
        })}
      </div>

      {bridgeType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[var(--theme-card)] w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-[var(--theme-border)] overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-8 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-secondary)]/20">
              <h2 className="text-2xl font-bold text-[var(--theme-primary)] handwritten text-3xl">שלוף מידע מהשאלונים</h2>
              <button onClick={() => { setBridgeType(null); setSelectedItemId(null); }} className="text-[var(--theme-primary)]/30 hover:text-[var(--theme-primary)] transition-colors p-1"><X size={28} /></button>
            </div>
            
            <div className="flex-1 flex min-h-0">
               {/* Categories Sidebar */}
               <div className="w-48 border-l border-[var(--theme-border)] p-4 bg-[var(--theme-secondary)]/30 space-y-1 overflow-y-auto">
                  <div className="text-[10px] font-black text-[var(--theme-primary)]/30 uppercase tracking-widest mb-2 px-2">קטגוריה</div>
                  {categories.map(cat => (
                    <button 
                      key={cat.id} 
                      onClick={() => { setBridgeType(cat.id); setSelectedItemId(null); }} 
                      className={`w-full flex items-center gap-2 text-right p-3 rounded-xl text-xs font-bold transition-all ${bridgeType === cat.id ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-sm' : 'text-[var(--theme-primary)]/70 hover:bg-[var(--theme-secondary)]'}`}
                    >
                      {cat.icon}
                      <span>{cat.label}</span>
                    </button>
                  ))}
               </div>

               {/* Items List */}
               <div className="w-1/3 border-l border-[var(--theme-border)] p-4 overflow-y-auto space-y-2">
                  <div className="text-[10px] font-black text-[var(--theme-primary)]/30 uppercase tracking-widest mb-2 px-2">בחר פריט</div>
                  {bridgeItems.map(item => (
                    <button key={item.id} onClick={() => setSelectedItemId(item.id)} className={`w-full text-right p-3 rounded-xl text-sm font-bold transition-all ${selectedItemId === item.id ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-md' : 'text-[var(--theme-primary)]/70 hover:bg-[var(--theme-secondary)]'}`}>{item.name}</button>
                  ))}
                  {bridgeItems.length === 0 && <div className="text-xs text-[var(--theme-primary)]/30 italic p-4 text-center">אין פריטים רשומים</div>}
               </div>

               {/* Content Area */}
               <div className="flex-1 p-6 overflow-y-auto bg-[var(--theme-secondary)]/10">
                  {activeItem ? (
                    <div className="space-y-6">
                       <div className="flex items-center justify-between mb-4">
                          <div className="text-[10px] font-black text-[var(--theme-primary)]/30 uppercase tracking-widest">מידע זמין</div>
                          <div className="text-xs font-bold text-[var(--theme-primary)]">{activeItem.name}</div>
                       </div>

                       {/* Main Data */}
                       <div className="grid gap-3">
                        {Object.entries(activeItem.data || {}).map(([key, val]) => {
                            if (['gender', 'placeType'].includes(key)) return null;
                            if (!val) return null;
                            return (
                              <button key={key} onClick={() => handlePullInfo(val as string)} className="w-full text-right p-4 bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-2xl hover:border-[var(--theme-accent)] hover:shadow-md transition-all group relative overflow-hidden">
                                <div className="text-[10px] text-[var(--theme-primary)]/30 mb-1 font-bold">{getQuestionLabel(key, bridgeType)}</div>
                                <div className="text-sm text-[var(--theme-primary)] leading-relaxed whitespace-pre-wrap">{val as string}</div>
                                <div className="absolute top-0 right-0 h-full w-10 bg-[var(--theme-secondary)] translate-x-full group-hover:translate-x-0 transition-transform flex items-center justify-center">
                                    <ArrowRight size={16} className="text-[var(--theme-primary)]" />
                                </div>
                              </button>
                            );
                        })}
                       </div>

                       {/* Development Stages */}
                       {activeItem.developmentStages && activeItem.developmentStages.length > 0 && (
                         <div className="space-y-3 pt-4">
                            <div className="text-[10px] font-black text-[var(--theme-primary)]/20 uppercase tracking-widest">שלבי פיתוח</div>
                            {activeItem.developmentStages.map(stage => (
                              <div key={stage.id} className="space-y-2">
                                <div className="text-xs font-bold text-[var(--theme-primary)]/60 px-2">{stage.title}</div>
                                {Object.entries(stage.data || {}).map(([key, val]) => val && (
                                  <button key={key} onClick={() => handlePullInfo(val as string)} className="w-full text-right p-3 bg-[var(--theme-card)]/50 border border-[var(--theme-border)]/50 rounded-xl hover:border-[var(--theme-accent)] transition-all text-xs text-[var(--theme-primary)]">
                                    {val as string}
                                  </button>
                                ))}
                              </div>
                            ))}
                         </div>
                       )}

                       {/* Special Items / Powers / Locations */}
                       {[
                         { list: activeItem.specialItems, label: 'חפצים מיוחדים' },
                         { list: activeItem.uniquePowers, label: 'כוחות ייחודיים' },
                         { list: activeItem.specificLocations, label: 'מיקומים ספציפיים' }
                       ].map(group => group.list && group.list.length > 0 && (
                         <div key={group.label} className="space-y-3 pt-4">
                            <div className="text-[10px] font-black text-[var(--theme-primary)]/20 uppercase tracking-widest">{group.label}</div>
                            {group.list.map(item => (
                              <div key={item.id} className="space-y-2">
                                <div className="text-xs font-bold text-[var(--theme-primary)]/60 px-2">{item.name}</div>
                                {Object.entries(item.data || {}).map(([key, val]) => val && (
                                  <button key={key} onClick={() => handlePullInfo(val as string)} className="w-full text-right p-3 bg-[var(--theme-card)]/50 border border-[var(--theme-border)]/50 rounded-xl hover:border-[var(--theme-accent)] transition-all text-xs text-[var(--theme-primary)]">
                                    {val as string}
                                  </button>
                                ))}
                              </div>
                            ))}
                         </div>
                       ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--theme-primary)]/20 gap-4">
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
