import React, { useState, useEffect, useRef, useMemo } from 'react';
import { loadBooks, saveBooks, getOrCreateUserId, createNewBook, updateBookAndSharedFields, softDeleteBookInList, updateBookInList, syncService, SyncState, SyncStatus, loadUIStates, saveUIStates, loadGlobalUIState, saveGlobalUIState, syncLogger, setUserId, migrateLegacyBooks, setStorageMode, deduplicateBooks, storageManager } from "./storage";
import { auth, signIn as signInWithGoogle, logOut as logout } from './src/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
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
  Map as MapIcon,
  Eye,
  EyeOff,
  MessageSquareQuote,
  Send,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Palette,
  Link2Off,
  Link,
  RefreshCw,
  Cloud,
  AlertCircle
} from 'lucide-react';
import { Scene, Plotline, Project, Book, QuestionnaireEntry, CharacterMapConnection, WorldMap, THEMES, ChapterMarker, BookUIState } from './types';
import Board from './components/Board';
import Editor from './components/Editor';
import ExternalReview from './components/ExternalReview';
import Questionnaires from './components/Questionnaires';
import MapsManager from './components/MapsManager';
import PlotStructure from './components/PlotStructure';
import { GoogleGenAI, Type } from "@google/genai";

const SHARED_FIELDS = [
  'characters', 'places', 'periods', 'twists', 'fantasyWorlds', 'backgrounds',
  'characterMapConnections', 'maps', 'mindMaps'
];

