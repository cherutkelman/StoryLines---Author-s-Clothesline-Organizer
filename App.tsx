
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  BookOpen, 
  Layout, 
  Wand2,
  Download,
  Upload,
  Eye,
  EyeOff,
  Settings2,
  MonitorSmartphone,
  Save,
  FileJson
} from 'lucide-react';
import { Scene, Plotline, Project } from './types';
import Board from './components/Board';
import Editor from './components/Editor';
import { GoogleGenAI } from "@google/genai";

const STORAGE_KEY = 'storylines_project_data_v2';

const DEFAULT_PROJECT: Project = {
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

const App: React.FC = () => {
  const [project, setProject] = useState<Project>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_PROJECT;
  });
  
  const [showBoard, setShowBoard] = useState(true);
  const [showEditor, setShowEditor] = useState(true);
  const [visiblePlotlines, setVisiblePlotlines] = useState<string[]>(project.plotlines.map(p => p.id));
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-save logic: LocalStorage update on every project state change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    setLastSaved(new Date());
  }, [project]);

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

  const handleAiRefine = async (sceneId: string) => {
    const scene = project.scenes.find(s => s.id === sceneId);
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
    setProject(prev => ({ ...prev, plotlines: [...prev.plotlines, newP] }));
    setVisiblePlotlines(prev => [...prev, newP.id]);
  };

  const updatePlotlineName = (id: string, name: string) => {
    setProject(prev => ({
      ...prev,
      plotlines: prev.plotlines.map(p => p.id === id ? { ...p, name } : p)
    }));
  };

  const deletePlotline = (id: string) => {
    if (project.plotlines.length <= 1) return;
    if (!confirm('האם אתה בטוח שברצונך למחוק את קו העלילה וכל הסצנות שלו?')) return;
    setProject(prev => ({
      ...prev,
      plotlines: prev.plotlines.filter(p => p.id !== id),
      scenes: prev.scenes.filter(s => s.plotlineId !== id)
    }));
  };

  const addScene = (plotlineId: string, atPosition?: number) => {
    const newPos = atPosition !== undefined ? atPosition : project.scenes.length;
    const newScene: Scene = {
      id: `s-${Date.now()}`,
      plotlineId,
      title: 'סצנה חדשה',
      content: '',
      position: newPos,
      isCompleted: false
    };
    
    setProject(prev => {
      const newScenes = [...prev.scenes];
      newScenes.splice(newPos, 0, newScene);
      return {
        ...prev,
        scenes: newScenes.map((s, idx) => ({ ...s, position: idx }))
      };
    });
  };

  const updateScene = (id: string, updates: Partial<Scene>) => {
    setProject(prev => ({
      ...prev,
      scenes: prev.scenes.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  const moveScene = (id: string, targetGlobalIndex: number, targetPlotlineId: string) => {
    setProject(prev => {
      const sceneToMove = prev.scenes.find(s => s.id === id);
      if (!sceneToMove) return prev;

      const otherScenes = prev.scenes.filter(s => s.id !== id);
      const updatedScene = { ...sceneToMove, plotlineId: targetPlotlineId };
      
      const newScenes = [...otherScenes];
      newScenes.splice(targetGlobalIndex, 0, updatedScene);

      return {
        ...prev,
        scenes: newScenes.map((s, idx) => ({ ...s, position: idx }))
      };
    });
  };

  const exportManuscript = () => {
    const text = project.scenes
      .filter(s => visiblePlotlines.includes(s.plotlineId))
      .map(s => `## ${s.title}${s.isCompleted ? ' [הושלם]' : ''}\n\n${s.content}`)
      .join('\n\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `storylines-manuscript-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  const exportDataBackup = () => {
    const dataStr = JSON.stringify(project, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `storylines-backup-${new Date().toISOString().split('T')[0]}.json`;
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
          if (confirm('ייבוא קובץ זה יחליף את כל הפרויקט הנוכחי. האם להמשיך?')) {
            setProject(json);
            setVisiblePlotlines(json.plotlines.map((p: any) => p.id));
          }
        } else {
          alert('קובץ לא תקין: מבנה הנתונים אינו תואם לפורמט הנדרש.');
        }
      } catch (err) {
        alert('שגיאה בקריאת הקובץ: ' + err);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
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
            <span>נשמר אוטומטית ב- {lastSaved.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-amber-50 p-1 rounded-lg">
          <button onClick={() => setShowBoard(!showBoard)} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${showBoard ? 'bg-amber-800 text-white' : 'text-amber-800'}`}>
            {showBoard ? <Eye size={16} /> : <EyeOff size={16} />}
            <span>הלוח</span>
          </button>
          <button onClick={() => setShowEditor(!showEditor)} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${showEditor ? 'bg-amber-800 text-white' : 'text-amber-800'}`}>
            {showEditor ? <Eye size={16} /> : <EyeOff size={16} />}
            <span>הטקסט</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={exportManuscript} className="flex items-center gap-2 px-4 py-2 bg-amber-800 text-white rounded-lg hover:bg-amber-900 transition-colors text-sm shadow-sm" title="ייצוא הטקסט לקובץ TXT">
            <Download size={16} />
            <span>ייצוא טקסט</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-l border-amber-100 bg-white p-6 overflow-y-auto hidden lg:flex flex-col">
          {installPrompt && (
            <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
              <button 
                onClick={handleInstall}
                className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm"
              >
                <MonitorSmartphone size={14} />
                <span>התקן על המחשב</span>
              </button>
            </div>
          )}

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4 border-b pb-2">
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-widest">קווי עלילה</h3>
              <button onClick={addPlotline} className="text-amber-600 hover:text-amber-800">
                <Plus size={18} />
              </button>
            </div>
            <div className="space-y-4">
              {project.plotlines.map(p => (
                <div key={p.id} className="group space-y-2 p-2 rounded-lg hover:bg-amber-50/50 transition-all">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={visiblePlotlines.includes(p.id)}
                      onChange={(e) => setVisiblePlotlines(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                      className="w-4 h-4 rounded border-amber-300 text-amber-800"
                    />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                    <input 
                      value={p.name}
                      onChange={(e) => updatePlotlineName(p.id, e.target.value)}
                      className="text-xs font-bold bg-transparent border-none focus:ring-0 p-0 flex-1"
                    />
                    <button onClick={() => deletePlotline(p.id)} className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto space-y-4">
            <div className="rounded-xl bg-amber-50 p-4 border border-amber-100">
              <div className="flex items-center gap-2 mb-2 text-amber-800 font-bold text-[10px] uppercase tracking-wider">
                <Settings2 size={14} />
                <span>מערכת וגיבוי</span>
              </div>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={exportDataBackup}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-amber-200 text-amber-800 rounded-lg text-[10px] font-bold hover:bg-amber-100 transition-all"
                >
                  <FileJson size={14} className="text-amber-600" />
                  <span>שמור גיבוי (JSON)</span>
                </button>
                <button 
                  onClick={handleImportClick}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-amber-200 text-amber-800 rounded-lg text-[10px] font-bold hover:bg-amber-100 transition-all"
                >
                  <Upload size={14} className="text-amber-600" />
                  <span>טען גיבוי פרויקט</span>
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

            <div className="rounded-xl bg-indigo-50 p-4 border border-indigo-100">
              <div className="flex items-center gap-2 mb-2 text-indigo-800 font-bold text-[10px] uppercase tracking-wider">
                <Wand2 size={14} />
                <span>עוזר AI</span>
              </div>
              <p className="text-[10px] text-indigo-700 leading-relaxed italic">
                "הסדר משתנה בלוח? הטקסט למטה זז יחד איתו."
              </p>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={`transition-all duration-500 bg-[#fdf6e3] overflow-auto ${showBoard ? 'flex-1 border-b border-amber-100' : 'h-0 opacity-0 overflow-hidden'}`}>
            <Board 
              project={project} 
              onAddScene={addScene}
              onMoveScene={moveScene}
              updateScene={updateScene}
            />
          </div>
          <div className={`transition-all duration-500 bg-white overflow-auto ${showEditor ? (showBoard ? 'flex-1' : 'flex-[3]') : 'h-0 opacity-0 overflow-hidden'}`}>
            <Editor 
              project={project} 
              visiblePlotlines={visiblePlotlines}
              onUpdateScene={updateScene}
              onAiRefine={handleAiRefine}
              isAiLoading={isAiLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
