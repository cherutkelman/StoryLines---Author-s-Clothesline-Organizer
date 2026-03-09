import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  BookOpen, 
  Layout, 
  Wand2,
  Download,
  Upload,
  Settings2,
  MonitorSmartphone,
  Save,
  FileJson,
  Type as LucideType,
  ChevronRight,
  ChevronLeft,
  Library,
  Book as BookIcon,
  Pencil,
  CopyPlus,
  X,
  FileText,
  Sparkles,
  Loader2,
  ListChecks,
  PanelRightClose,
  PanelRightOpen,
  ChevronLast,
  ChevronFirst,
  Users,
  Map,
  Eye,
  EyeOff,
  MessageSquareQuote,
  Send,
  // Added missing CheckCircle2 import
  CheckCircle2
} from 'lucide-react';
import { Scene, Plotline, Project, Book, QuestionnaireEntry, CharacterMapConnection, WorldMap, THEMES } from './types';
import Board from './components/Board';
import Editor from './components/Editor';
import Questionnaires from './components/Questionnaires';
import MapsManager from './components/MapsManager';
import { GoogleGenAI, Type } from "@google/genai";

const STORAGE_KEY = 'storylines_library_v2';

const DEFAULT_PROJECT_DATA = {
  plotlines: [
    { id: 'p1', name: 'עלילה ראשית', color: '#ef4444' },
    { id: 'p2', name: 'עלילת משנה', color: '#3b82f6' }
  ],
  scenes: [
    { id: 's1', plotlineId: 'p1', title: 'התחלה', content: 'הגיבור יוצא לדרך...', position: 0, isCompleted: true },
    { id: 's2', plotlineId: 'p2', title: 'מזימה', content: 'הנבל מתכנן משהו...', position: 1, isCompleted: false },
    { id: 's3', plotlineId: 'p1', title: 'מכשול ראשון', content: 'הדרך נחסמת...', position: 2, isCompleted: false }
  ],
  characters: [],
  places: [],
  periods: [],
  twists: [],
  fantasyWorlds: [],
  backgrounds: [],
  summary: '',
  characterMapConnections: [],
  maps: [],
  mindMaps: []
};

const SHARED_FIELDS = [
  'characters', 'places', 'periods', 'twists', 'fantasyWorlds', 'backgrounds',
  'characterMapConnections', 'maps', 'mindMaps'
];