const App: React.FC = () => {
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Logged in
        console.log("App: User logged in, initializing cloud storage");
        setUserId(firebaseUser.uid);
        setCurrentUserId(firebaseUser.uid);
        
        // 1. Migrate legacy books in local storage to the new UID
        await migrateLegacyBooks(firebaseUser.uid);
        
        // 2. Switch to cloud mode
        setStorageMode('cloud');
        setStorageModeState('cloud');
        
        // 3. Perform initial sync to merge local and remote
        console.log("App: Performing initial sync...");
        try {
          setIsSyncing(true);
          const { updatedBooks } = await syncService.sync();
          console.log(`App: Initial sync complete. Found ${updatedBooks.length} books.`);
          setBooks(deduplicateBooks(updatedBooks));
          setCloudError(null);
        } catch (error: any) {
          console.error("App: Initial sync failed", error);
          if (error.message?.includes('resource-exhausted') || error.message?.includes('quota')) {
            setCloudError('מכסת האחסון בענן הסתיימה להיום. השינויים נשמרים מקומית ויסונכרנו מחר.');
          }
        } finally {
          setIsSyncing(false);
        }
      } else {
        // Logged out
        console.log("App: User logged out, switching to local storage");
        setUserId(null);
        setCurrentUserId(getOrCreateUserId());
        setStorageMode('local');
        setStorageModeState('local');
        
        const loadedBooks = await loadBooks();
        setBooks(deduplicateBooks(loadedBooks));
      }

      const loadedUI = loadUIStates();
      const globalUI = loadGlobalUIState();
      
      setUiStates(loadedUI);
      setIsAuthReady(true);
      setIsLoading(false);

      // Select active book after books are loaded/synced
      setBooks(prev => {
        if (prev.length > 0) {
          const lastActiveId = globalUI.lastActiveBookId;
          const bookToSelect = prev.find(b => b.id === lastActiveId) || prev[0];
          setActiveBookId(bookToSelect.id);
        }
        return prev;
      });
    });

    syncService.subscribe(setSyncStatus);
    return () => unsubscribe();
  }, []);

  const [books, setBooks] = useState<Book[]>([]);
  const displayBooks = useMemo(() => deduplicateBooks(books), [books]);
  const [user, setUser] = useState<User | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>(getOrCreateUserId());
  const [uiStates, setUiStates] = useState<Record<string, BookUIState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncState>('idle');

  useEffect(() => {
    console.log(`[App] syncStatus changed to: ${syncStatus}`);
  }, [syncStatus]);

  const [showDebug, setShowDebug] = useState(false);
  
  const [activeBookId, setActiveBookId] = useState<string>('');
  const [storageMode, setStorageModeState] = useState<'local' | 'cloud'>(storageManager.getMode());
  const [activeView, setActiveView] = useState<'board' | 'editor' | 'questionnaires' | 'maps' | 'planning'>('board');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [visiblePlotlines, setVisiblePlotlines] = useState<string[]>([]);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [lastCloudSaved, setLastCloudSaved] = useState<Date | null>(null);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Modals state
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [isNewBookModalOpen, setIsNewBookModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [linkToBookId, setLinkToBookId] = useState<string>('');

  const [resolvingBookId, setResolvingBookId] = useState<string | null>(null);
  const [remoteBookData, setRemoteBookData] = useState<Book | null>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isMergingManually, setIsMergingManually] = useState(false);
  const [mergeTitle, setMergeTitle] = useState('');

  const [bulkTitles, setBulkTitles] = useState('');
  const [bulkPlotlineId, setBulkPlotlineId] = useState('');
  const [updateStatus, setUpdateStatus] = useState<'none' | 'available' | 'downloaded'>('none');

  const activeBook = useMemo(() => 
    books.find(b => b.id === activeBookId) || books[0], 
    [books, activeBookId]
  );

  const activeUI = useMemo(() => 
    uiStates[activeBookId] || (activeBook ? uiStates[activeBook.id] : {}) || {},
    [uiStates, activeBookId, activeBook]
  );

  useEffect(() => {
    if (activeUI.lastView) {
      setActiveView(activeUI.lastView);
    }
  }, [activeBookId]);

  useEffect(() => {
    if (activeBook) {
      setVisiblePlotlines(activeBook.plotlines.map(p => p.id));
      if (!bulkPlotlineId) setBulkPlotlineId(activeBook.plotlines[0]?.id || '');
    }
  }, [activeBook?.id]);

  useEffect(() => {
    if (books.length > 0 && activeBookId && !books.find(b => b.id === activeBookId)) {
      setActiveBookId(books[0].id);
    }
  }, [books, activeBookId]);

  // Local save effect (1s)
  useEffect(() => {
    const timeout = setTimeout(async () => {
      const updatedBooks = await saveBooks(books, true); // Skip cloud
      // We don't necessarily need to setBooks here because it's just local save
      // but if we want to be safe and keep state in sync with storage:
      // setBooks(updatedBooks); 
      saveUIStates(uiStates);
      saveGlobalUIState({ lastActiveBookId: activeBookId });
      setLastSaved(new Date());
    }, 1000); // Debounce local save by 1 second
    return () => clearTimeout(timeout);
  }, [books, uiStates, activeBookId]);

  // Cloud save effect (5 minutes)
  useEffect(() => {
    if (storageMode !== 'cloud' || !user || isSyncing) return;
    
    // Only trigger cloud save if there are pending changes
    const hasPendingChanges = books.some(b => b.pendingSync);
    if (!hasPendingChanges) return;

    // If we recently had a quota error, wait longer before retrying
    const debounceTime = cloudError?.includes('quota') ? 600000 : 300000; // 10m if quota error, else 5m

    const timeout = setTimeout(async () => {
      try {
        console.log("[App] Debounced cloud save triggered...");
        setIsSyncing(true);
        const currentBooks = books; // Capture current state
        const updatedBooks = await saveBooks(currentBooks, false); // Don't skip cloud
        
        setBooks(prev => {
          // Merge updatedBooks into prev, but only if prev hasn't been updated since we started saving
          return prev.map(p => {
            const updated = updatedBooks.find(u => u.id === p.id);
            if (updated && updated.updatedAt === p.updatedAt) {
              // This book hasn't changed since we started the save, so it's safe to clear its pendingSync flag
              return updated;
            }
            return p;
          });
        });
        
        setLastCloudSaved(new Date());
        setCloudError(null);
      } catch (e: any) {
        console.error("Cloud save failed", e);
        if (e.message?.includes('resource-exhausted') || e.message?.includes('quota')) {
          setCloudError('מכסת האחסון בענן הסתיימה להיום. השינויים נשמרים מקומית ויסונכרנו מחר.');
        } else {
          setCloudError('סנכרון לענן נכשל. ננסה שוב בקרוב.');
        }
      } finally {
        setIsSyncing(false);
      }
    }, debounceTime); 
    return () => clearTimeout(timeout);
  }, [books, storageMode, user, cloudError, isSyncing]);

  useEffect(() => {
    const themeKey = activeBook?.theme || 'classic';
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
  }, [activeBook?.theme]);

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
    setBooks(prev => updateBookAndSharedFields(prev, activeBookId, updates, SHARED_FIELDS));
  };

  const updateBookUiState = (updates: Partial<BookUIState>) => {
    if (!activeBookId) return;
    setUiStates(prev => ({
      ...prev,
      [activeBookId]: {
        ...(prev[activeBookId] || {}),
        ...updates
      }
    }));
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
      const deletedPositions = activeBook.scenes
        .filter(s => s.plotlineId === id)
        .map(s => s.position)
        .sort((a, b) => a - b);

      const remainingScenes = activeBook.scenes
        .filter(s => s.plotlineId !== id)
        .sort((a, b) => a.position - b.position)
        .map((s, idx) => ({ ...s, position: idx }));
      
      const updatedMarkers = (activeBook.chapterMarkers || []).map(m => {
        const shift = deletedPositions.filter(pos => pos < m.position).length;
        return { ...m, position: m.position - shift };
      });

      updateActiveBook({
        plotlines: activeBook.plotlines.filter(p => p.id !== id),
        scenes: remainingScenes,
        chapterMarkers: updatedMarkers
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

    // Shift chapter markers that are at or after the insertion point
    const updatedMarkers = (activeBook.chapterMarkers || []).map(m => {
      if (m.position >= newPos) {
        return { ...m, position: m.position + 1 };
      }
      return m;
    });

    updateActiveBook({
      scenes: newScenes.map((s, idx) => ({ ...s, position: idx })),
      chapterMarkers: updatedMarkers
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

    const oldPos = sceneToMove.position;
    const otherScenes = activeBook.scenes.filter(s => s.id !== id);
    const updatedScene = { ...sceneToMove, plotlineId: targetPlotlineId };
    
    const newScenes = [...otherScenes];
    newScenes.splice(targetGlobalIndex, 0, updatedScene);

    // Update chapter markers based on the move
    const updatedMarkers = (activeBook.chapterMarkers || []).map(m => {
      let newMarkerPos = m.position;
      
      if (m.position === oldPos) {
        newMarkerPos = targetGlobalIndex;
      } else if (oldPos < targetGlobalIndex) {
        // Moving forward: scenes between oldPos + 1 and targetGlobalIndex shift back
        if (m.position > oldPos && m.position <= targetGlobalIndex) {
          newMarkerPos = m.position - 1;
        }
      } else if (oldPos > targetGlobalIndex) {
        // Moving backward: scenes between targetGlobalIndex and oldPos - 1 shift forward
        if (m.position >= targetGlobalIndex && m.position < oldPos) {
          newMarkerPos = m.position + 1;
        }
      }
      
      return { ...m, position: newMarkerPos };
    });

    updateActiveBook({
      scenes: newScenes.map((s, idx) => ({ ...s, position: idx })),
      chapterMarkers: updatedMarkers
    });
  };

  const deleteScene = (id: string) => {
    if (!activeBook) return;
    
    const sceneToDelete = activeBook.scenes.find(s => s.id === id);
    if (!sceneToDelete) return;
    const deletedPos = sceneToDelete.position;

    const newScenes = activeBook.scenes
      .filter(s => s.id !== id)
      .sort((a, b) => a.position - b.position)
      .map((s, idx) => ({ ...s, position: idx }));
    
    // Shift chapter markers that are after the deleted point
    const updatedMarkers = (activeBook.chapterMarkers || []).map(m => {
      if (m.position > deletedPos) {
        return { ...m, position: m.position - 1 };
      }
      return m;
    });

    updateActiveBook({ 
      scenes: newScenes,
      chapterMarkers: updatedMarkers
    });
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
    
    let universeId = linkToBookId ? (books.find(b => b.id === linkToBookId)?.universeId || uuidv4()) : undefined;
    let sharedData: Partial<Project> = {};
    
    if (linkToBookId) {
      const sourceBook = books.find(b => b.id === linkToBookId);
      if (sourceBook) {
        SHARED_FIELDS.forEach(field => {
          (sharedData as any)[field] = (sourceBook as any)[field];
        });
        
        // If source book didn't have universeId, update it
        if (!sourceBook.universeId) {
          setBooks(prev => updateBookInList(prev, linkToBookId, { universeId }));
        }
      }
    }

    const newBook = createNewBook(newBookTitle, currentUserId, universeId, sharedData);
    setBooks(prev => [...prev, newBook]);
    setActiveBookId(newBook.id);
    
    setIsNewBookModalOpen(false);
  };

  const renameBook = (id: string, title: string) => {
    setBooks(prev => updateBookInList(prev, id, { title }));
  };

  const deleteBook = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // In a real app we'd show a custom modal here. 
    // For now, we'll just proceed to comply with "no confirm" rule.
    const remainingBooks = books.filter(b => b.id !== id && !b.deletedAt);
    if (remainingBooks.length === 0) {
      const freshBook = createNewBook('ספר חדש', currentUserId);
      setBooks([freshBook]);
      setActiveBookId(freshBook.id);
    } else {
      setBooks(prev => softDeleteBookInList(prev, id));
      if (activeBookId === id) {
        setActiveBookId(remainingBooks[0].id);
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

  const handleSync = async () => {
    console.log("[App] Sync button clicked");
    if (isSyncing) return;
    
    try {
      setIsSyncing(true);
      // Ensure latest state is saved before sync
      console.log("[App] Saving books before sync...");
      const currentBooks = books;
      const savedBooks = await saveBooks(currentBooks);
      
      setBooks(prev => {
        return prev.map(p => {
          const saved = savedBooks.find(s => s.id === p.id);
          if (saved && saved.updatedAt === p.updatedAt) {
            return saved;
          }
          return p;
        });
      });
      
      console.log("[App] Calling syncService.sync()...");
      const { updatedBooks } = await syncService.sync();
      setLastCloudSaved(new Date());
      setCloudError(null);
      
      if (updatedBooks.length > 0) {
        console.log(`[App] Sync complete. Updating state with ${updatedBooks.length} books.`);
        setBooks(prev => {
          // For sync, we might need to be more careful, but usually sync is a full replace
          // However, to be safe against concurrent edits:
          const map = new Map(prev.map(b => [b.id, b]));
          updatedBooks.forEach(u => {
            const existing = map.get(u.id);
            if (!existing || u.updatedAt >= existing.updatedAt) {
              map.set(u.id, u);
            }
          });
          return Array.from(map.values());
        });
      } else {
        console.log("[App] Sync complete. No updates to local state.");
      }
    } catch (error: any) {
      console.error("[App] Sync error:", error);
      if (error.message?.includes('resource-exhausted') || error.message?.includes('quota')) {
        setCloudError('מכסת האחסון בענן הסתיימה להיום. השינויים נשמרים מקומית ויסונכרנו מחר.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const openConflictResolver = async (bookId: string) => {
    const remote = await syncService.getRemoteBook(bookId);
    if (!remote) {
      alert("לא ניתן היה לטעון את הגרסה מהענן");
      return;
    }
    setResolvingBookId(bookId);
    setRemoteBookData(remote);
    setIsConflictModalOpen(true);
    setIsMergingManually(false);
  };

  const resolveConflict = async (resolution: 'local' | 'remote' | 'merge') => {
    if (!resolvingBookId || !remoteBookData) return;

    const localBookBefore = books.find(b => b.id === resolvingBookId);
    console.log(`[App] resolveConflict starting for book ${resolvingBookId}:`, {
      resolution,
      local: localBookBefore ? {
        updatedAt: new Date(localBookBefore.updatedAt).toISOString(),
        lastSyncedAt: localBookBefore.lastSyncedAt ? new Date(localBookBefore.lastSyncedAt).toISOString() : 'Never',
        pendingSync: localBookBefore.pendingSync,
        syncStatus: localBookBefore.syncStatus
      } : 'N/A',
      remote: {
        updatedAt: new Date(remoteBookData.updatedAt).toISOString(),
        lastSyncedAt: remoteBookData.lastSyncedAt ? new Date(remoteBookData.lastSyncedAt).toISOString() : 'Never',
        pendingSync: remoteBookData.pendingSync,
        syncStatus: remoteBookData.syncStatus
      }
    });

    if (resolution === 'local') {
      setBooks(prev => {
        const updated = prev.map(b => b.id === resolvingBookId ? { 
          ...b, 
          syncStatus: 'synced' as SyncStatus, 
          pendingSync: true, 
          forceOverwriteRemote: true,
          updatedAt: Date.now() 
        } : b);
        
        const resolvedBook = updated.find(b => b.id === resolvingBookId);
        console.log(`[App] resolveConflict: Resolution 'local' applied in state:`, {
          id: resolvedBook?.id,
          updatedAt: resolvedBook ? new Date(resolvedBook.updatedAt).toISOString() : 'N/A',
          pendingSync: resolvedBook?.pendingSync,
          forceOverwriteRemote: resolvedBook?.forceOverwriteRemote
        });
        
        return updated;
      });
    } else if (resolution === 'remote') {
      setBooks(prev => {
        const updated = prev.map(b => b.id === resolvingBookId ? { 
          ...remoteBookData, 
          syncStatus: 'synced' as SyncStatus, 
          pendingSync: false 
        } : b);

        const resolvedBook = updated.find(b => b.id === resolvingBookId);
        console.log(`[App] resolveConflict: Resolution 'remote' applied in state:`, {
          id: resolvedBook?.id,
          updatedAt: resolvedBook ? new Date(resolvedBook.updatedAt).toISOString() : 'N/A',
          pendingSync: resolvedBook?.pendingSync
        });

        return updated;
      });
    } else if (resolution === 'merge') {
      const localBook = books.find(b => b.id === resolvingBookId);
      if (!localBook) return;
      setBooks(prev => {
        const updated = prev.map(b => b.id === resolvingBookId ? { 
          ...localBook, 
          title: mergeTitle,
          syncStatus: 'synced' as SyncStatus, 
          pendingSync: true, 
          forceOverwriteRemote: true, // MUST set this to resolve the conflict
          updatedAt: Date.now() 
        } : b);

        const resolvedBook = updated.find(b => b.id === resolvingBookId);
        console.log(`[App] resolveConflict: Resolution 'merge' applied in state:`, {
          id: resolvedBook?.id,
          updatedAt: resolvedBook ? new Date(resolvedBook.updatedAt).toISOString() : 'N/A',
          pendingSync: resolvedBook?.pendingSync,
          forceOverwriteRemote: resolvedBook?.forceOverwriteRemote
        });

        return updated;
      });
    }

    setIsConflictModalOpen(false);
    setResolvingBookId(null);
    setRemoteBookData(null);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--theme-bg)] text-[var(--theme-primary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--theme-primary)]"></div>
          <p className="handwritten text-2xl">טוען את הסיפורים שלך...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--theme-bg)] text-[var(--theme-text)] overflow-y-auto scrollbar-hide transition-colors duration-500">
      {cloudError && (
        <div className="bg-amber-500 text-white px-6 py-2 flex items-center justify-between text-sm font-bold z-[100] sticky top-0 shadow-lg animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{cloudError}</span>
          </div>
          <button onClick={() => setCloudError(null)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
      )}
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
            <MapIcon size={18} />
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
            onClick={handleSync}
            disabled={syncStatus === 'syncing' || isSyncing}
            className={`flex items-center gap-2 p-2.5 rounded-xl transition-all border border-transparent hover:border-[var(--theme-border)] ${
              (syncStatus === 'syncing' || isSyncing) ? 'animate-pulse' : ''
            } ${
              (syncStatus === 'error' || cloudError) ? 'text-red-500' : 
              syncStatus === 'success' ? 'text-green-500' : 'text-[var(--theme-primary)]'
            }`}
            title={
              (syncStatus === 'syncing' || isSyncing) ? "מסנכרן..." : 
              (syncStatus === 'error' || cloudError) ? (cloudError || "שגיאה בסנכרון") : 
              syncStatus === 'success' ? "סונכרן בהצלחה" : 
              `סנכרן עכשיו${lastCloudSaved ? ` (סונכרן לאחרונה: ${lastCloudSaved.toLocaleTimeString()})` : ''}`
            }
          >
            {(syncStatus === 'syncing' || isSyncing) ? <RefreshCw size={20} className="animate-spin" /> : 
             (syncStatus === 'error' || cloudError) ? <AlertCircle size={20} /> :
             syncStatus === 'success' ? <CheckCircle2 size={20} /> : 
             <div className="relative">
               <Cloud size={20} />
               {books.some(b => b.pendingSync) && (
                 <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full border border-[var(--theme-card)]" title="יש שינויים הממתינים לסנכרון" />
               )}
             </div>
            }
            <span className="hidden xl:inline text-xs font-bold">סנכרון</span>
          </button>
          <button 
            onClick={() => setIsThemeModalOpen(true)}
            className="p-2.5 text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-xl transition-all border border-transparent hover:border-[var(--theme-border)]"
            title="בחר פלטת צבעים"
          >
            <Palette size={20} />
          </button>
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="p-2.5 text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-xl transition-all border border-transparent hover:border-[var(--theme-border)]"
            title="דיאגנוסטיקה"
          >
            <Settings2 size={20} />
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
              {displayBooks.map(book => (
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
                  {displayBooks.map(book => (
                    <div key={book.id} className={`group relative flex flex-col p-4 rounded-2xl transition-all cursor-pointer border-2 ${activeBookId === book.id ? 'bg-[var(--theme-secondary)] border-[var(--theme-border)]' : 'hover:bg-[var(--theme-secondary)]/50 border-transparent'}`} onClick={() => setActiveBookId(book.id)}>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <BookIcon size={18} className={activeBookId === book.id ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-primary)]/20'} />
                          {book.universeId && (
                            <Link size={10} className="absolute -top-1 -right-1 text-[var(--theme-accent)] bg-[var(--theme-card)] rounded-full" />
                          )}
                          {book.syncStatus === 'conflict' && (
                            <AlertCircle size={10} className="absolute -bottom-1 -right-1 text-red-500 bg-[var(--theme-card)] rounded-full" />
                          )}
                        </div>
                        <input 
                          value={book.title} 
                          onClick={(e) => e.stopPropagation()} 
                          onChange={(e) => renameBook(book.id, e.target.value)} 
                          className={`text-sm font-bold bg-transparent border-none focus:ring-0 p-0 flex-1 ${activeBookId === book.id ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-primary)]/40'}`} 
                        />
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          {book.syncStatus === 'conflict' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); openConflictResolver(book.id); }}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg flex items-center gap-1"
                              title="יש קונפליקט בסנכרון. לחץ לפתרון."
                            >
                              <AlertCircle size={14} />
                              <span className="text-[10px] font-bold">פתור</span>
                            </button>
                          )}
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

              {/* Auth Section */}
              <div className="p-8 border-t border-[var(--theme-secondary)]">
                {user ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--theme-primary)]/10 flex items-center justify-center text-[var(--theme-primary)]">
                        <Users size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[var(--theme-primary)] truncate">{user.email}</p>
                        <p className="text-[10px] text-[var(--theme-primary)]/40 truncate font-mono">ID: {user.uid}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => logout()}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold bg-[var(--theme-card)] border border-[var(--theme-border)] text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] transition-all shadow-sm"
                    >
                      התנתק
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => signInWithGoogle()}
                    className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-2xl text-sm font-bold bg-[var(--theme-primary)] text-[var(--theme-card)] hover:opacity-90 transition-all shadow-lg"
                  >
                    <Users size={18} />
                    <span>התחבר עם Google</span>
                  </button>
                )}
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
                    initialZoom={activeUI.boardZoomLevel}
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
                    user={user}
                    visiblePlotlines={visiblePlotlines} 
                    onUpdateScene={updateScene} 
                    onDeleteScene={deleteScene}
                    onOpenBulkAdd={() => setIsBulkAddOpen(true)} 
                    initialFocusedSceneId={activeUI.editorFocusedSceneId}
                    onFocusScene={(id) => updateBookUiState({ editorFocusedSceneId: id })}
                    initialDisplayMode={activeUI.editorDisplayMode}
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
                      initialTab={activeUI.mapsActiveTab}
                      onTabChange={(tab) => updateBookUiState({ mapsActiveTab: tab })}
                      selectedMapId={activeUI.mapsSelectedMapId}
                      onMapSelect={(id) => updateBookUiState({ mapsSelectedMapId: id })}
                      selectedMindMapId={activeUI.mapsSelectedMindMapId}
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
                    initialTab={activeUI.questionnaireActiveTab}
                    initialSelectedEntryId={activeUI.questionnaireSelectedEntryId}
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
                      updateActiveBook({ theme: key as any });
                      setIsThemeModalOpen(false);
                    }}
                    className={`group relative flex flex-col p-4 rounded-3xl transition-all border-2 ${activeBook?.theme === key ? 'border-[var(--theme-primary)] bg-[var(--theme-secondary)]' : 'border-transparent bg-[var(--theme-bg)] hover:border-[var(--theme-border)]'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-sm">{theme.name}</span>
                      {activeBook?.theme === key && <CheckCircle2 size={16} className="text-[var(--theme-primary)]" />}
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

      {isConflictModalOpen && resolvingBookId && remoteBookData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--theme-card)] w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-[var(--theme-border)] p-8 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold handwritten text-3xl text-[var(--theme-primary)]">פתרון קונפליקט סנכרון</h2>
              <button onClick={() => setIsConflictModalOpen(false)} className="text-[var(--theme-primary)]/30 hover:text-[var(--theme-primary)] p-1 transition-colors"><X size={28} /></button>
            </div>

            <p className="text-sm text-[var(--theme-muted)] mb-8">
              נמצאו שינויים סותרים בענן עבור הספר <strong>{books.find(b => b.id === resolvingBookId)?.title}</strong>. בחר כיצד ברצונך להמשיך:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Local Version */}
              <div className="p-6 rounded-3xl bg-[var(--theme-secondary)]/30 border border-[var(--theme-border)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[var(--theme-primary)]">גרסה מקומית</h3>
                  <span className="text-[10px] px-2 py-1 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] rounded-full uppercase">המכשיר שלך</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="text-[10px] uppercase opacity-50 block">כותרת</label>
                    <p className="font-bold">{books.find(b => b.id === resolvingBookId)?.title}</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase opacity-50 block">עודכן לאחרונה</label>
                    <p>{new Date(books.find(b => b.id === resolvingBookId)?.updatedAt || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase opacity-50 block">סצנות</label>
                    <p>{books.find(b => b.id === resolvingBookId)?.scenes.length} סצנות</p>
                  </div>
                </div>
                <button 
                  onClick={() => resolveConflict('local')}
                  className="mt-6 w-full py-3 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-xl font-bold hover:opacity-90 transition-all"
                >
                  שמור גרסה מקומית
                </button>
              </div>

              {/* Remote Version */}
              <div className="p-6 rounded-3xl bg-[var(--theme-secondary)]/30 border border-[var(--theme-border)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[var(--theme-primary)]">גרסת ענן</h3>
                  <span className="text-[10px] px-2 py-1 bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] rounded-full uppercase">שרת / ענן</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="text-[10px] uppercase opacity-50 block">כותרת</label>
                    <p className="font-bold">{remoteBookData.title}</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase opacity-50 block">עודכן לאחרונה</label>
                    <p>{new Date(remoteBookData.updatedAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase opacity-50 block">סצנות</label>
                    <p>{remoteBookData.scenes.length} סצנות</p>
                  </div>
                </div>
                <button 
                  onClick={() => resolveConflict('remote')}
                  className="mt-6 w-full py-3 bg-[var(--theme-accent)] text-[var(--theme-card)] rounded-xl font-bold hover:opacity-90 transition-all"
                >
                  אמץ גרסת ענן
                </button>
              </div>
            </div>

            <div className="border-t border-[var(--theme-border)] pt-8">
              {!isMergingManually ? (
                <button 
                  onClick={() => {
                    setIsMergingManually(true);
                    setMergeTitle(books.find(b => b.id === resolvingBookId)?.title || '');
                  }}
                  className="w-full py-4 bg-[var(--theme-secondary)] text-[var(--theme-primary)] rounded-2xl font-bold hover:bg-[var(--theme-border)] transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} />
                  <span>מיזוג ידני (עריכת כותרת)</span>
                </button>
              ) : (
                <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                  <div>
                    <label className="text-xs font-black text-[var(--theme-primary)] uppercase tracking-widest mb-2 block">כותרת ממוזגת</label>
                    <input 
                      value={mergeTitle}
                      onChange={(e) => setMergeTitle(e.target.value)}
                      className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-[var(--theme-primary)]/20 outline-none"
                      placeholder="הכנס כותרת חדשה..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => resolveConflict('merge')}
                      className="flex-1 py-4 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-2xl font-bold hover:opacity-90 transition-all"
                    >
                      שמור ופתור
                    </button>
                    <button 
                      onClick={() => setIsMergingManually(false)}
                      className="px-6 py-4 bg-[var(--theme-secondary)] text-[var(--theme-primary)] rounded-2xl font-bold hover:bg-[var(--theme-border)] transition-all"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              )}
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
                      {displayBooks.map(book => (
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
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsAboutModalOpen(false)}
        >
          <div 
            className="bg-[var(--theme-card)] w-full max-w-md rounded-[2.5rem] shadow-2xl border border-[var(--theme-border)] p-10 animate-in zoom-in-95 duration-200 text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
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
               המטרה: לכתוב סיפור טוב.
             </h2>
             
             <div className="space-y-4 mb-8 text-[var(--theme-primary)]/80">
               <p className="text-lg">
                 זה המקום לתכנן, לדמיין, לכתוב ולהוציא לפועל את הסיפור שמתגלגל לנו בתוך הראש.
               </p>
               <p className="text-2xl font-bold handwritten text-[var(--theme-accent)]">
                 שנצא לדרך?
               </p>
             </div>
             
             <div className="pt-6 border-t border-[var(--theme-border)]/30">
               <p className="text-2xl font-bold text-[var(--theme-primary)] handwritten text-4xl">StoryLines</p>
               <p className="text-[10px] font-bold text-[var(--theme-primary)]/40 uppercase tracking-[0.2em] mt-1">by cherut kelman</p>
             </div>
          </div>
        </div>
      )}
      {showDebug && (
        <div className="fixed bottom-4 right-4 z-50 bg-[var(--theme-card)] border border-[var(--theme-border)] p-4 rounded-2xl shadow-2xl max-w-xs w-full handwritten">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-sm">Sync Diagnostics</h4>
            <button onClick={() => setShowDebug(false)}><X size={14} /></button>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-bold">{syncStatus}</span>
            </div>
            <div className="flex justify-between">
              <span>Syncing:</span>
              <span className={isSyncing ? 'text-amber-500 font-bold' : ''}>{isSyncing ? 'Yes' : 'No'}</span>
            </div>
            {cloudError && (
              <div className="mt-1 p-1 bg-red-50 text-red-600 rounded text-[10px] leading-tight">
                {cloudError}
              </div>
            )}
            <div className="flex justify-between">
              <span>Last Sync:</span>
              <span>{syncService.getLastSyncTime() ? new Date(syncService.getLastSyncTime()!).toLocaleTimeString() : 'Never'}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Cloud Sync:</span>
              <span>{lastCloudSaved ? lastCloudSaved.toLocaleTimeString() : 'Never'}</span>
            </div>
            <div className="flex justify-between">
              <span>Pending:</span>
              <span>{books.filter(b => b.pendingSync).length}</span>
            </div>
            <div className="flex justify-between">
              <span>Conflicts:</span>
              <span className={books.some(b => b.syncStatus === 'conflict') ? 'text-red-500 font-bold' : ''}>
                {books.filter(b => b.syncStatus === 'conflict').length}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-[var(--theme-border)]">
              <p className="text-[10px] opacity-60">Provider: {syncService.getDiagnostics().remoteProvider}</p>
              <button 
                onClick={async () => {
                  if (activeBookId) {
                    // 1. Save current state to LOCAL storage specifically to ensure it has the pending change
                    console.log(`[App] Simulation: Saving current state to LocalStorage for book ${activeBookId}`);
                    await storageManager.getLocalProvider().saveBooks(books);
                    
                    // 2. Simulate the remote change
                    await syncService.simulateRemoteChange(activeBookId);
                  }
                }}
                className="mt-2 w-full py-1 px-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-all"
              >
                Simulate Remote Conflict
              </button>
            </div>
            <div className="mt-2 pt-2 border-t border-[var(--theme-border)] max-h-40 overflow-y-auto">
              <p className="text-[10px] font-bold mb-1 uppercase opacity-40">Sync Logs</p>
              {syncLogger.getLogs().slice(0, 10).map((log: any, i: number) => (
                <div key={i} className={`text-[9px] mb-1 leading-tight ${log.level === 'error' ? 'text-red-500' : log.level === 'warn' ? 'text-amber-600' : 'text-slate-600'}`}>
                  <span className="opacity-50">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
                  {log.details && log.details.id && (
                    <div className="opacity-40 ml-2">ID: {log.details.id.substring(0, 8)}...</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;