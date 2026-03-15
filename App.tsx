import React, { useState, useEffect, useRef, useMemo } from 'react';
import { loadBooks, saveBooks } from "./storage";
import { v4 as uuidv4 } from "uuid";
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
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Palette,
  Link2Off,
  Link
} from 'lucide-react';
import { Scene, Plotline, Project, Book, QuestionnaireEntry, CharacterMapConnection, WorldMap, THEMES, ChapterMarker } from './types';
import Board from './components/Board';
import Editor from './components/Editor';
import Questionnaires from './components/Questionnaires';
import MapsManager from './components/MapsManager';
import PlotStructure from './components/PlotStructure';
import { GoogleGenAI, Type } from "@google/genai";

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
  mindMaps: [],
  chapterMarkers: [],
  plotStructure: undefined
};

const SHARED_FIELDS = [
  'characters', 'places', 'periods', 'twists', 'fantasyWorlds', 'backgrounds',
  'characterMapConnections', 'maps', 'mindMaps'
];

const createNewBook = (title: string, universeId?: string, sharedData?: Partial<Project>): Book => ({
  id: uuidv4(),
  title,
  universeId,
  lastModified: Date.now(),
  ...DEFAULT_PROJECT_DATA,
  ...(sharedData || {})
});

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>(loadBooks);
  
  const [activeBookId, setActiveBookId] = useState<string>(books[0]?.id || '');
  const [activeView, setActiveView] = useState<'board' | 'editor' | 'questionnaires' | 'maps' | 'planning'>(() => {
    const firstBook = books[0];
    const lastView = firstBook?.uiState?.lastView;
    return (lastView === 'characterMap' as any ? 'maps' : (lastView === 'plotStructure' as any ? 'planning' : lastView)) || 'board';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [visiblePlotlines, setVisiblePlotlines] = useState<string[]>([]);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  
  // Modals state
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [isNewBookModalOpen, setIsNewBookModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [linkToBookId, setLinkToBookId] = useState<string>('');

  const [bulkTitles, setBulkTitles] = useState('');
  const [bulkPlotlineId, setBulkPlotlineId] = useState('');
  const [updateStatus, setUpdateStatus] = useState<'none' | 'available' | 'downloaded'>('none');

  const activeBook = useMemo(() => 
    books.find(b => b.id === activeBookId) || books[0], 
    [books, activeBookId]
  );

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
      saveBooks(books);
      setLastSaved(new Date());
    }, 1000); // Debounce save by 1 second
    return () => clearTimeout(timeout);
  }, [books]);

  useEffect(() => {
    const themeKey = activeBook?.uiState?.theme || 'classic';
    const theme = THEMES[themeKey as keyof typeof THEMES] || THEMES.classic;
    
    const root = document.documentElement;
    root.style.setProperty('--theme-bg', theme.bg);
    root.style.setProperty('--theme-card', theme.card);
    root.style.setProperty('--theme-primary', theme.primary);
    root.style.setProperty('--theme-accent', theme.accent);
    root.style.setProperty('--theme-secondary', theme.secondary);
    root.style.setProperty('--theme-border', theme.border);
    root.style.setProperty('--theme-text', theme.text);
    root.style.setProperty('--theme-muted', theme.muted);
  }, [activeBook?.uiState?.theme]);

  useEffect(() => {
    if ((window as any).require) {
      const { ipcRenderer } = (window as any).require('electron');
      
      ipcRenderer.on('update_available', () => {
        setUpdateStatus('available');
      });

      ipcRenderer.on('update_downloaded', () => {
        setUpdateStatus('downloaded');
      });

      return () => {
        ipcRenderer.removeAllListeners('update_available');
        ipcRenderer.removeAllListeners('update_downloaded');
      };
    }
  }, []);

  const restartApp = () => {
    if ((window as any).require) {
      const { ipcRenderer } = (window as any).require('electron');
      ipcRenderer.send('restart_app');
    }
  };

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

  const handleViewChange = (view: 'board' | 'editor' | 'questionnaires' | 'maps' | 'planning') => {
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

  const movePlotline = (id: string, direction: 'up' | 'down') => {
    if (!activeBook) return;
    const index = activeBook.plotlines.findIndex(p => p.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === activeBook.plotlines.length - 1) return;

    const newPlotlines = [...activeBook.plotlines];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newPlotlines[index], newPlotlines[targetIndex]] = [newPlotlines[targetIndex], newPlotlines[index]];

    updateActiveBook({ plotlines: newPlotlines });
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

  const updateChapterTitle = (position: number, title: string) => {
    if (!activeBook) return;
    updateActiveBook({
      scenes: activeBook.scenes.map(s => s.position === position ? { ...s, chapterTitle: title } : s)
    });
  };

  const updateChapterMarker = (id: string, updates: Partial<ChapterMarker>) => {
    if (!activeBook) return;
    updateActiveBook({
      chapterMarkers: (activeBook.chapterMarkers || []).map(m => m.id === id ? { ...m, ...updates } : m)
    });
  };

  const addChapterMarker = (position: number) => {
    if (!activeBook) return;
    const newMarker: ChapterMarker = {
      id: `cm-${Date.now()}`,
      position,
      title: `פרק חדש`
    };
    updateActiveBook({
      chapterMarkers: [...(activeBook.chapterMarkers || []), newMarker]
    });
  };

  const deleteChapterMarker = (id: string) => {
    if (!activeBook) return;
    updateActiveBook({
      chapterMarkers: (activeBook.chapterMarkers || []).filter(m => m.id !== id)
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

  const deleteScene = (id: string) => {
    if (!activeBook) return;
    // Removed confirm as it might be blocked in iframe
    const newScenes = activeBook.scenes
      .filter(s => s.id !== id)
      .sort((a, b) => a.position - b.position)
      .map((s, idx) => ({ ...s, position: idx }));
    
    updateActiveBook({ scenes: newScenes });
  };

  const exportManuscript = () => {
    if (!activeBook) return;
    
    const sortedScenes = activeBook.scenes
      .filter(s => visiblePlotlines.includes(s.plotlineId))
      .sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        const plotlineAIndex = activeBook.plotlines.findIndex(p => p.id === a.plotlineId);
        const plotlineBIndex = activeBook.plotlines.findIndex(p => p.id === b.plotlineId);
        return plotlineAIndex - plotlineBIndex;
      });

    let text = `# ${activeBook.title}\n\n`;
    
    sortedScenes.forEach((s) => {
      const chapterMarker = activeBook.chapterMarkers?.find(m => m.position === s.position);
      if (chapterMarker) {
        text += `\n# ${chapterMarker.title}\n\n`;
      }
      
      const plotline = activeBook.plotlines.find(p => p.id === s.plotlineId);
      text += `## ${s.title}${s.isCompleted ? ' [הושלם]' : ''} (${plotline?.name || 'ללא קו עלילה'})\n\n${s.content}\n\n---\n\n`;
    });

    const blob = new Blob(["\ufeff", text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeBook.title}-manuscript.txt`;
    a.click();
  };

  const exportDataBackup = () => {
    if (!activeBook) return;
    const dataStr = JSON.stringify(activeBook, null, 2);
    const blob = new Blob(["\ufeff", dataStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeBook.title}-backup.json`;
    a.click();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let content = event.target?.result as string;
        // Remove BOM if present
        if (content.charCodeAt(0) === 0xFEFF) {
          content = content.slice(1);
        }
        const parsed = JSON.parse(content);
        
        if (!parsed.id || !parsed.title) {
          alert('קובץ לא תקין');
          return;
        }

        setBooks(prev => {
          const exists = prev.find(b => b.id === parsed.id);
          if (exists) {
            if (!confirm('ספר זה כבר קיים בספריה. האם לעדכן אותו?')) {
              return prev;
            }
            return prev.map(b => b.id === parsed.id ? parsed : b);
          }
          return [...prev, parsed];
        });
        setActiveBookId(parsed.id);
      } catch (err) {
        console.error('Failed to import backup', err);
        alert('שגיאה בטעינת הקובץ. ייתכן שהקובץ פגום.');
      }
    };
    reader.readAsText(file);
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

  const unlinkBook = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBooks(prev => prev.map(b => b.id === id ? { ...b, universeId: undefined } : b));
  };

  const updateEntries = (category: 'characters' | 'places' | 'periods' | 'twists' | 'fantasyWorlds' | 'backgrounds' | 'characterMapConnections' | 'maps' | 'mindMaps', entries: any[]) => {
    updateActiveBook({ [category]: entries });
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--theme-bg)] text-[var(--theme-text)] overflow-y-auto scrollbar-hide transition-colors duration-500">
      <header className="flex-shrink-0 sticky top-0 bg-[var(--theme-card)] border-b border-[var(--theme-border)] px-6 py-3 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-lg transition-colors lg:flex hidden"
              title={isSidebarCollapsed ? "פתח תפריט" : "סגור תפריט"}
            >
              {isSidebarCollapsed ? <PanelRightOpen size={20} /> : <PanelRightClose size={20} />}
            </button>
            <div className="bg-[var(--theme-primary)] p-2 rounded-lg text-[var(--theme-card)] transition-transform hover:scale-110">
              <BookOpen size={20} />
            </div>
            <div className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setIsAboutModalOpen(true)}>
              <h1 className="text-xl font-bold text-[var(--theme-primary)] handwritten text-3xl select-none leading-none">StoryLines</h1>
              <span className="text-[10px] font-bold text-[var(--theme-primary)]/60 uppercase tracking-wider leading-none mt-1">by cherut kelman</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[var(--theme-secondary)] p-1.5 rounded-2xl border border-[var(--theme-border)]/50 shadow-inner">
          <button 
            onClick={() => handleViewChange('planning')} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeView === 'planning' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-lg' : 'text-[var(--theme-primary)]/60 hover:text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]'}`}
          >
            <Layout size={18} />
            <span className="hidden sm:inline">תכנון עלילה</span>
          </button>
          <button 
            onClick={() => handleViewChange('board')} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeView === 'board' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-lg' : 'text-[var(--theme-primary)]/60 hover:text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]'}`}
          >
            <Layout size={18} />
            <span className="hidden sm:inline">לוח עלילה</span>
          </button>
          <button 
            onClick={() => handleViewChange('editor')} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeView === 'editor' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-lg' : 'text-[var(--theme-primary)]/60 hover:text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]'}`}
          >
            <LucideType size={18} />
            <span className="hidden sm:inline">עורך טקסט</span>
          </button>
          <button 
            onClick={() => handleViewChange('maps')} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeView === 'maps' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-lg' : 'text-[var(--theme-primary)]/60 hover:text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]'}`}
          >
            <Map size={18} />
            <span className="hidden sm:inline">מפות</span>
          </button>
          <button 
            onClick={() => handleViewChange('questionnaires')} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeView === 'questionnaires' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-lg' : 'text-[var(--theme-primary)]/60 hover:text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]'}`}
          >
            <ListChecks size={18} />
            <span className="hidden sm:inline">שאלונים</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsThemeModalOpen(true)}
            className="p-2.5 text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-xl transition-all border border-transparent hover:border-[var(--theme-border)]"
            title="בחר פלטת צבעים"
          >
            <Palette size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside 
          className={`border-l border-[var(--theme-border)] bg-[var(--theme-card)] overflow-hidden hidden lg:flex flex-col shadow-xl z-20 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-16' : 'w-80'}`}
        >
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center py-8 gap-4">
              <button onClick={addNewBookToLibrary} className="p-3 text-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] rounded-xl"><Plus size={20} /></button>
              <div className="h-px w-8 bg-[var(--theme-secondary)]" />
              {books.map(book => (
                <button 
                  key={book.id} 
                  onClick={() => setActiveBookId(book.id)}
                  className={`p-3 rounded-xl transition-all ${activeBookId === book.id ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-md' : 'text-[var(--theme-primary)]/20 hover:bg-[var(--theme-secondary)]'}`}
                  title={book.title}
                >
                  <BookIcon size={20} />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="p-8 border-b border-[var(--theme-secondary)]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="flex items-center gap-2 text-xs font-black text-[var(--theme-primary)] uppercase tracking-[0.2em]">הספרים שלי</h3>
                  <button onClick={addNewBookToLibrary} className="text-[var(--theme-accent)] hover:text-[var(--theme-primary)] p-2 rounded-xl hover:bg-[var(--theme-secondary)] transition-all"><Plus size={20} /></button>
                </div>
                <div className="space-y-2">
                  {books.map(book => (
                    <div key={book.id} className={`group relative flex flex-col p-4 rounded-2xl transition-all cursor-pointer border-2 ${activeBookId === book.id ? 'bg-[var(--theme-secondary)] border-[var(--theme-border)]' : 'hover:bg-[var(--theme-secondary)]/50 border-transparent'}`} onClick={() => setActiveBookId(book.id)}>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <BookIcon size={18} className={activeBookId === book.id ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-primary)]/20'} />
                          {book.universeId && (
                            <Link size={10} className="absolute -top-1 -right-1 text-[var(--theme-accent)] bg-[var(--theme-card)] rounded-full" />
                          )}
                        </div>
                        <input 
                          value={book.title} 
                          onClick={(e) => e.stopPropagation()} 
                          onChange={(e) => renameBook(book.id, e.target.value)} 
                          className={`text-sm font-bold bg-transparent border-none focus:ring-0 p-0 flex-1 ${activeBookId === book.id ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-primary)]/40'}`} 
                        />
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          {book.universeId && (
                            <button 
                              onClick={(e) => unlinkBook(book.id, e)} 
                              className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="הפוך לספר עצמאי (הסרת שיוך)"
                            >
                              <Link2Off size={14} />
                            </button>
                          )}
                          <button 
                            onClick={(e) => deleteBook(book.id, e)} 
                            className="p-1.5 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-lg"
                            title="מחיקת ספר"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 border-b border-[var(--theme-secondary)]">
                {activeBook && (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="flex items-center gap-2 text-xs font-black text-[var(--theme-primary)] uppercase tracking-[0.2em]">קווי עלילה</h3>
                      <button onClick={addPlotline} className="text-[var(--theme-accent)] hover:text-[var(--theme-primary)] p-2 rounded-xl hover:bg-[var(--theme-secondary)] transition-all"><Plus size={20} /></button>
                    </div>
                    <div className="space-y-2">
                      {activeBook.plotlines.map(plotline => (
                        <div key={plotline.id} className="group flex items-center gap-3 p-3 rounded-2xl bg-[var(--theme-secondary)]/30 border border-transparent hover:border-[var(--theme-border)] transition-all">
                          <div className="flex flex-col gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => movePlotline(plotline.id, 'up')}
                              className="text-[var(--theme-primary)]/40 hover:text-[var(--theme-primary)]"
                              title="הזז למעלה"
                            >
                              <ChevronUp size={12} />
                            </button>
                            <button 
                              onClick={() => movePlotline(plotline.id, 'down')}
                              className="text-[var(--theme-primary)]/40 hover:text-[var(--theme-primary)]"
                              title="הזז למטה"
                            >
                              <ChevronDown size={12} />
                            </button>
                          </div>
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: plotline.color }} />
                          <input 
                            value={plotline.name} 
                            onChange={(e) => renamePlotline(plotline.id, e.target.value)}
                            className="text-xs font-bold bg-transparent border-none focus:ring-0 p-0 flex-1 text-[var(--theme-primary)]"
                          />
                          <button 
                            onClick={() => togglePlotlineVisibility(plotline.id)}
                            className={`p-1.5 rounded-lg transition-colors ${visiblePlotlines.includes(plotline.id) ? 'text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]' : 'text-[var(--theme-primary)]/30 hover:bg-[var(--theme-secondary)]/50'}`}
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
                  <h3 className="text-xs font-black text-[var(--theme-primary)] uppercase tracking-[0.2em]">ניהול נתונים</h3>
                </div>
                <div className="flex flex-col gap-3">
                  <button onClick={exportDataBackup} className="flex items-center gap-3 px-4 py-3 bg-[var(--theme-card)] border border-[var(--theme-border)] text-[var(--theme-primary)] rounded-xl text-xs font-bold hover:bg-[var(--theme-secondary)] transition-all shadow-sm">
                    <FileJson size={16} className="text-[var(--theme-accent)]" />
                    <span>גיבוי מלא</span>
                  </button>
                  <label className="flex items-center gap-3 px-4 py-3 bg-[var(--theme-card)] border border-[var(--theme-border)] text-[var(--theme-primary)] rounded-xl text-xs font-bold hover:bg-[var(--theme-secondary)] transition-all shadow-sm cursor-pointer">
                    <Upload size={16} className="text-[var(--theme-accent)]" />
                    <span>טעינת גיבוי</span>
                    <input 
                      type="file" 
                      accept=".json" 
                      className="hidden" 
                      onChange={handleImportBackup}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 relative overflow-hidden bg-[var(--theme-bg)]">
          {activeBook ? (
            <>
              {activeView === 'planning' && (
                <div className="absolute inset-0">
                  <PlotStructure 
                    selectedStructure={activeBook.plotStructure}
                    onSelect={(id) => updateActiveBook({ plotStructure: id })}
                    scenes={activeBook.scenes}
                    pointsData={activeBook.plotStructurePoints || {}}
                    onUpdatePoint={(pointId, data) => {
                      const currentPoints = activeBook.plotStructurePoints || {};
                      updateActiveBook({
                        plotStructurePoints: {
                          ...currentPoints,
                          [pointId]: data
                        }
                      });
                    }}
                    customPlotPoints={activeBook.customPlotPoints || []}
                    onUpdateCustomPoints={(points) => updateActiveBook({ customPlotPoints: points })}
                    characterArcs={activeBook.characterArcs || []}
                    onUpdateArcs={(arcs) => updateActiveBook({ characterArcs: arcs })}
                    characters={activeBook.characters || []}
                    relationships={activeBook.relationships || []}
                    onUpdateRelationships={(rels) => updateActiveBook({ relationships: rels })}
                  />
                </div>
              )}
              {activeView === 'board' && (
                <div className="absolute inset-0">
                  <Board 
                    project={activeBook} 
                    title={activeBook.title}
                    visiblePlotlines={visiblePlotlines}
                    onAddScene={addScene}
                    onMoveScene={moveScene} 
                    updateScene={updateScene} 
                    onDeleteScene={deleteScene}
                    onUpdateSummary={(summary) => updateActiveBook({ summary })}
                    onBulkAdd={(pId) => { setBulkPlotlineId(pId); setIsBulkAddOpen(true); }} 
                    initialZoom={activeBook.uiState?.boardZoomLevel}
                    onZoomChange={(z) => updateBookUiState({ boardZoomLevel: z })}
                    onSceneDoubleClick={(id) => {
                      handleViewChange('editor');
                      updateBookUiState({ editorFocusedSceneId: id });
                    }}
                    onUpdateChapterTitle={updateChapterTitle}
                    onAddChapterMarker={addChapterMarker}
                    onUpdateChapterMarker={updateChapterMarker}
                    onDeleteChapterMarker={deleteChapterMarker}
                  />
                </div>
              )}
              {activeView === 'editor' && (
                <div className="absolute inset-0 bg-white overflow-auto shadow-2xl">
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
                    onUpdateChapterMarker={updateChapterMarker}
                  />
                </div>
              )}
              {activeView === 'maps' && (
                <div className="absolute inset-0 overflow-hidden">
                   <MapsManager 
                      allBooks={books}
                      activeBookId={activeBookId}
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
                    allBooks={books}
                    activeBookId={activeBookId}
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
            <div className="absolute inset-0 flex items-center justify-center text-amber-800/20">
              <p className="text-xl font-bold">אנא בחר ספר או צור אחד חדש</p>
            </div>
          )}
        </main>
      </div>

      {/* Update Notification */}
      {updateStatus !== 'none' && (
        <div className="fixed bottom-6 left-6 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-[var(--theme-card)] border border-[var(--theme-border)] p-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px]">
            <div className="w-10 h-10 rounded-xl bg-[var(--theme-accent)]/10 flex items-center justify-center text-[var(--theme-accent)]">
              <MonitorSmartphone size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-[var(--theme-primary)]">
                {updateStatus === 'available' ? 'עדכון זמין' : 'העדכון מוכן'}
              </h4>
              <p className="text-xs text-[var(--theme-muted)]">
                {updateStatus === 'available' ? 'מוריד עדכון חדש ברקע...' : 'העדכון הורד בהצלחה. יש להפעיל מחדש.'}
              </p>
            </div>
            {updateStatus === 'downloaded' && (
              <button 
                onClick={restartApp}
                className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-xl text-xs font-bold hover:opacity-90 transition-all"
              >
                הפעל מחדש
              </button>
            )}
            <button 
              onClick={() => setUpdateStatus('none')}
              className="p-2 text-[var(--theme-muted)] hover:text-[var(--theme-primary)]"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {isThemeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--theme-card)] w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-[var(--theme-border)] p-8 animate-in zoom-in-95 duration-200">
             <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold handwritten text-4xl text-[var(--theme-primary)]">בחר פלטת צבעים</h2>
                <button onClick={() => setIsThemeModalOpen(false)} className="text-[var(--theme-primary)]/30 hover:text-[var(--theme-primary)] p-1 transition-colors"><X size={28} /></button>
             </div>
             
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Object.entries(THEMES).map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => {
                      updateBookUiState({ theme: key as any });
                      setIsThemeModalOpen(false);
                    }}
                    className={`group relative flex flex-col p-4 rounded-3xl transition-all border-2 ${activeBook?.uiState?.theme === key ? 'border-[var(--theme-primary)] bg-[var(--theme-secondary)]' : 'border-transparent bg-[var(--theme-bg)] hover:border-[var(--theme-border)]'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-sm">{theme.name}</span>
                      {activeBook?.uiState?.theme === key && <CheckCircle2 size={16} className="text-[var(--theme-primary)]" />}
                    </div>
                    <div className="flex gap-1.5">
                      <div className="w-6 h-6 rounded-full border border-black/5" style={{ backgroundColor: theme.primary }} />
                      <div className="w-6 h-6 rounded-full border border-black/5" style={{ backgroundColor: theme.accent }} />
                      <div className="w-6 h-6 rounded-full border border-black/5" style={{ backgroundColor: theme.bg }} />
                    </div>
                  </button>
                ))}
             </div>
          </div>
        </div>
      )}

      {isBulkAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--theme-card)] w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-[var(--theme-border)] p-8 animate-in zoom-in-95 duration-200">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold handwritten text-3xl text-[var(--theme-primary)]">הוספה מרובה של סצנות</h2>
                <button onClick={() => setIsBulkAddOpen(false)} className="text-[var(--theme-primary)]/30 hover:text-[var(--theme-primary)] p-1 transition-colors"><X size={28} /></button>
             </div>
             
             <div className="space-y-4">
                {activeBook && (
                  <div>
                    <label className="text-xs font-black text-[var(--theme-primary)] uppercase tracking-widest mb-2 block">בחר קו עלילה</label>
                    <select 
                        value={bulkPlotlineId} 
                        onChange={(e) => setBulkPlotlineId(e.target.value)}
                        className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-[var(--theme-primary)]/20 outline-none"
                    >
                        {activeBook.plotlines.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                  </div>
                )}
                
                <div>
                   <label className="text-xs font-black text-[var(--theme-primary)] uppercase tracking-widest mb-2 block">כותרות הסצנות (אחת בכל שורה)</label>
                   <textarea 
                      value={bulkTitles} 
                      onChange={(e) => setBulkTitles(e.target.value)} 
                      className="w-full h-48 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl p-4 text-sm focus:ring-4 focus:ring-[var(--theme-primary)]/20 outline-none resize-none"
                      placeholder="התחלה&#10;המשבר&#10;הפתרון..."
                   />
                </div>

                <div className="flex gap-3 pt-4">
                   <button onClick={handleBulkAdd} className="w-full bg-[var(--theme-primary)] text-[var(--theme-card)] font-bold py-4 rounded-2xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2">
                      <Plus size={20} />
                      <span>הוסף סצנות</span>
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {isNewBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--theme-card)] w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-[var(--theme-border)] p-8 animate-in zoom-in-95 duration-200">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold handwritten text-3xl text-[var(--theme-primary)]">הוספת ספר חדש</h2>
                <button onClick={() => setIsNewBookModalOpen(false)} className="text-[var(--theme-primary)]/30 hover:text-[var(--theme-primary)] p-1 transition-colors"><X size={28} /></button>
             </div>
             
             <div className="space-y-6">
                <div>
                   <label className="text-xs font-black text-[var(--theme-primary)] uppercase tracking-widest mb-2 block">שם הספר</label>
                   <input 
                      type="text"
                      value={newBookTitle}
                      onChange={(e) => setNewBookTitle(e.target.value)}
                      className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-[var(--theme-primary)]/20 outline-none"
                      placeholder="הזן שם לספר..."
                      autoFocus
                   />
                </div>

                <div>
                   <label className="text-xs font-black text-[var(--theme-primary)] uppercase tracking-widest mb-2 block">שיוך לספר קיים (סנכרון שאלונים ומפות)</label>
                   <select 
                      value={linkToBookId}
                      onChange={(e) => setLinkToBookId(e.target.value)}
                      className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-[var(--theme-primary)]/20 outline-none"
                   >
                      <option value="">ספר עצמאי (ללא שיוך)</option>
                      {books.map(book => (
                        <option key={book.id} value={book.id}>{book.title}</option>
                      ))}
                   </select>
                   <p className="mt-2 text-[10px] text-[var(--theme-primary)]/60 leading-relaxed">
                      * שיוך ספרים יגרום לכך שכל שינוי בדמויות, מקומות, תקופות ומפות יתעדכן אוטומטית בכל הספרים המשויכים.
                   </p>
                </div>

                <div className="flex gap-3 pt-4">
                   <button 
                    onClick={handleCreateNewBook} 
                    className="w-full bg-[var(--theme-primary)] text-[var(--theme-card)] font-bold py-4 rounded-2xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                   >
                      <Plus size={20} />
                      <span>צור ספר</span>
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {isAboutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--theme-card)] w-full max-w-md rounded-[2.5rem] shadow-2xl border border-[var(--theme-border)] p-10 animate-in zoom-in-95 duration-200 text-center relative">
             <button 
               onClick={() => setIsAboutModalOpen(false)} 
               className="absolute top-6 left-6 text-[var(--theme-primary)]/30 hover:text-[var(--theme-primary)] p-1 transition-colors"
             >
               <X size={24} />
             </button>
             
             <div className="bg-[var(--theme-primary)] w-20 h-20 rounded-3xl text-[var(--theme-card)] flex items-center justify-center mx-auto mb-8 shadow-xl transform -rotate-3">
                <BookOpen size={40} />
             </div>
             
             <h2 className="text-2xl font-bold text-[var(--theme-primary)] mb-6 leading-tight">
               סיימתם לכתוב? <br />
               <span className="text-[var(--theme-accent)] handwritten text-4xl">זה הזמן לעריכה ספרותית.</span>
             </h2>
             
             <div className="space-y-4 mb-8">
               <p className="text-[var(--theme-primary)]/60 font-bold uppercase tracking-widest text-xs">פנו אלי:</p>
               <a 
                 href="https://linktr.ee/cherutkelman" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--theme-secondary)] text-[var(--theme-primary)] rounded-xl font-bold hover:bg-[var(--theme-border)] transition-colors border border-[var(--theme-border)]/50"
               >
                 <Link size={18} />
                 linktr.ee/cherutkelman
               </a>
             </div>
             
             <div className="pt-6 border-t border-[var(--theme-border)]/30">
               <p className="text-2xl font-bold text-[var(--theme-primary)] handwritten text-4xl">חרות קלמן</p>
               <p className="text-[10px] font-bold text-[var(--theme-primary)]/40 uppercase tracking-[0.2em] mt-1">Literary Editor & Story Consultant</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;