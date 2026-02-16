
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
  // Renamed to avoid collision with GoogleGenAI.Type
  Type as LucideType,
  ChevronRight,
  Library,
  Book as BookIcon,
  Pencil,
  CopyPlus,
  X,
  FileText,
  Sparkles,
  Loader2,
  ListChecks
} from 'lucide-react';
import { Scene, Plotline, Project, Book, QuestionnaireEntry } from './types';
import Board from './components/Board';
import Editor from './components/Editor';
import Questionnaires from './components/Questionnaires';
import { GoogleGenAI, Type } from "@google/genai";

const STORAGE_KEY = 'storylines_library_v2'; // Bumped version for new schema

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
  periods: []
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
  const [activeView, setActiveView] = useState<'board' | 'editor' | 'questionnaires'>('board');
  const [visiblePlotlines, setVisiblePlotlines] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  
  // Modals state
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [isImportTextOpen, setIsImportTextOpen] = useState(false);
  const [bulkTitles, setBulkTitles] = useState('');
  const [bulkPlotlineId, setBulkPlotlineId] = useState('');
  const [importLongText, setImportLongText] = useState('');
  const [isSplittingAi, setIsSplittingAi] = useState(false);

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

  const handleAiTextSplit = async () => {
    if (!importLongText.trim() || !process.env.API_KEY) return;
    setIsSplittingAi(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Split the following long text into logical scenes. For each scene, provide a short descriptive title and the relevant text content. 
        Text: ${importLongText.substring(0, 15000)}`, // Limit to avoid token overflow
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            // Using Type from @google/genai directly as per guidelines
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Descriptive title for the scene" },
                content: { type: Type.STRING, description: "The content of the scene" }
              },
              required: ["title", "content"]
            }
          }
        }
      });

      const scenes = JSON.parse(response.text || '[]');
      if (Array.isArray(scenes) && scenes.length > 0) {
        const startPos = activeBook.scenes.length;
        const newScenesToAdd: Scene[] = scenes.map((s: any, idx: number) => ({
          id: `s-ai-${Date.now()}-${idx}`,
          plotlineId: bulkPlotlineId,
          title: s.title || 'סצנה חדשה',
          content: s.content || '',
          position: startPos + idx,
          isCompleted: false
        }));

        updateActiveBook({
          scenes: [...activeBook.scenes, ...newScenesToAdd].map((s, idx) => ({ ...s, position: idx }))
        });
        setIsImportTextOpen(false);
        setImportLongText('');
      }
    } catch (error) {
      console.error("AI Split failed", error);
      alert("נכשלה חלוקת הטקסט באמצעות AI. נסה חלוקה ידנית.");
    } finally {
      setIsSplittingAi(false);
    }
  };

  const handleManualSplit = () => {
    const delimiter = prompt("הזן תו מפריד (למשל ###) או השאר ריק לחלוקה לפי פסקאות כפולות", "###");
    const parts = delimiter 
      ? importLongText.split(delimiter).filter(p => p.trim()) 
      : importLongText.split('\n\n').filter(p => p.trim());
    
    if (parts.length > 0) {
      const startPos = activeBook.scenes.length;
      const newScenesToAdd: Scene[] = parts.map((content, idx) => ({
        id: `s-manual-${Date.now()}-${idx}`,
        plotlineId: bulkPlotlineId,
        title: `סצנה ${startPos + idx + 1}`,
        content: content.trim(),
        position: startPos + idx,
        isCompleted: false
      }));

      updateActiveBook({
        scenes: [...activeBook.scenes, ...newScenesToAdd].map((s, idx) => ({ ...s, position: idx }))
      });
      setIsImportTextOpen(false);
      setImportLongText('');
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

  const updateEntries = (category: 'characters' | 'places' | 'periods', entries: QuestionnaireEntry[]) => {
    updateActiveBook({ [category]: entries });
  };

  return (
    <div className="h-screen flex flex-col bg-[#fdf6e3] text-[#4a4a4a] overflow-hidden">
      <header className="flex-shrink-0 bg-white border-b border-amber-100 px-6 py-3 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-amber-800 p-2 rounded-lg text-white transition-transform hover:scale-110">
              <BookOpen size={20} />
            </div>
            <h1 className="text-xl font-bold text-amber-900 handwritten text-3xl select-none">StoryLines</h1>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-amber-50 p-1.5 rounded-2xl border border-amber-100/50 shadow-inner">
          <button 
            onClick={() => setActiveView('board')} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeView === 'board' ? 'bg-amber-800 text-white shadow-lg' : 'text-amber-800/60 hover:text-amber-800 hover:bg-amber-100'}`}
          >
            <Layout size={18} />
            <span className="hidden sm:inline">לוח עלילה</span>
          </button>
          <button 
            onClick={() => setActiveView('editor')} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeView === 'editor' ? 'bg-amber-800 text-white shadow-lg' : 'text-amber-800/60 hover:text-amber-800 hover:bg-amber-100'}`}
          >
            <LucideType size={18} />
            <span className="hidden sm:inline">עורך טקסט</span>
          </button>
          <button 
            onClick={() => setActiveView('questionnaires')} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeView === 'questionnaires' ? 'bg-amber-800 text-white shadow-lg' : 'text-amber-800/60 hover:text-amber-800 hover:bg-amber-100'}`}
          >
            <ListChecks size={18} />
            <span className="hidden sm:inline">שאלונים</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={exportManuscript} className="flex items-center gap-2 px-4 py-2.5 bg-amber-100 text-amber-900 border border-amber-200 rounded-xl hover:bg-amber-200 transition-all text-sm font-bold">
            <Download size={16} />
            <span className="hidden sm:inline">ייצוא</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-l border-amber-100 bg-white overflow-y-auto hidden lg:flex flex-col shadow-xl z-20">
          <div className="p-8 border-b border-amber-50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="flex items-center gap-2 text-xs font-black text-amber-900 uppercase tracking-[0.2em]">הספרים שלי</h3>
              <button onClick={addNewBookToLibrary} className="text-amber-600 hover:text-amber-800 p-2 rounded-xl hover:bg-amber-50 transition-all"><Plus size={20} /></button>
            </div>
            <div className="space-y-2">
              {books.map(book => (
                <div key={book.id} className={`group relative flex flex-col p-4 rounded-2xl transition-all cursor-pointer border-2 ${activeBookId === book.id ? 'bg-amber-50 border-amber-200' : 'hover:bg-amber-50/50 border-transparent'}`} onClick={() => setActiveBookId(book.id)}>
                  <div className="flex items-center gap-3">
                    <BookIcon size={18} className={activeBookId === book.id ? 'text-amber-800' : 'text-amber-200'} />
                    <input value={book.title} onClick={(e) => e.stopPropagation()} onChange={(e) => renameBook(book.id, e.target.value)} className={`text-sm font-bold bg-transparent border-none focus:ring-0 p-0 flex-1 ${activeBookId === book.id ? 'text-amber-900' : 'text-amber-700/40'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-amber-900 uppercase tracking-[0.2em]">ניהול נתונים</h3>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={exportDataBackup} className="flex items-center gap-3 px-4 py-3 bg-white border border-amber-200 text-amber-800 rounded-xl text-xs font-bold hover:bg-amber-100 transition-all shadow-sm">
                <FileJson size={16} className="text-amber-500" />
                <span>גיבוי מלא</span>
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 relative overflow-hidden bg-[#fdf6e3]">
          {activeView === 'board' && (
            <div className="absolute inset-0">
              <Board project={activeBook} onAddScene={addScene} onMoveScene={moveScene} updateScene={updateScene} onBulkAdd={() => setIsBulkAddOpen(true)} />
            </div>
          )}
          {activeView === 'editor' && (
            <div className="absolute inset-0 bg-white overflow-auto shadow-2xl">
              <Editor project={activeBook} visiblePlotlines={visiblePlotlines} onUpdateScene={updateScene} onAiRefine={handleAiRefine} isAiLoading={isAiLoading} onOpenBulkAdd={() => setIsBulkAddOpen(true)} />
            </div>
          )}
          {activeView === 'questionnaires' && (
            <div className="absolute inset-0 overflow-auto">
              <Questionnaires 
                characters={activeBook.characters || []}
                places={activeBook.places || []}
                periods={activeBook.periods || []}
                onUpdateCharacters={(e) => updateEntries('characters', e)}
                onUpdatePlaces={(e) => updateEntries('places', e)}
                onUpdatePeriods={(e) => updateEntries('periods', e)}
              />
            </div>
          )}
        </main>
      </div>

      {isImportTextOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-amber-900/60 backdrop-blur-md">
          <div className="bg-[#fdf6e3] w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-amber-200 p-8">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold handwritten text-3xl">ייבוא טקסט ארוך</h2>
                <button onClick={() => setIsImportTextOpen(false)} className="text-amber-300 hover:text-amber-800"><X size={28} /></button>
             </div>
             <textarea 
               value={importLongText} 
               onChange={(e) => setImportLongText(e.target.value)} 
               className="w-full h-80 bg-white border-2 border-amber-100 rounded-2xl p-6 mb-6"
               placeholder="הדבק טקסט..."
             />
             <div className="flex gap-4">
                <button onClick={handleAiTextSplit} className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
                   {isSplittingAi ? <Loader2 className="animate-spin" /> : <Sparkles />} פירוק AI
                </button>
                <button onClick={handleManualSplit} className="flex-1 bg-amber-800 text-white font-bold py-4 rounded-2xl">פירוק ידני</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
