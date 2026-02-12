
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  BookOpen, 
  Layout, 
  Wand2,
  Download,
  Eye,
  EyeOff,
  Settings2,
  MonitorSmartphone
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
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

  const exportText = () => {
    const text = project.scenes
      .filter(s => visiblePlotlines.includes(s.plotlineId))
      .map(s => `## ${s.title}${s.isCompleted ? ' [הושלם]' : ''}\n\n${s.content}`)
      .join('\n\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-story.txt';
    a.click();
  };

  return (
    <div className="h-screen flex flex-col bg-[#fdf6e3] text-[#4a4a4a] overflow-hidden">
      <header className="flex-shrink-0 bg-white border-b border-amber-100 px-6 py-3 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-3">
          <div className="bg-amber-800 p-2 rounded-lg text-white">
            <BookOpen size={20} />
          </div>
          <h1 className="text-xl font-bold text-amber-900 handwritten text-2xl">StoryLines</h1>
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

        <button onClick={exportText} className="flex items-center gap-2 px-4 py-2 bg-amber-800 text-white rounded-lg hover:bg-amber-900 transition-colors text-sm">
          <Download size={16} />
          <span>ייצוא</span>
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-l border-amber-100 bg-white p-6 overflow-y-auto hidden lg:block">
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

          <div className="mt-auto pt-4 border-t border-amber-50">
             <div className="rounded-xl bg-amber-50 p-4 border border-amber-100">
                <div className="flex items-center gap-2 mb-2 text-amber-800 font-bold text-[10px] uppercase tracking-wider">
                  <Wand2 size={14} />
                  <span>עוזר AI</span>
                </div>
                <p className="text-[10px] text-amber-700 leading-relaxed italic">
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