const createNewBook = (title: string, universeId?: string, sharedData?: Partial<Project>): Book => ({
  id: `book-${Date.now()}`,
  title,
  universeId,
  lastModified: Date.now(),
  ...DEFAULT_PROJECT_DATA,
  ...(sharedData || {}),
  uiState: {
    theme: 'classic'
  }
});

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration logic for old data format
        return parsed.map((b: any) => {
          if (b.characterMapNodes) {
             const nodes = b.characterMapNodes;
             const newCharacters = (b.characters || []).map((char: any) => {
                const node = nodes.find((n: any) => n.id === char.id || n.name === char.name);
                return {
                   ...char,
                   x: node?.x ?? char.x,
                   y: node?.y ?? char.y,
                   imageUrl: node?.imageUrl ?? char.imageUrl
                };
             });
             delete b.characterMapNodes;
             b.characters = newCharacters;
          }
          return b;
        });
      } catch (e) {
        console.error("Failed to load library", e);
      }
    }
    return [createNewBook('הספר הראשון שלי')];
  });
  
  const [activeBookId, setActiveBookId] = useState<string>(books[0]?.id || '');
  const [activeView, setActiveView] = useState<'board' | 'editor' | 'questionnaires' | 'maps'>(() => {
    const firstBook = books[0];
    const lastView = firstBook?.uiState?.lastView;
    return (lastView === 'characterMap' as any ? 'maps' : lastView) || 'board';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [visiblePlotlines, setVisiblePlotlines] = useState<string[]>([]);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  
  // Modals state
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [isNewBookModalOpen, setIsNewBookModalOpen] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [linkToBookId, setLinkToBookId] = useState<string>('');

  const [bulkTitles, setBulkTitles] = useState('');
  const [bulkPlotlineId, setBulkPlotlineId] = useState('');

  const activeBook = useMemo(() => 
    books.find(b => b.id === activeBookId) || books[0], 
    [books, activeBookId]
  );

  const theme = activeBook?.uiState?.theme || 'classic';

  useEffect(() => {
    if (activeBook?.uiState?.lastView) {
      setActiveView(activeBook.uiState.lastView);
    }
  }, [activeBookId]);

  useEffect(() => {
    if (activeBook) {
      setVisiblePlotlines(activeBook.plotlines.map(p => p.id));
      if (!bulkPlotlineId) setBulkPlotlineId(activeBook.plotlines[0]?.id || '');
    }
  }, [activeBook?.id]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
      setLastSaved(new Date());
    }, 1000); // Debounce save by 1 second
    return () => clearTimeout(timeout);
  }, [books]);

  const updateActiveBook = (updates: Partial<Book>) => {
    setBooks(prev => {
      const updatedBooks = prev.map(b => b.id === activeBookId ? { ...b, ...updates, lastModified: Date.now() } : b);
      
      const currentBook = updatedBooks.find(b => b.id === activeBookId);
      if (currentBook?.universeId) {
        const sharedUpdates: any = {};
        let hasSharedUpdates = false;
        
        SHARED_FIELDS.forEach(field => {
          if (field in updates) {
            sharedUpdates[field] = (updates as any)[field];
            hasSharedUpdates = true;
          }
        });

        if (hasSharedUpdates) {
          return updatedBooks.map(b => 
            b.universeId === currentBook.universeId && b.id !== activeBookId 
              ? { ...b, ...sharedUpdates, lastModified: Date.now() } 
              : b
          );
        }
      }
      
      return updatedBooks;
    });
  };

  const updateBookUiState = (updates: Partial<NonNullable<Book['uiState']>>) => {
    if (!activeBook) return;
    updateActiveBook({
      uiState: {
        ...(activeBook.uiState || {}),
        ...updates
      }
    });
  };

  const handleViewChange = (view: 'board' | 'editor' | 'questionnaires' | 'maps') => {
    setActiveView(view);
    updateBookUiState({ lastView: view });
  };

  const handleBulkAdd = () => {
    if (!activeBook) return;
    const titles = bulkTitles.split('\n').map(t => t.trim()).filter(t => t !== '');
    if (titles.length === 0) return;

    const startPos = activeBook.scenes.length;
    const newScenes: Scene[] = titles.map((title, idx) => ({
      id: `s-bulk-${Date.now()}-${idx}`,
      plotlineId: bulkPlotlineId,
      title,
      content: '',
      position: startPos + idx,
      isCompleted: false
    }));

    updateActiveBook({
      scenes: [...activeBook.scenes, ...newScenes].map((s, idx) => ({ ...s, position: idx }))
    });
    setBulkTitles('');
    setIsBulkAddOpen(false);
  };

  const addPlotline = () => {
    if (!activeBook) return;
    const newP: Plotline = {
      id: `p-${Date.now()}`,
      name: `קו חדש`,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`
    };
    updateActiveBook({ plotlines: [...activeBook.plotlines, newP] });
    setVisiblePlotlines(prev => [...prev, newP.id]);
  };

  const renamePlotline = (id: string, name: string) => {
    if (!activeBook) return;
    updateActiveBook({
      plotlines: activeBook.plotlines.map(p => p.id === id ? { ...p, name } : p)
    });
  };

  const deletePlotline = (id: string) => {
    if (!activeBook || activeBook.plotlines.length <= 1) return;
    if (confirm('מחיקת קו עלילה תשאיר את הסצנות שלו יתומות. להמשיך?')) {
      updateActiveBook({
        plotlines: activeBook.plotlines.filter(p => p.id !== id),
        scenes: activeBook.scenes.filter(s => s.plotlineId !== id)
      });
    }
  };

  const reorderPlotline = (id: string, direction: 'up' | 'down') => {
    if (!activeBook) return;
    const index = activeBook.plotlines.findIndex(p => p.id === id);
    if (index === -1) return;
    
    const newPlotlines = [...activeBook.plotlines];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newPlotlines.length) {
      [newPlotlines[index], newPlotlines[targetIndex]] = [newPlotlines[targetIndex], newPlotlines[index]];
      updateActiveBook({ plotlines: newPlotlines });
    }
  };

  const togglePlotlineVisibility = (id: string) => {
    setVisiblePlotlines(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const addScene = (plotlineId: string, atPosition?: number) => {
    if (!activeBook) return;
    const newPos = atPosition !== undefined ? atPosition : activeBook.scenes.length;
    const newScene: Scene = {
      id: `s-${Date.now()}`,
      plotlineId,
      title: 'סצנה חדשה',
      content: '',
      position: newPos,
      isCompleted: false
    };
    
    const newScenes = [...activeBook.scenes];
    newScenes.splice(newPos, 0, newScene);
    updateActiveBook({
      scenes: newScenes.map((s, idx) => ({ ...s, position: idx }))
    });
  };

  const updateScene = (id: string, updates: Partial<Scene>) => {
    if (!activeBook) return;
    updateActiveBook({
      scenes: activeBook.scenes.map(s => s.id === id ? { ...s, ...updates } : s)
    });
  };

  const deleteScene = (id: string) => {
    if (!activeBook) return;
    if (confirm('האם אתה בטוח שברצונך למחוק את הסצנה?')) {
      updateActiveBook({
        scenes: activeBook.scenes.filter(s => s.id !== id).map((s, idx) => ({ ...s, position: idx }))
      });
    }
  };

  const updateChapterTitle = (position: number, title: string) => {
    if (!activeBook) return;
    updateActiveBook({
      scenes: activeBook.scenes.map(s => s.position === position ? { ...s, chapterTitle: title } : s)
    });
  };

  const moveScene = (id: string, targetGlobalIndex: number, targetPlotlineId: string) => {
    if (!activeBook) return;
    const sceneToMove = activeBook.scenes.find(s => s.id === id);
    if (!sceneToMove) return;

    const otherScenes = activeBook.scenes.filter(s => s.id !== id);
    const updatedScene = { ...sceneToMove, plotlineId: targetPlotlineId };
    
    const newScenes = [...otherScenes];
    newScenes.splice(targetGlobalIndex, 0, updatedScene);

    updateActiveBook({
      scenes: newScenes.map((s, idx) => ({ ...s, position: idx }))
    });
  };

  const exportManuscript = () => {
    if (!activeBook) return;
    const text = activeBook.scenes
      .filter(s => visiblePlotlines.includes(s.plotlineId))
      .map(s => `## ${s.title}${s.isCompleted ? ' [הושלם]' : ''}\n\n${s.content}`)
      .join('\n\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeBook.title}-manuscript.txt`;
    a.click();
  };

  const exportDataBackup = () => {
    if (!activeBook) return;
    const dataStr = JSON.stringify(activeBook, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeBook.title}-backup.json`;
    a.click();
  };

  const addNewBookToLibrary = () => {
    setNewBookTitle('ספר חדש');
    setLinkToBookId('');
    setIsNewBookModalOpen(true);
  };

  const handleCreateNewBook = () => {
    if (!newBookTitle.trim()) return;
    
    setBooks(prev => {
      let newBook: Book;
      let updatedPrev = [...prev];
      
      if (linkToBookId) {
        const sourceBookIndex = updatedPrev.findIndex(b => b.id === linkToBookId);
        if (sourceBookIndex !== -1) {
          const sourceBook = updatedPrev[sourceBookIndex];
          let universeId = sourceBook.universeId;
          
          if (!universeId) {
            universeId = `universe-${Date.now()}`;
            updatedPrev[sourceBookIndex] = { ...sourceBook, universeId };
          }
          
          const sharedData: Partial<Project> = {};
          SHARED_FIELDS.forEach(field => {
            (sharedData as any)[field] = (sourceBook as any)[field];
          });
          
          newBook = createNewBook(newBookTitle, universeId, sharedData);
        } else {
          newBook = createNewBook(newBookTitle);
        }
      } else {
        newBook = createNewBook(newBookTitle);
      }
      
      const nextBooks = [...updatedPrev, newBook];
      setActiveBookId(newBook.id);
      return nextBooks;
    });
    
    setIsNewBookModalOpen(false);
  };

  const renameBook = (id: string, title: string) => {
    setBooks(prev => prev.map(b => b.id === id ? { ...b, title } : b));
  };

  const deleteBook = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('אתה בטוח שאתה רוצה למחוק את הספר?')) {
      const remainingBooks = books.filter(b => b.id !== id);
      if (remainingBooks.length === 0) {
        const freshBook = createNewBook('ספר חדש');
        setBooks([freshBook]);
        setActiveBookId(freshBook.id);
      } else {
        setBooks(remainingBooks);
        if (activeBookId === id) {
          setActiveBookId(remainingBooks[0].id);
        }
      }
    }
  };

  const updateEntries = (category: 'characters' | 'places' | 'periods' | 'twists' | 'fantasyWorlds' | 'backgrounds' | 'characterMapConnections' | 'maps' | 'mindMaps', entries: any[]) => {
    updateActiveBook({ [category]: entries });
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-main)] overflow-y-auto scrollbar-hide">
      <style>{`
        :root {
          --bg-page: ${THEMES[theme].bg};
          --bg-card: ${THEMES[theme].card};
          --text-main: ${THEMES[theme].text};
          --text-accent: ${THEMES[theme].primary};
          --color-primary: ${THEMES[theme].accent};
          --color-secondary: ${THEMES[theme].secondary};
          --color-border: ${THEMES[theme].border};
          --color-muted: ${THEMES[theme].muted};
        }
      `}</style>
      <header className="flex-shrink-0 sticky top-0 bg-[var(--bg-card)] border-b border-[var(--color-border)] px-6 py-3 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 text-[var(--color-primary)] hover:bg-[var(--color-secondary)] rounded-lg transition-colors lg:flex hidden"
              title={isSidebarCollapsed ? "פתח תפריט" : "סגור תפריט"}
            >
              {isSidebarCollapsed ? <PanelRightOpen size={20} /> : <PanelRightClose size={20} />}
            </button>
            <div className="bg-[var(--color-primary)] p-2 rounded-lg text-white transition-transform hover:scale-110">
              <BookOpen size={20} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-[var(--text-accent)] handwritten text-3xl select-none leading-none">StoryLines</h1>
              <span className="text-[10px] font-bold text-[var(--color-primary)] opacity-60 uppercase tracking-wider leading-none mt-1">by cherut kelman</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[var(--color-secondary)] p-1.5 rounded-2xl border border-[var(--color-border)] shadow-inner">
          <button 
            onClick={() => handleViewChange('board')} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeView === 'board' ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'text-[var(--color-primary)] opacity-60 hover:opacity-100 hover:bg-[var(--bg-card)]'}`}
          >
            <Layout size={18} />
            <span className="hidden sm:inline">לוח עלילה</span>
          </button>
          <button 
            onClick={() => handleViewChange('editor')} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeView === 'editor' ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'text-[var(--color-primary)] opacity-60 hover:opacity-100 hover:bg-[var(--bg-card)]'}`}
          >
            <LucideType size={18} />
            <span className="hidden sm:inline">עורך טקסט</span>
          </button>
          <button 
            onClick={() => handleViewChange('maps')} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeView === 'maps' ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'text-[var(--color-primary)] opacity-60 hover:opacity-100 hover:bg-[var(--bg-card)]'}`}
          >
            <Map size={18} />
            <span className="hidden sm:inline">מפות</span>
          </button>
          <button 
            onClick={() => handleViewChange('questionnaires')} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeView === 'questionnaires' ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'text-[var(--color-primary)] opacity-60 hover:opacity-100 hover:bg-[var(--bg-card)]'}`}
          >
            <ListChecks size={18} />
            <span className="hidden sm:inline">שאלונים</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[var(--color-secondary)] p-1 rounded-xl border border-[var(--color-border)]">
            {Object.entries(THEMES).map(([key, t]) => (
              <button
                key={key}
                onClick={() => updateBookUiState({ theme: key as any })}
                className={`w-6 h-6 rounded-full border-2 transition-all ${theme === key ? 'border-[var(--color-primary)] scale-110' : 'border-transparent hover:scale-105'}`}
                style={{ backgroundColor: t.accent }}
                title={t.name}
              />
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside 
          className={`border-l border-[var(--color-border)] bg-[var(--bg-card)] overflow-hidden hidden lg:flex flex-col shadow-xl z-20 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-16' : 'w-80'}`}
        >
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center py-8 gap-4">
              <button onClick={addNewBookToLibrary} className="p-3 text-[var(--color-primary)] hover:bg-[var(--color-secondary)] rounded-xl"><Plus size={20} /></button>
              <div className="h-px w-8 bg-[var(--color-border)]" />
              {books.map(book => (
                <button 
                  key={book.id} 
                  onClick={() => setActiveBookId(book.id)}
                  className={`p-3 rounded-xl transition-all ${activeBookId === book.id ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-[var(--color-primary)] opacity-20 hover:bg-[var(--color-secondary)]'}`}
                  title={book.title}
                >
                  <BookIcon size={20} />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="p-8 border-b border-[var(--color-border)]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="flex items-center gap-2 text-xs font-black text-[var(--text-accent)] uppercase tracking-[0.2em]">הספרים שלי</h3>
                  <button onClick={addNewBookToLibrary} className="text-[var(--color-primary)] hover:opacity-80 p-2 rounded-xl hover:bg-[var(--color-secondary)] transition-all"><Plus size={20} /></button>
                </div>
                <div className="space-y-2">
                  {books.map(book => (
                    <div 
                      key={book.id}
                      onClick={() => setActiveBookId(book.id)}
                      className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${activeBookId === book.id ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'hover:bg-[var(--color-secondary)] text-[var(--text-main)]'}`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <BookIcon size={18} className={activeBookId === book.id ? 'text-white' : 'text-[var(--color-primary)]'} />
                        <span className="font-bold truncate text-sm">{book.title}</span>
                      </div>
                      <button 
                        onClick={(e) => deleteBook(book.id, e)}
                        className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${activeBookId === book.id ? 'hover:bg-white/20 text-white' : 'hover:bg-red-50 text-red-400'}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 border-b border-[var(--color-border)]">
                {activeBook && (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="flex items-center gap-2 text-xs font-black text-[var(--text-accent)] uppercase tracking-[0.2em]">קווי עלילה</h3>
                      <button onClick={addPlotline} className="text-[var(--color-primary)] hover:opacity-80 p-2 rounded-xl hover:bg-[var(--color-secondary)] transition-all"><Plus size={20} /></button>
                    </div>
                    <div className="space-y-2">
                      {activeBook.plotlines.map(plotline => (
                        <div key={plotline.id} className="group flex items-center gap-3 p-3 rounded-2xl bg-[var(--color-secondary)]/30 border border-transparent hover:border-[var(--color-border)] transition-all">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: plotline.color }} />
                          <input 
                            value={plotline.name} 
                            onChange={(e) => renamePlotline(plotline.id, e.target.value)}
                            className="text-xs font-bold bg-transparent border-none focus:ring-0 p-0 flex-1 text-[var(--text-accent)]"
                          />
                          <button 
                            onClick={() => togglePlotlineVisibility(plotline.id)}
                            className={`p-1.5 rounded-lg transition-colors ${visiblePlotlines.includes(plotline.id) ? 'text-[var(--color-primary)] hover:bg-[var(--color-secondary)]' : 'text-[var(--color-primary)] opacity-30 hover:opacity-100'}`}
                            title={visiblePlotlines.includes(plotline.id) ? "מוצג בעורך" : "מוסתר מהעורך"}
                          >
                            {visiblePlotlines.includes(plotline.id) ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                          <button 
                            onClick={() => deletePlotline(plotline.id)}
                            className="p-1.5 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-black text-[var(--text-accent)] uppercase tracking-[0.2em]">ניהול נתונים</h3>
                </div>
                <div className="flex flex-col gap-3">
                  <button onClick={exportDataBackup} className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-card)] border border-[var(--color-border)] text-[var(--color-primary)] rounded-xl text-xs font-bold hover:bg-[var(--color-secondary)] transition-all shadow-sm">
                    <FileJson size={16} className="opacity-60" />
                    <span>גיבוי מלא</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 relative overflow-hidden bg-[var(--bg-page)]">
          {activeBook ? (
            <>
              {activeView === 'board' && (
                <div className="absolute inset-0">
                  <Board 
                    project={activeBook} 
                    title={activeBook.title}
                    visiblePlotlines={visiblePlotlines}
                    onAddScene={addScene}
                    onMoveScene={moveScene} 
                    updateScene={updateScene} 
                    onUpdateSummary={(summary) => updateActiveBook({ summary })}
                    onBulkAdd={(pId) => { setBulkPlotlineId(pId); setIsBulkAddOpen(true); }} 
                    initialZoom={activeBook.uiState?.boardZoomLevel}
                    onZoomChange={(z) => updateBookUiState({ boardZoomLevel: z })}
                    onSceneDoubleClick={(id) => {
                      handleViewChange('editor');
                      updateBookUiState({ editorFocusedSceneId: id });
                    }}
                    onUpdateChapterTitle={updateChapterTitle}
                    onReorderPlotline={reorderPlotline}
                    onDeleteScene={deleteScene}
                  />
                </div>
              )}
              {activeView === 'editor' && (
                <div className="absolute inset-0 bg-[var(--bg-card)] overflow-auto shadow-2xl">
                   <Editor 
                    project={activeBook} 
                    visiblePlotlines={visiblePlotlines} 
                    onUpdateScene={updateScene} 
                    onDeleteScene={deleteScene}
                    onOpenBulkAdd={() => setIsBulkAddOpen(true)} 
                    initialFocusedSceneId={activeBook.uiState?.editorFocusedSceneId}
                    onFocusScene={(id) => updateBookUiState({ editorFocusedSceneId: id })}
                    initialDisplayMode={activeBook.uiState?.editorDisplayMode}
                    onDisplayModeChange={(mode) => updateBookUiState({ editorDisplayMode: mode })}
                    onExport={exportManuscript}
                  />
                </div>
              )}
              {activeView === 'maps' && (
                <div className="absolute inset-0 overflow-hidden">
                    <MapsManager 
                      characters={activeBook.characters || []}
                      places={activeBook.places || []}
                      connections={activeBook.characterMapConnections || []}
                      maps={activeBook.maps || []}
                      mindMaps={activeBook.mindMaps || []}
                      onUpdateCharacters={(chars) => updateEntries('characters', chars)}
                      onUpdateConnections={(conns) => updateEntries('characterMapConnections', conns)}
                      onUpdateMaps={(maps) => updateEntries('maps', maps)}
                      onUpdateMindMaps={(mindMaps) => updateEntries('mindMaps', mindMaps)}
                      initialTab={activeBook.uiState?.mapsActiveTab}
                      onTabChange={(tab) => updateBookUiState({ mapsActiveTab: tab })}
                      selectedMapId={activeBook.uiState?.mapsSelectedMapId}
                      onMapSelect={(id) => updateBookUiState({ mapsSelectedMapId: id })}
                      selectedMindMapId={activeBook.uiState?.mapsSelectedMindMapId}
                      onMindMapSelect={(id) => updateBookUiState({ mapsSelectedMindMapId: id })}
                    />
                </div>
              )}
              {activeView === 'questionnaires' && (
                <div className="absolute inset-0 overflow-auto">
                  <Questionnaires 
                    characters={activeBook.characters || []}
                    places={activeBook.places || []}
                    periods={activeBook.periods || []}
                    twists={activeBook.twists || []}
                    fantasyWorlds={activeBook.fantasyWorlds || []}
                    backgrounds={activeBook.backgrounds || []}
                    onUpdateCharacters={(e) => updateEntries('characters', e)}
                    onUpdatePlaces={(e) => updateEntries('places', e)}
                    onUpdatePeriods={(e) => updateEntries('periods', e)}
                    onUpdateTwists={(e) => updateEntries('twists', e)}
                    onUpdateFantasyWorlds={(e) => updateEntries('fantasyWorlds', e)}
                    onUpdateBackgrounds={(e) => updateEntries('backgrounds', e)}
                    initialTab={activeBook.uiState?.questionnaireActiveTab}
                    initialSelectedEntryId={activeBook.uiState?.questionnaireSelectedEntryId}
                    onTabChange={(tab) => updateBookUiState({ questionnaireActiveTab: tab })}
                    onEntrySelect={(id) => updateBookUiState({ questionnaireSelectedEntryId: id })}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[var(--color-primary)] opacity-20">
              <p className="text-xl font-bold">אנא בחר ספר או צור אחד חדש</p>
            </div>
          )}
        </main>
      </div>

      {isBulkAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="bg-[var(--bg-card)] w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-[var(--color-border)] p-8 animate-in zoom-in-95 duration-200">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold handwritten text-3xl text-[var(--text-accent)]">הוספה מרובה של סצנות</h2>
                <button onClick={() => setIsBulkAddOpen(false)} className="text-[var(--color-primary)] opacity-40 hover:opacity-100 p-1"><X size={28} /></button>
             </div>
             
             <div className="space-y-4">
                {activeBook && (
                  <div>
                    <label className="text-xs font-black text-[var(--text-accent)] uppercase tracking-widest mb-2 block">בחר קו עלילה</label>
                    <select 
                        value={bulkPlotlineId} 
                        onChange={(e) => setBulkPlotlineId(e.target.value)}
                        className="w-full bg-[var(--bg-page)] border border-[var(--color-border)] rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-[var(--color-secondary)] outline-none text-[var(--text-main)]"
                    >
                        {activeBook.plotlines.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                  </div>
                )}
                
                <div>
                   <label className="text-xs font-black text-[var(--text-accent)] uppercase tracking-widest mb-2 block">כותרות הסצנות (אחת בכל שורה)</label>
                   <textarea 
                      value={bulkTitles} 
                      onChange={(e) => setBulkTitles(e.target.value)} 
                      className="w-full h-48 bg-[var(--bg-page)] border border-[var(--color-border)] rounded-2xl p-4 text-sm focus:ring-4 focus:ring-[var(--color-secondary)] outline-none resize-none text-[var(--text-main)]"
                      placeholder="התחלה&#10;המשבר&#10;הפתרון..."
                   />
                </div>

                <div className="flex gap-3 pt-4">
                   <button onClick={handleBulkAdd} className="w-full bg-[var(--color-primary)] text-white font-bold py-4 rounded-2xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2">
                      <Plus size={20} />
                      <span>הוסף סצנות</span>
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {isNewBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="bg-[var(--bg-card)] w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-[var(--color-border)] p-8 animate-in zoom-in-95 duration-200">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold handwritten text-3xl text-[var(--text-accent)]">הוספת ספר חדש</h2>
                <button onClick={() => setIsNewBookModalOpen(false)} className="text-[var(--color-primary)] opacity-40 hover:opacity-100 p-1"><X size={28} /></button>
             </div>
             
             <div className="space-y-6">
                <div>
                   <label className="text-xs font-black text-[var(--text-accent)] uppercase tracking-widest mb-2 block">שם הספר</label>
                   <input 
                      type="text"
                      value={newBookTitle}
                      onChange={(e) => setNewBookTitle(e.target.value)}
                      className="w-full bg-[var(--bg-page)] border border-[var(--color-border)] rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-[var(--color-secondary)] outline-none text-[var(--text-main)]"
                      placeholder="הזן שם לספר..."
                      autoFocus
                   />
                </div>

                <div>
                   <label className="text-xs font-black text-[var(--text-accent)] uppercase tracking-widest mb-2 block">שיוך לספר קיים (סנכרון שאלונים ומפות)</label>
                   <select 
                      value={linkToBookId}
                      onChange={(e) => setLinkToBookId(e.target.value)}
                      className="w-full bg-[var(--bg-page)] border border-[var(--color-border)] rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-[var(--color-secondary)] outline-none text-[var(--text-main)]"
                   >
                      <option value="">ספר עצמאי (ללא שיוך)</option>
                      {books.map(book => (
                        <option key={book.id} value={book.id}>{book.title}</option>
                      ))}
                   </select>
                   <p className="mt-2 text-[10px] text-[var(--text-main)] opacity-60 leading-relaxed">
                      * שיוך ספרים יגרום לכך שכל שינוי בדמויות, מקומות, תקופות ומפות יתעדכן אוטומטית בכל הספרים המשויכים.
                   </p>
                </div>

                <div className="flex gap-3 pt-4">
                   <button 
                    onClick={handleCreateNewBook} 
                    className="w-full bg-[var(--color-primary)] text-white font-bold py-4 rounded-2xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                   >
                      <Plus size={20} />
                      <span>צור ספר</span>
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;