
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
  Type,
  ChevronRight,
  Library,
  Book as BookIcon,
  Pencil,
  CopyPlus,
  X
} from 'lucide-react';
import { Scene, Plotline, Project, Book } from './types';
import Board from './components/Board';
import Editor from './components/Editor';
import { GoogleGenAI } from "@google/genai";

const STORAGE_KEY = 'storylines_library_v1';

const DEFAULT_PROJECT_DATA = {
  plotlines: [
    { id: 'p1', name: 'עלילה ראשית', color: '#ef4444' },
    { id: 'p2', name: 'עלילת משנה', color: '#3b82f6' }
  ],
  scenes: [
    { id: 's1', plotlineId: 'p1', title: 'התחלה', content: 'הגיבור יוצא לדרך...', position: 0, isCompleted: true },
    { id: 's2', plotlineId: 'p2', title: 'מזימה', content: 'הנבל מתכנן משהו...', position: 1, isCompleted: false },
    { id: 's3', plotlineId: 'p1', title: 'מכשול ראשון', content: 'הדרך נחסמת...', position: 2, isCompleted: false }
  ]
};

const createNewBook = (title: string): Book => ({
  id: `book-${Date.now()}`,
  title,
  lastModified: Date.now(),
  ...DEFAULT_PROJECT_DATA
});

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load library", e);
      }
    }
    return [createNewBook('הספר הראשון שלי')];
  });
  
  const [activeBookId, setActiveBookId] = useState<string>(books[0].id);
  const [activeView, setActiveView] = useState<'board' | 'editor'>('board');
  const [visiblePlotlines, setVisiblePlotlines] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  
  // Bulk Add Modal state
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [bulkTitles, setBulkTitles] = useState('');
  const [bulkPlotlineId, setBulkPlotlineId] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeBook = useMemo(() => 
    books.find(b => b.id === activeBookId) || books[0], 
    [books, activeBookId]
  );

  useEffect(() => {
    setVisiblePlotlines(activeBook.plotlines.map(p => p.id));
    setBulkPlotlineId(activeBook.plotlines[0]?.id || '');
  }, [activeBook.id]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    setLastSaved(new Date());
  }, [books]);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const updateActiveBook = (updates: Partial<Book>) => {
    setBooks(prev => prev.map(b => b.id === activeBookId ? { ...b, ...updates, lastModified: Date.now() } : b));
  };

  const handleAiRefine = async (sceneId: string) => {
    const scene = activeBook.scenes.find(s => s.id === sceneId);
    if (!scene || !process.env.API_KEY) return;

    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `עזור לי להרחיב את הסצנה הבאה: כותרת: ${scene.title}, תוכן: ${scene.content}. המשך את הסיפור בצורה מעניינת.`,
      });
      const newContent = response.text || '';
      updateScene(sceneId, { content: scene.content + "\n\n" + newContent });
    } catch (error) {
      console.error(error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const addPlotline = () => {
    const newP: Plotline = {
      id: `p-${Date.now()}`,
      name: `קו חדש`,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`
    };
    updateActiveBook({ plotlines: [...activeBook.plotlines, newP] });
    setVisiblePlotlines(prev => [...prev, newP.id]);
  };

  const updatePlotlineName = (id: string, name: string) => {
    updateActiveBook({
      plotlines: activeBook.plotlines.map(p => p.id === id ? { ...p, name } : p)
    });
  };

  const deletePlotline = (id: string) => {
    if (activeBook.plotlines.length <= 1) return;
    if (!confirm('האם אתה בטוח שברצונך למחוק את קו העלילה וכל הסצנות שלו?')) return;
    updateActiveBook({
      plotlines: activeBook.plotlines.filter(p => p.id !== id),
      scenes: activeBook.scenes.filter(s => s.plotlineId !== id)
    });
  };

  const addScene = (plotlineId: string, atPosition?: number) => {
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

  const addMultipleScenes = (plotlineId: string, titles: string[]) => {
    if (titles.length === 0) return;
    
    const startPos = activeBook.scenes.length;
    const newScenesToAdd: Scene[] = titles.map((title, idx) => ({
      id: `s-${Date.now()}-${idx}`,
      plotlineId,
      title: title.trim() || 'סצנה חדשה',
      content: '',
      position: startPos + idx,
      isCompleted: false
    }));

    updateActiveBook({
      scenes: [...activeBook.scenes, ...newScenesToAdd].map((s, idx) => ({ ...s, position: idx }))
    });
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const titlesArray = bulkTitles.split('\n').filter(t => t.trim().length > 0);
    if (titlesArray.length === 0) {
      addMultipleScenes(bulkPlotlineId, ['סצנה חדשה']);
    } else {
      addMultipleScenes(bulkPlotlineId, titlesArray);
    }
    setBulkTitles('');
    setIsBulkAddOpen(false);
  };

  const updateScene = (id: string, updates: Partial<Scene>) => {
    updateActiveBook({
      scenes: activeBook.scenes.map(s => s.id === id ? { ...s, ...updates } : s)
    });
  };

  const moveScene = (id: string, targetGlobalIndex: number, targetPlotlineId: string) => {
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
    const dataStr = JSON.stringify(activeBook, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeBook.title}-backup.json`;
    a.click();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const importDataBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.plotlines && json.scenes) {
          const newBook = {
            ...createNewBook(json.title || 'ספר מיובא'),
            ...json,
            id: `book-${Date.now()}`
          };
          setBooks(prev => [...prev, newBook]);
          setActiveBookId(newBook.id);
        } else {
          alert('קובץ לא תקין: מבנה הנתונים אינו תואם לפורמט הנדרש.');
        }
      } catch (err) {
        alert('שגיאה בקריאת הקובץ: ' + err);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const addNewBookToLibrary = () => {
    const newBook = createNewBook(`ספר חדש ${books.length + 1}`);
    setBooks(prev => [...prev, newBook]);
    setActiveBookId(newBook.id);
  };

  const deleteBook = (id: string) => {
    if (books.length <= 1) return;
    if (!confirm('האם אתה בטוח שברצונך למחוק את כל הספר? פעולה זו אינה הפיכה.')) return;
    const newBooks = books.filter(b => b.id !== id);
    setBooks(newBooks);
    if (activeBookId === id) {
      setActiveBookId(newBooks[0].id);
    }
  };

  const renameBook = (id: string, title: string) => {
    setBooks(prev => prev.map(b => b.id === id ? { ...b, title } : b));
  };

  return (
    <div className="h-screen flex flex-col bg-[#fdf6e3] text-[#4a4a4a] overflow-hidden">
      <header className="flex-shrink-0 bg-white border-b border-amber-100 px-6 py-3 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-amber-800 p-2 rounded-lg text-white">
              <BookOpen size={20} />
            </div>
            <h1 className="text-xl font-bold text-amber-900 handwritten text-2xl">StoryLines</h1>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-amber-900/40 font-bold uppercase tracking-wider bg-amber-50 px-3 py-1 rounded-full">
            <Save size={12} />
            <span>נשמר אוטומטית: {lastSaved.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-amber-50 p-1 rounded-xl border border-amber-100/50">
          <button 
            onClick={() => setActiveView('board')} 
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${activeView === 'board' ? 'bg-amber-800 text-white shadow-md' : 'text-amber-800/60 hover:text-amber-800 hover:bg-amber-100'}`}
          >
            <Layout size={18} />
            <span>לוח עלילה</span>
          </button>
          <button 
            onClick={() => setActiveView('editor')} 
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${activeView === 'editor' ? 'bg-amber-800 text-white shadow-md' : 'text-amber-800/60 hover:text-amber-800 hover:bg-amber-100'}`}
          >
            <Type size={18} />
            <span>עורך טקסט</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setBulkPlotlineId(activeBook.plotlines[0]?.id || '');
              setIsBulkAddOpen(true);
            }} 
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white border border-indigo-700 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-bold shadow-sm"
          >
            <CopyPlus size={16} />
            <span className="hidden sm:inline">הוספה מהירה</span>
          </button>
          <button onClick={exportManuscript} className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-900 border border-amber-200 rounded-lg hover:bg-amber-200 transition-colors text-sm font-bold" title="ייצוא הטקסט לקובץ TXT">
            <Download size={16} />
            <span className="hidden sm:inline">ייצוא טקסט</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Library & Plotlines Sidebar */}
        <aside className="w-72 border-l border-amber-100 bg-white overflow-y-auto hidden lg:flex flex-col">
          <div className="p-6 border-b border-amber-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-widest">
                <Library size={14} />
                <span>הספרים שלי</span>
              </h3>
              <button onClick={addNewBookToLibrary} className="text-amber-600 hover:text-amber-800 p-1 rounded-full hover:bg-amber-50 transition-colors">
                <Plus size={18} />
              </button>
            </div>
            <div className="space-y-1">
              {books.map(book => (
                <div 
                  key={book.id} 
                  className={`group relative flex flex-col p-3 rounded-xl transition-all cursor-pointer border ${activeBookId === book.id ? 'bg-amber-50 border-amber-200' : 'hover:bg-amber-50/50 border-transparent'}`}
                  onClick={() => setActiveBookId(book.id)}
                >
                  <div className="flex items-center gap-3">
                    <BookIcon size={16} className={activeBookId === book.id ? 'text-amber-800' : 'text-amber-400'} />
                    <input 
                      value={book.title}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => renameBook(book.id, e.target.value)}
                      className={`text-sm font-bold bg-transparent border-none focus:ring-0 p-0 flex-1 ${activeBookId === book.id ? 'text-amber-900' : 'text-amber-700/60'}`}
                    />
                    {books.length > 1 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteBook(book.id); }} 
                        className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-amber-900/40">
                    <span>{book.scenes.length} סצנות</span>
                    <span>{new Date(book.lastModified).toLocaleDateString('he-IL')}</span>
                  </div>
                  {activeBookId === book.id && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-amber-800 rounded-r-full" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-widest">קווי עלילה בספר</h3>
              <button onClick={addPlotline} className="text-amber-600 hover:text-amber-800">
                <Plus size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {activeBook.plotlines.map(p => (
                <div key={p.id} className="group space-y-2 p-2 rounded-lg hover:bg-amber-50/50 transition-all">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={visiblePlotlines.includes(p.id)}
                      onChange={(e) => setVisiblePlotlines(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                      className="w-4 h-4 rounded border-amber-300 text-amber-800 focus:ring-amber-500"
                    />
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: p.color }} />
                    <input 
                      value={p.name}
                      onChange={(e) => updatePlotlineName(p.id, e.target.value)}
                      className="text-xs font-bold bg-transparent border-none focus:ring-0 p-0 flex-1 text-amber-900"
                    />
                    <button onClick={() => deletePlotline(p.id)} className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto p-6 space-y-4">
            <div className="rounded-xl bg-amber-50 p-4 border border-amber-100">
              <div className="flex items-center gap-2 mb-2 text-amber-800 font-bold text-[10px] uppercase tracking-wider">
                <Settings2 size={14} />
                <span>גיבוי ושיחזור</span>
              </div>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={exportDataBackup}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-amber-200 text-amber-800 rounded-lg text-[10px] font-bold hover:bg-amber-100 transition-all"
                >
                  <FileJson size={14} className="text-amber-600" />
                  <span>ייצוא גיבוי JSON</span>
                </button>
                <button 
                  onClick={handleImportClick}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-amber-200 text-amber-800 rounded-lg text-[10px] font-bold hover:bg-amber-100 transition-all"
                >
                  <Upload size={14} className="text-amber-600" />
                  <span>ייבוא ספר חדש</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={importDataBackup} 
                  accept=".json" 
                  className="hidden" 
                />
              </div>
            </div>

            {installPrompt && (
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                <button 
                  onClick={handleInstall}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm"
                >
                  <MonitorSmartphone size={14} />
                  <span>התקן על המחשב</span>
                </button>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 relative overflow-hidden bg-[#fdf6e3]">
          {/* Board View */}
          <div 
            className={`absolute inset-0 transition-all duration-500 ease-in-out transform ${activeView === 'board' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}
          >
            <div className="h-full overflow-auto">
              <Board 
                project={activeBook} 
                onAddScene={addScene}
                onMoveScene={moveScene}
                updateScene={updateScene}
                onBulkAdd={(pid) => {
                  setBulkPlotlineId(pid);
                  setIsBulkAddOpen(true);
                }}
              />
            </div>
          </div>

          {/* Editor View */}
          <div 
            className={`absolute inset-0 transition-all duration-500 ease-in-out transform ${activeView === 'editor' ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}
          >
            <div className="h-full overflow-auto bg-white shadow-inner">
              <Editor 
                project={activeBook} 
                visiblePlotlines={visiblePlotlines}
                onUpdateScene={updateScene}
                onAiRefine={handleAiRefine}
                isAiLoading={isAiLoading}
                onOpenBulkAdd={() => setIsBulkAddOpen(true)}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Bulk Add Modal */}
      {isBulkAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-amber-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#fdf6e3] w-full max-w-lg rounded-2xl shadow-2xl border border-amber-200 overflow-hidden">
            <div className="bg-white border-b border-amber-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-amber-900 handwritten text-2xl">הוספת סצנות מרובות</h2>
              <button onClick={() => setIsBulkAddOpen(false)} className="text-amber-400 hover:text-amber-800 transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleBulkSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-amber-900/60 uppercase tracking-widest mb-2">לאיזה קו עלילה?</label>
                <select 
                  value={bulkPlotlineId}
                  onChange={(e) => setBulkPlotlineId(e.target.value)}
                  className="w-full bg-white border border-amber-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-amber-500 transition-all outline-none"
                >
                  {activeBook.plotlines.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-900/60 uppercase tracking-widest mb-2">כותרות הסצנות (אחת בכל שורה)</label>
                <textarea 
                  autoFocus
                  value={bulkTitles}
                  onChange={(e) => setBulkTitles(e.target.value)}
                  placeholder="התחלה&#10;המפגש הראשון&#10;המשבר&#10;הפתרון..."
                  className="w-full h-48 bg-white border border-amber-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 transition-all outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button 
                  type="submit"
                  className="flex-1 bg-amber-800 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-amber-900 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  צור {bulkTitles.split('\n').filter(t => t.trim()).length || 1} סצנות חדשות
                </button>
                <button 
                  type="button"
                  onClick={() => setIsBulkAddOpen(false)}
                  className="px-6 py-3 border border-amber-200 text-amber-800 font-bold rounded-xl hover:bg-amber-50 transition-all"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
