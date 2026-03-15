import React, { useState } from 'react';
import { Layout, CheckCircle2, Info, Link, FileText, X, ChevronRight, Sparkles, TrendingUp, Share2, Plus, Trash2, ArrowLeft, GitMerge, GitBranch, Users } from 'lucide-react';
import { Scene } from '../types';

interface PlotStructureProps {
  selectedStructure: string | undefined;
  onSelect: (id: string) => void;
  scenes: Scene[];
  pointsData: Record<string, { sceneId?: string; description?: string }>;
  onUpdatePoint: (pointId: string, data: { sceneId?: string; description?: string }) => void;
  customPlotPoints: { id: string; label: string; x: number; y: number }[];
  onUpdateCustomPoints: (points: { id: string; label: string; x: number; y: number }[]) => void;
  characterArcs: {
    id: string;
    characterName: string;
    steps: { id: string; text: string }[];
  }[];
  onUpdateArcs: (arcs: any[]) => void;
  characters: any[];
  relationships: any[];
  onUpdateRelationships: (rels: any[]) => void;
}

const STRUCTURES = [
  { id: 'three-acts', label: 'מבנה שלוש המערכות' },
  { id: 'five-acts', label: 'מבנה חמש המערכות' },
  { id: 'seven-acts', label: 'מבנה שבע המערכות' },
  { id: 'heros-journey', label: 'מבנה סיפור הגיבור המעגלי' },
  { id: 'custom', label: 'מבנה גמיש (בהתאמה אישית)' }
];

const THREE_ACT_POINTS = [
  { id: 'start', label: 'פתיחה', x: 700, y: 350 },
  { id: 'inciting', label: 'אירוע מחולל', x: 550, y: 250 },
  { id: 'midpoint', label: 'נקודת אמצע', x: 400, y: 150 },
  { id: 'climax', label: 'שיא', x: 250, y: 50 },
  { id: 'end', label: 'סיום', x: 100, y: 350 },
];

const FIVE_ACT_POINTS = [
  { id: 'expo', label: 'הצגה', x: 700, y: 350 },
  { id: 'rising', label: 'סיבוך', x: 550, y: 200 },
  { id: 'climax-5', label: 'שיא', x: 400, y: 50 },
  { id: 'falling', label: 'פתרון', x: 250, y: 200 },
  { id: 'reso', label: 'סיום', x: 100, y: 350 },
];

const SEVEN_ACT_POINTS = [
  { id: '7-start', label: 'פתיחה', x: 700, y: 350 },
  { id: '7-turn1', label: 'מפנה 1', x: 600, y: 100 },
  { id: '7-pinch1', label: 'לחץ 1', x: 500, y: 220 },
  { id: '7-mid', label: 'אמצע', x: 400, y: 130 },
  { id: '7-pinch2', label: 'לחץ 2', x: 300, y: 220 },
  { id: '7-turn2', label: 'מפנה 2', x: 200, y: 180 },
  { id: '7-end', label: 'פתרון', x: 100, y: 350 },
];

const HEROS_JOURNEY_POINTS = [
  { id: 'hj-1', label: 'עולם רגיל', x: 400, y: 70 },
  { id: 'hj-2', label: 'קריאה', x: 550, y: 120 },
  { id: 'hj-3', label: 'סירוב', x: 630, y: 250 },
  { id: 'hj-4', label: 'מורה', x: 550, y: 380 },
  { id: 'hj-5', label: 'יציאה', x: 400, y: 430 },
  { id: 'hj-6', label: 'מבחנים', x: 250, y: 380 },
  { id: 'hj-7', label: 'משבר', x: 170, y: 250 },
  { id: 'hj-8', label: 'ניצחון', x: 250, y: 120 },
  { id: 'hj-9', label: 'חזרה', x: 360, y: 85 },
];

const PlotStructure: React.FC<PlotStructureProps> = ({ 
  selectedStructure, 
  onSelect, 
  scenes, 
  pointsData, 
  onUpdatePoint,
  customPlotPoints,
  onUpdateCustomPoints,
  characterArcs,
  onUpdateArcs,
  characters,
  relationships,
  onUpdateRelationships
}) => {
  const [activeSubView, setActiveSubView] = useState<'structure' | 'arc' | 'relationships'>('structure');
  const [editingPointId, setEditingPointId] = useState<string | null>(null);
  const [pullingDataFor, setPullingDataFor] = useState<{ arcIndex: number; stepIndex: number } | null>(null);
  const [selectedCharForPull, setSelectedCharForPull] = useState<string | null>(null);

  const activePoints = selectedStructure === 'three-acts' ? THREE_ACT_POINTS : 
                      selectedStructure === 'five-acts' ? FIVE_ACT_POINTS :
                      selectedStructure === 'seven-acts' ? SEVEN_ACT_POINTS :
                      selectedStructure === 'heros-journey' ? HEROS_JOURNEY_POINTS : 
                      selectedStructure === 'custom' ? (customPlotPoints.length > 0 ? customPlotPoints : [
                        { id: 'custom-start', label: 'התחלה', x: 700, y: 350 },
                        { id: 'custom-end', label: 'סיום', x: 100, y: 350 }
                      ]) : [];
  
  const activePoint = editingPointId ? activePoints.find(p => p.id === editingPointId) : null;
  const activeData = editingPointId ? pointsData[editingPointId] || {} : {};

  return (
    <div className="h-full flex flex-col bg-[var(--theme-bg)] p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full space-y-8 pb-20">
        {/* Internal Sub-Navigation */}
        <div className="flex items-center justify-center gap-2 mb-8 bg-[var(--theme-secondary)]/30 p-2 rounded-3xl border border-[var(--theme-border)]/30 w-fit mx-auto">
          <button
            onClick={() => setActiveSubView('structure')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeSubView === 'structure'
                ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-lg'
                : 'text-[var(--theme-primary)]/60 hover:text-[var(--theme-primary)]'
            }`}
          >
            <Layout size={18} />
            מבנה עלילה
          </button>
          <button
            onClick={() => setActiveSubView('arc')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeSubView === 'arc'
                ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-lg'
                : 'text-[var(--theme-primary)]/60 hover:text-[var(--theme-primary)]'
            }`}
          >
            <TrendingUp size={18} />
            קשת התפתחות
          </button>
          <button
            onClick={() => setActiveSubView('relationships')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeSubView === 'relationships'
                ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-lg'
                : 'text-[var(--theme-primary)]/60 hover:text-[var(--theme-primary)]'
            }`}
          >
            <Share2 size={18} />
            מערכות יחסים
          </button>
        </div>

        {activeSubView === 'structure' ? (
          <>
            {/* Banner / Selection */}
            <div className="bg-[var(--theme-card)] rounded-[2rem] p-8 border border-[var(--theme-border)]/50 shadow-sm">
            <div 
              className="cursor-pointer group flex items-center gap-4 mb-8"
              onClick={() => onSelect('')}
              title="חזרה למסך הבחירה וההסבר"
            >
              <div className="bg-[var(--theme-primary)] p-3 rounded-2xl text-[var(--theme-card)] group-hover:scale-110 transition-transform">
                <Layout size={24} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-[var(--theme-primary)] handwritten text-5xl group-hover:text-[var(--theme-accent)] transition-colors">מבנה עלילה</h2>
                <p className="text-[var(--theme-primary)]/60 font-bold text-sm mt-1">בחרו את המבנה המתאים ביותר לסיפור שלכם</p>
              </div>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STRUCTURES.map((structure) => (
              <button
                key={structure.id}
                onClick={() => onSelect(structure.id)}
                className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all duration-300 ${
                  selectedStructure === structure.id
                    ? 'bg-[var(--theme-primary)] border-[var(--theme-primary)] text-[var(--theme-card)] shadow-lg scale-[1.02]'
                    : 'bg-[var(--theme-secondary)]/30 border-transparent hover:border-[var(--theme-border)] text-[var(--theme-primary)]'
                }`}
              >
                <span className="font-bold text-lg">{structure.label}</span>
                {selectedStructure === structure.id && <CheckCircle2 size={24} />}
              </button>
            ))}
          </div>
        </div>

        {/* Info Content */}
        {!selectedStructure && (
          <div className="bg-[var(--theme-card)] rounded-[2rem] p-10 border border-[var(--theme-border)]/50 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3 mb-6 text-[var(--theme-accent)]">
              <Info size={20} />
              <h3 className="text-xl font-bold handwritten text-3xl">על מבנה העלילה</h3>
            </div>
            
            <div className="space-y-6 text-[var(--theme-text)] leading-relaxed text-lg">
              <p className="font-bold text-[var(--theme-primary)]">
                בכל סיפור, נהיה חייבים להצמד למבנה מסוים.
              </p>
              
              <p>
                בכל אחד מהמבנים, קיימים פתיחה, אירוע מחולל, שיא וסיום. 
                בפתיחת הספר, נכיר את דמויות, את המציאות שלהם, 
                אירוע מחולל- משהו יקרה שיניע אותם לפעולה. בלעדיו אין טעם לסיפור.
              </p>

              <p>
                בכל ספר נגיע לנקודת שיא. 
                נקודת מבחן שבה המחשבות שהחזקנו בהם עד עכשיו, יוטלו בספק, ויצטרכו לקבל כיוון חדש.
              </p>

              <p>
                בכל ספר יהיה סיום, נסגור את הקצוות, נוודא ששאלות שנפתחו במהלך הספר קיבלו תשובה.
                בסיום, או שנחזור לנקודת ההתחלה, עם ידע חדש, בחירות חדשות וכיוון חדש,
                או שנגיע לנקודת סיום חדשה לגמרי, אבל נדע שההתרחשות שהייתה בספר, נגמרה.
              </p>

              <p>
                בחלק מהמקרים, מבנה הסיפור יכול להיכתב גם בצורה מעגלית, 
                כי הגיבור חוזר לנקודת ההתחלה. 
                אבל הוא תמיד יהיה שונה, אחרי שעבר התרחשויות במהלך הספר. 
                ולכן נציין את הסיום כנקודה חדשה ולא כנקודת ההתחלה.
              </p>

              <div className="pt-4 border-t border-[var(--theme-border)]/30">
                <p className="text-[var(--theme-accent)] font-bold italic">
                  נבחר את מבנה העלילה המתאים ביותר לספר שלנו.
                </p>
              </div>
            </div>
          </div>
        )}

        {selectedStructure === 'three-acts' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-[var(--theme-secondary)]/30 p-8 rounded-[2rem] border border-[var(--theme-border)]/30">
              <h3 className="text-2xl font-bold text-[var(--theme-primary)] mb-6 handwritten text-4xl">מבנה שלוש המערכות</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right" dir="rtl">
                <div className="bg-[var(--theme-card)] p-6 rounded-2xl shadow-sm border border-[var(--theme-border)]/20">
                  <h4 className="font-bold text-[var(--theme-accent)] mb-2">מערכה ראשונה</h4>
                  <p className="text-sm leading-relaxed">הצגה של העולם והדמויות הראשיות, ואז שינוי קטן במציאות, שמתניע את העלילה.</p>
                </div>
                <div className="bg-[var(--theme-card)] p-6 rounded-2xl shadow-sm border border-[var(--theme-border)]/20">
                  <h4 className="font-bold text-[var(--theme-accent)] mb-2">מערכה שניה</h4>
                  <p className="text-sm leading-relaxed">נסיון לחזור לשגרה, או ההיפך, להשיג מטרה חדשה, כישלונות בדרך, ושינוי גדול מאד שמשפיע על הכל.</p>
                </div>
                <div className="bg-[var(--theme-card)] p-6 rounded-2xl shadow-sm border border-[var(--theme-border)]/20">
                  <h4 className="font-bold text-[var(--theme-accent)] mb-2">מערכה שלישית</h4>
                  <p className="text-sm leading-relaxed">עימות מול הקושי, ניצחון או כישלון, וחזרה לשגרה חדשה.</p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--theme-card)] p-10 rounded-[2rem] border border-[var(--theme-border)]/50 shadow-sm">
              <h4 className="text-xl font-bold text-[var(--theme-primary)] mb-12 text-center handwritten text-3xl">גרף מבנה העלילה</h4>
              <p className="text-center text-[var(--theme-primary)]/60 text-sm -mt-8 mb-8">לחצו על הנקודות בגרף כדי לפרט או לקשר סצנה</p>
              
              <div className="relative w-full aspect-[16/9] max-w-2xl mx-auto">
                <svg viewBox="0 0 800 400" className="w-full h-full overflow-visible">
                  {/* The Path */}
                  <path 
                    d="M 700 350 L 550 250 L 400 150 L 250 50 L 100 350" 
                    fill="none" 
                    stroke="var(--theme-primary)" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* Points */}
                  {THREE_ACT_POINTS.map((point) => (
                    <g 
                      key={point.id} 
                      className="cursor-pointer group"
                      onClick={() => setEditingPointId(point.id)}
                    >
                      <circle 
                        cx={point.x} 
                        cy={point.y} 
                        r={editingPointId === point.id ? "10" : "6"} 
                        fill={editingPointId === point.id ? "var(--theme-accent)" : "var(--theme-primary)"}
                        className="transition-all duration-300 group-hover:r-10 group-hover:fill-[var(--theme-accent)]"
                      />
                      <text 
                        x={point.x} 
                        y={point.id === 'climax' ? point.y - 15 : point.y + 35} 
                        textAnchor="middle" 
                        className={`fill-[var(--theme-primary)] font-bold text-lg handwritten transition-all duration-300 ${editingPointId === point.id ? 'fill-[var(--theme-accent)] scale-110' : ''}`}
                      >
                        {point.label}
                      </text>
                      {pointsData[point.id]?.sceneId && (
                        <circle cx={point.x} cy={point.y} r="15" fill="none" stroke="var(--theme-accent)" strokeWidth="1" strokeDasharray="2,2" className="animate-spin-slow" />
                      )}
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            {/* Point Editor */}
            {editingPointId && activePoint && (
              <div className="bg-[var(--theme-card)] rounded-[2rem] p-8 border-2 border-[var(--theme-accent)] shadow-xl animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="bg-[var(--theme-accent)] p-2 rounded-xl text-white">
                      <Sparkles size={20} />
                    </div>
                    <h3 className="text-2xl font-bold text-[var(--theme-primary)] handwritten text-4xl">פירוט נקודה: {activePoint.label}</h3>
                  </div>
                  <button 
                    onClick={() => setEditingPointId(null)}
                    className="p-2 hover:bg-[var(--theme-secondary)] rounded-full text-[var(--theme-primary)]/40 hover:text-[var(--theme-primary)] transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-[var(--theme-primary)]/60">
                      <Link size={16} />
                      קישור לסצנה מלוח העלילה
                    </label>
                    <select
                      value={activeData.sceneId || ''}
                      onChange={(e) => onUpdatePoint(editingPointId, { ...activeData, sceneId: e.target.value })}
                      className="w-full bg-[var(--theme-secondary)]/50 border-2 border-[var(--theme-border)]/30 rounded-2xl p-4 text-[var(--theme-primary)] font-bold focus:border-[var(--theme-accent)] focus:ring-0 transition-all"
                    >
                      <option value="">בחר סצנה...</option>
                      {scenes.map(scene => (
                        <option key={scene.id} value={scene.id}>{scene.title}</option>
                      ))}
                    </select>
                    {activeData.sceneId && (
                      <div className="p-4 bg-[var(--theme-accent)]/10 rounded-2xl border border-[var(--theme-accent)]/20 flex items-center gap-3 text-[var(--theme-accent)]">
                        <CheckCircle2 size={18} />
                        <span className="text-sm font-bold">סצנה מקושרת בהצלחה</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-[var(--theme-primary)]/60">
                      <FileText size={16} />
                      פירוט מה קורה בנקודה זו
                    </label>
                    <textarea
                      value={activeData.description || ''}
                      onChange={(e) => onUpdatePoint(editingPointId, { ...activeData, description: e.target.value })}
                      placeholder="פרטו כאן את ההתרחשות המרכזית בנקודה זו..."
                      className="w-full h-40 bg-[var(--theme-secondary)]/50 border-2 border-[var(--theme-border)]/30 rounded-2xl p-4 text-[var(--theme-primary)] focus:border-[var(--theme-accent)] focus:ring-0 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedStructure === 'five-acts' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-[var(--theme-secondary)]/30 p-8 rounded-[2rem] border border-[var(--theme-border)]/30">
              <h3 className="text-2xl font-bold text-[var(--theme-primary)] mb-6 handwritten text-4xl">מבנה חמש המערכות</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-right" dir="rtl">
                <div className="bg-[var(--theme-card)] p-4 rounded-2xl shadow-sm border border-[var(--theme-border)]/20">
                  <h4 className="font-bold text-[var(--theme-accent)] mb-1 text-sm">מערכה 1</h4>
                  <p className="text-xs leading-relaxed">הצגה של העולם והדמויות</p>
                </div>
                <div className="bg-[var(--theme-card)] p-4 rounded-2xl shadow-sm border border-[var(--theme-border)]/20">
                  <h4 className="font-bold text-[var(--theme-accent)] mb-1 text-sm">מערכה 2</h4>
                  <p className="text-xs leading-relaxed">משהו מסתבך והמתח עולה</p>
                </div>
                <div className="bg-[var(--theme-card)] p-4 rounded-2xl shadow-sm border border-[var(--theme-border)]/20">
                  <h4 className="font-bold text-[var(--theme-accent)] mb-1 text-sm">מערכה 3</h4>
                  <p className="text-xs leading-relaxed">שיא - נקודה שבה המתח מגיע לשיא, התרחשות דרמטית.</p>
                </div>
                <div className="bg-[var(--theme-card)] p-4 rounded-2xl shadow-sm border border-[var(--theme-border)]/20">
                  <h4 className="font-bold text-[var(--theme-accent)] mb-1 text-sm">מערכה 4</h4>
                  <p className="text-xs leading-relaxed">פתרון הבעיות בזו אחר זו.</p>
                </div>
                <div className="bg-[var(--theme-card)] p-4 rounded-2xl shadow-sm border border-[var(--theme-border)]/20">
                  <h4 className="font-bold text-[var(--theme-accent)] mb-1 text-sm">מערכה 5</h4>
                  <p className="text-xs leading-relaxed">סיום, חזרה לשגרה החדשה.</p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--theme-card)] p-10 rounded-[2rem] border border-[var(--theme-border)]/50 shadow-sm">
              <h4 className="text-xl font-bold text-[var(--theme-primary)] mb-12 text-center handwritten text-3xl">גרף מבנה העלילה (5 מערכות)</h4>
              <p className="text-center text-[var(--theme-primary)]/60 text-sm -mt-8 mb-8">לחצו על הנקודות בגרף כדי לפרט או לקשר סצנה</p>
              
              <div className="relative w-full aspect-[16/9] max-w-2xl mx-auto">
                <svg viewBox="0 0 800 400" className="w-full h-full overflow-visible">
                  {/* The Path */}
                  <path 
                    d="M 700 350 L 550 200 L 400 50 L 250 200 L 100 350" 
                    fill="none" 
                    stroke="var(--theme-primary)" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* Points */}
                  {FIVE_ACT_POINTS.map((point) => (
                    <g 
                      key={point.id} 
                      className="cursor-pointer group"
                      onClick={() => setEditingPointId(point.id)}
                    >
                      <circle 
                        cx={point.x} 
                        cy={point.y} 
                        r={editingPointId === point.id ? "10" : "6"} 
                        fill={editingPointId === point.id ? "var(--theme-accent)" : "var(--theme-primary)"}
                        className="transition-all duration-300 group-hover:r-10 group-hover:fill-[var(--theme-accent)]"
                      />
                      <text 
                        x={point.x} 
                        y={point.y + 35} 
                        textAnchor="middle" 
                        className={`fill-[var(--theme-primary)] font-bold text-lg handwritten transition-all duration-300 ${editingPointId === point.id ? 'fill-[var(--theme-accent)] scale-110' : ''}`}
                      >
                        {point.label}
                      </text>
                      {pointsData[point.id]?.sceneId && (
                        <circle cx={point.x} cy={point.y} r="15" fill="none" stroke="var(--theme-accent)" strokeWidth="1" strokeDasharray="2,2" className="animate-spin-slow" />
                      )}
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            {/* Point Editor */}
            {editingPointId && activePoint && (
              <div className="bg-[var(--theme-card)] rounded-[2rem] p-8 border-2 border-[var(--theme-accent)] shadow-xl animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="bg-[var(--theme-accent)] p-2 rounded-xl text-white">
                      <Sparkles size={20} />
                    </div>
                    <h3 className="text-2xl font-bold text-[var(--theme-primary)] handwritten text-4xl">פירוט נקודה: {activePoint.label}</h3>
                  </div>
                  <button 
                    onClick={() => setEditingPointId(null)}
                    className="p-2 hover:bg-[var(--theme-secondary)] rounded-full text-[var(--theme-primary)]/40 hover:text-[var(--theme-primary)] transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-[var(--theme-primary)]/60">
                      <Link size={16} />
                      קישור לסצנה מלוח העלילה
                    </label>
                    <select
                      value={activeData.sceneId || ''}
                      onChange={(e) => onUpdatePoint(editingPointId, { ...activeData, sceneId: e.target.value })}
                      className="w-full bg-[var(--theme-secondary)]/50 border-2 border-[var(--theme-border)]/30 rounded-2xl p-4 text-[var(--theme-primary)] font-bold focus:border-[var(--theme-accent)] focus:ring-0 transition-all"
                    >
                      <option value="">בחר סצנה...</option>
                      {scenes.map(scene => (
                        <option key={scene.id} value={scene.id}>{scene.title}</option>
                      ))}
                    </select>
                    {activeData.sceneId && (
                      <div className="p-4 bg-[var(--theme-accent)]/10 rounded-2xl border border-[var(--theme-accent)]/20 flex items-center gap-3 text-[var(--theme-accent)]">
                        <CheckCircle2 size={18} />
                        <span className="text-sm font-bold">סצנה מקושרת בהצלחה</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-[var(--theme-primary)]/60">
                      <FileText size={16} />
                      פירוט מה קורה בנקודה זו
                    </label>
                    <textarea
                      value={activeData.description || ''}
                      onChange={(e) => onUpdatePoint(editingPointId, { ...activeData, description: e.target.value })}
                      placeholder="פרטו כאן את ההתרחשות המרכזית בנקודה זו..."
                      className="w-full h-40 bg-[var(--theme-secondary)]/50 border-2 border-[var(--theme-border)]/30 rounded-2xl p-4 text-[var(--theme-primary)] focus:border-[var(--theme-accent)] focus:ring-0 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedStructure === 'seven-acts' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-[var(--theme-secondary)]/30 p-8 rounded-[2rem] border border-[var(--theme-border)]/30">
              <h3 className="text-2xl font-bold text-[var(--theme-primary)] mb-6 handwritten text-4xl">מבנה שבע המערכות</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-right" dir="rtl">
                <div className="bg-[var(--theme-card)] p-4 rounded-2xl shadow-sm border border-[var(--theme-border)]/20">
                  <h4 className="font-bold text-[var(--theme-accent)] mb-1 text-sm">מצב פתיחה</h4>
                  <p className="text-xs leading-relaxed">מצב העולם בתחילת הסיפור – לפני שהעלילה מתחילה לזוז.</p>
                </div>
                <div className="bg-[var(--theme-card)] p-4 rounded-2xl shadow-sm border border-[var(--theme-border)]/20">
                  <h4 className="font-bold text-[var(--theme-accent)] mb-1 text-sm">נקודת מפנה 1</h4>
                  <p className="text-xs leading-relaxed">האירוע שמניע את העלילה ומוציא את הדמות מהמצב הרגיל.</p>
                </div>
                <div className="bg-[var(--theme-card)] p-4 rounded-2xl shadow-sm border border-[var(--theme-border)]/20">
                  <h4 className="font-bold text-[var(--theme-accent)] mb-1 text-sm">נקודת לחץ 1</h4>
                  <p className="text-xs leading-relaxed">רגע שבו הקורא מבין את האיום או את כוחו של היריב.</p>
                </div>
                <div className="bg-[var(--theme-card)] p-4 rounded-2xl shadow-sm border border-[var(--theme-border)]/20">
                  <h4 className="font-bold text-[var(--theme-accent)] mb-1 text-sm">נקודת אמצע</h4>
                  <p className="text-xs leading-relaxed">אירוע גדול שמשנה את כיוון הסיפור או את הבנת הדמות.</p>
                </div>
                <div className="bg-[var(--theme-card)] p-4 rounded-2xl shadow-sm border border-[var(--theme-border)]/20">
                  <h4 className="font-bold text-[var(--theme-accent)] mb-1 text-sm">נקודת לחץ 2</h4>
                  <p className="text-xs leading-relaxed">החרפת הסכנה והתחזקות הקונפליקט.</p>
                </div>
                <div className="bg-[var(--theme-card)] p-4 rounded-2xl shadow-sm border border-[var(--theme-border)]/20">
                  <h4 className="font-bold text-[var(--theme-accent)] mb-1 text-sm">נקודת מפנה 2</h4>
                  <p className="text-xs leading-relaxed">שינוי שמוביל אל השיא ומכין את העימות הסופי.</p>
                </div>
                <div className="bg-[var(--theme-card)] p-4 rounded-2xl shadow-sm border border-[var(--theme-border)]/20">
                  <h4 className="font-bold text-[var(--theme-accent)] mb-1 text-sm">פתרון / התרה</h4>
                  <p className="text-xs leading-relaxed">הסיום והמצב החדש לאחר השיא.</p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--theme-card)] p-10 rounded-[2rem] border border-[var(--theme-border)]/50 shadow-sm">
              <h4 className="text-xl font-bold text-[var(--theme-primary)] mb-12 text-center handwritten text-3xl">גרף מבנה העלילה (7 מערכות)</h4>
              <p className="text-center text-[var(--theme-primary)]/60 text-sm -mt-8 mb-8">לחצו על הנקודות בגרף כדי לפרט או לקשר סצנה</p>
              
              <div className="relative w-full aspect-[16/9] max-w-2xl mx-auto">
                <svg viewBox="0 0 800 400" className="w-full h-full overflow-visible">
                  {/* The Path */}
                  <path 
                    d="M 700 350 L 600 100 L 500 220 L 400 130 L 300 220 L 200 180 L 100 350" 
                    fill="none" 
                    stroke="var(--theme-primary)" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* Points */}
                  {SEVEN_ACT_POINTS.map((point) => (
                    <g 
                      key={point.id} 
                      className="cursor-pointer group"
                      onClick={() => setEditingPointId(point.id)}
                    >
                      <circle 
                        cx={point.x} 
                        cy={point.y} 
                        r={editingPointId === point.id ? "10" : "6"} 
                        fill={editingPointId === point.id ? "var(--theme-accent)" : "var(--theme-primary)"}
                        className="transition-all duration-300 group-hover:r-10 group-hover:fill-[var(--theme-accent)]"
                      />
                      <text 
                        x={point.x} 
                        y={point.y + 35} 
                        textAnchor="middle" 
                        className={`fill-[var(--theme-primary)] font-bold text-lg handwritten transition-all duration-300 ${editingPointId === point.id ? 'fill-[var(--theme-accent)] scale-110' : ''}`}
                      >
                        {point.label}
                      </text>
                      {pointsData[point.id]?.sceneId && (
                        <circle cx={point.x} cy={point.y} r="15" fill="none" stroke="var(--theme-accent)" strokeWidth="1" strokeDasharray="2,2" className="animate-spin-slow" />
                      )}
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            {/* Point Editor */}
            {editingPointId && activePoint && (
              <div className="bg-[var(--theme-card)] rounded-[2rem] p-8 border-2 border-[var(--theme-accent)] shadow-xl animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="bg-[var(--theme-accent)] p-2 rounded-xl text-white">
                      <Sparkles size={20} />
                    </div>
                    <h3 className="text-2xl font-bold text-[var(--theme-primary)] handwritten text-4xl">פירוט נקודה: {activePoint.label}</h3>
                  </div>
                  <button 
                    onClick={() => setEditingPointId(null)}
                    className="p-2 hover:bg-[var(--theme-secondary)] rounded-full text-[var(--theme-primary)]/40 hover:text-[var(--theme-primary)] transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-[var(--theme-primary)]/60">
                      <Link size={16} />
                      קישור לסצנה מלוח העלילה
                    </label>
                    <select
                      value={activeData.sceneId || ''}
                      onChange={(e) => onUpdatePoint(editingPointId, { ...activeData, sceneId: e.target.value })}
                      className="w-full bg-[var(--theme-secondary)]/50 border-2 border-[var(--theme-border)]/30 rounded-2xl p-4 text-[var(--theme-primary)] font-bold focus:border-[var(--theme-accent)] focus:ring-0 transition-all"
                    >
                      <option value="">בחר סצנה...</option>
                      {scenes.map(scene => (
                        <option key={scene.id} value={scene.id}>{scene.title}</option>
                      ))}
                    </select>
                    {activeData.sceneId && (
                      <div className="p-4 bg-[var(--theme-accent)]/10 rounded-2xl border border-[var(--theme-accent)]/20 flex items-center gap-3 text-[var(--theme-accent)]">
                        <CheckCircle2 size={18} />
                        <span className="text-sm font-bold">סצנה מקושרת בהצלחה</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-[var(--theme-primary)]/60">
                      <FileText size={16} />
                      פירוט מה קורה בנקודה זו
                    </label>
                    <textarea
                      value={activeData.description || ''}
                      onChange={(e) => onUpdatePoint(editingPointId, { ...activeData, description: e.target.value })}
                      placeholder="פרטו כאן את ההתרחשות המרכזית בנקודה זו..."
                      className="w-full h-40 bg-[var(--theme-secondary)]/50 border-2 border-[var(--theme-border)]/30 rounded-2xl p-4 text-[var(--theme-primary)] focus:border-[var(--theme-accent)] focus:ring-0 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedStructure === 'heros-journey' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-[var(--theme-secondary)]/30 p-8 rounded-[2rem] border border-[var(--theme-border)]/30">
              <h3 className="text-2xl font-bold text-[var(--theme-primary)] mb-6 handwritten text-4xl">מבנה סיפור הגיבור המעגלי</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 text-right" dir="rtl">
                {[
                  { n: 1, t: 'הצגה של העולם הרגיל' },
                  { n: 2, t: 'קריאה להרפתקה' },
                  { n: 3, t: 'סירוב' },
                  { n: 4, t: 'פגישה עם מורה' },
                  { n: 5, t: 'יציאה לדרך' },
                  { n: 6, t: 'מבחנים בדרך ומציאת בעלי ברית' },
                  { n: 7, t: 'משבר גדול - הסוף נראה באופק' },
                  { n: 8, t: 'ניצחון' },
                  { n: 9, t: 'חזרה לשגרה חדשה' }
                ].map((step) => (
                  <div key={step.n} className="bg-[var(--theme-card)] p-4 rounded-2xl shadow-sm border border-[var(--theme-border)]/20">
                    <h4 className="font-bold text-[var(--theme-accent)] mb-1 text-sm">שלב {step.n}</h4>
                    <p className="text-xs leading-relaxed">{step.t}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[var(--theme-card)] p-10 rounded-[2rem] border border-[var(--theme-border)]/50 shadow-sm">
              <h4 className="text-xl font-bold text-[var(--theme-primary)] mb-12 text-center handwritten text-3xl">גרף מבנה העלילה (הגיבור המעגלי)</h4>
              <p className="text-center text-[var(--theme-primary)]/60 text-sm -mt-8 mb-8">לחצו על הנקודות במעגל כדי לפרט או לקשר סצנה</p>
              
              <div className="relative w-full aspect-square max-w-lg mx-auto">
                <svg viewBox="0 0 800 500" className="w-full h-full overflow-visible">
                  {/* The Circle Path */}
                  <circle 
                    cx="400" 
                    cy="250" 
                    r="180" 
                    fill="none" 
                    stroke="var(--theme-primary)" 
                    strokeWidth="3" 
                    strokeDasharray="8,8"
                    className="opacity-20"
                  />
                  
                  {/* Connecting lines for the journey */}
                  <path 
                    d="M 400 70 A 180 180 0 0 1 550 120 A 180 180 0 0 1 630 250 A 180 180 0 0 1 550 380 A 180 180 0 0 1 400 430 A 180 180 0 0 1 250 380 A 180 180 0 0 1 170 250 A 180 180 0 0 1 250 120 A 180 180 0 0 1 360 85"
                    fill="none"
                    stroke="var(--theme-primary)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Points */}
                  {HEROS_JOURNEY_POINTS.map((point) => (
                    <g 
                      key={point.id} 
                      className="cursor-pointer group"
                      onClick={() => setEditingPointId(point.id)}
                    >
                      <circle 
                        cx={point.x} 
                        cy={point.y} 
                        r={editingPointId === point.id ? "10" : "6"} 
                        fill={editingPointId === point.id ? "var(--theme-accent)" : "var(--theme-primary)"}
                        className="transition-all duration-300 group-hover:r-10 group-hover:fill-[var(--theme-accent)]"
                      />
                      <text 
                        x={point.x} 
                        y={point.y > 250 ? point.y + 35 : point.y - 15} 
                        textAnchor="middle" 
                        className={`fill-[var(--theme-primary)] font-bold text-lg handwritten transition-all duration-300 ${editingPointId === point.id ? 'fill-[var(--theme-accent)] scale-110' : ''}`}
                      >
                        {point.label}
                      </text>
                      {pointsData[point.id]?.sceneId && (
                        <circle cx={point.x} cy={point.y} r="15" fill="none" stroke="var(--theme-accent)" strokeWidth="1" strokeDasharray="2,2" className="animate-spin-slow" />
                      )}
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            {/* Point Editor */}
            {editingPointId && activePoint && (
              <div className="bg-[var(--theme-card)] rounded-[2rem] p-8 border-2 border-[var(--theme-accent)] shadow-xl animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="bg-[var(--theme-accent)] p-2 rounded-xl text-white">
                      <Sparkles size={20} />
                    </div>
                    <h3 className="text-2xl font-bold text-[var(--theme-primary)] handwritten text-4xl">פירוט נקודה: {activePoint.label}</h3>
                  </div>
                  <button 
                    onClick={() => setEditingPointId(null)}
                    className="p-2 hover:bg-[var(--theme-secondary)] rounded-full text-[var(--theme-primary)]/40 hover:text-[var(--theme-primary)] transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-[var(--theme-primary)]/60">
                      <Link size={16} />
                      קישור לסצנה מלוח העלילה
                    </label>
                    <select
                      value={activeData.sceneId || ''}
                      onChange={(e) => onUpdatePoint(editingPointId, { ...activeData, sceneId: e.target.value })}
                      className="w-full bg-[var(--theme-secondary)]/50 border-2 border-[var(--theme-border)]/30 rounded-2xl p-4 text-[var(--theme-primary)] font-bold focus:border-[var(--theme-accent)] focus:ring-0 transition-all"
                    >
                      <option value="">בחר סצנה...</option>
                      {scenes.map(scene => (
                        <option key={scene.id} value={scene.id}>{scene.title}</option>
                      ))}
                    </select>
                    {activeData.sceneId && (
                      <div className="p-4 bg-[var(--theme-accent)]/10 rounded-2xl border border-[var(--theme-accent)]/20 flex items-center gap-3 text-[var(--theme-accent)]">
                        <CheckCircle2 size={18} />
                        <span className="text-sm font-bold">סצנה מקושרת בהצלחה</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-[var(--theme-primary)]/60">
                      <FileText size={16} />
                      פירוט מה קורה בנקודה זו
                    </label>
                    <textarea
                      value={activeData.description || ''}
                      onChange={(e) => onUpdatePoint(editingPointId, { ...activeData, description: e.target.value })}
                      placeholder="פרטו כאן את ההתרחשות המרכזית בנקודה זו..."
                      className="w-full h-40 bg-[var(--theme-secondary)]/50 border-2 border-[var(--theme-border)]/30 rounded-2xl p-4 text-[var(--theme-primary)] focus:border-[var(--theme-accent)] focus:ring-0 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedStructure === 'custom' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-[var(--theme-secondary)]/30 p-8 rounded-[2rem] border border-[var(--theme-border)]/30">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-[var(--theme-primary)] handwritten text-4xl">מבנה גמיש</h3>
                <button
                  onClick={() => {
                    const newId = `custom-${Date.now()}`;
                    const points = customPlotPoints.length > 0 ? [...customPlotPoints] : [
                      { id: 'custom-start', label: 'התחלה', x: 700, y: 350 },
                      { id: 'custom-end', label: 'סיום', x: 100, y: 350 }
                    ];
                    // Insert in the middle (between start and end)
                    const newPoint = {
                      id: newId,
                      label: 'נקודה חדשה',
                      x: 400,
                      y: 200
                    };
                    // Simple logic: insert before the last point (which is 'סיום')
                    const last = points.pop()!;
                    onUpdateCustomPoints([...points, newPoint, last]);
                  }}
                >
                  <Plus size={18} />
                  הוספת נקודה
                </button>
              </div>
              <p className="text-[var(--theme-primary)]/60 text-sm">צרו מבנה עלילה משלכם על ידי הוספת נקודות וגרירתן למיקום הרצוי.</p>
            </div>

            <div className="bg-[var(--theme-card)] p-10 rounded-[2rem] border border-[var(--theme-border)]/50 shadow-sm">
              <h4 className="text-xl font-bold text-[var(--theme-primary)] mb-12 text-center handwritten text-3xl">גרף מבנה בהתאמה אישית</h4>
              
              <div className="relative w-full aspect-[16/9] max-w-2xl mx-auto border border-dashed border-[var(--theme-border)]/30 rounded-xl overflow-hidden">
                <svg viewBox="0 0 800 400" className="w-full h-full overflow-visible">
                  {/* The Path */}
                  {activePoints.length > 1 && (
                    <path 
                      d={`M ${activePoints.map((p: any) => `${p.x} ${p.y}`).join(' L ')}`} 
                      fill="none" 
                      stroke="var(--theme-primary)" 
                      strokeWidth="3" 
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="opacity-50"
                    />
                  )}
                  
                  {/* Points */}
                  {activePoints.map((point: any, idx: number) => (
                    <g 
                      key={point.id} 
                      className="cursor-pointer group"
                      onMouseDown={(e) => {
                        // Dragging logic
                        const svg = e.currentTarget.ownerSVGElement;
                        if (!svg) return;
                        
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const initialX = point.x;
                        const initialY = point.y;

                        const onMouseMove = (moveEvent: MouseEvent) => {
                          const CTM = svg.getScreenCTM();
                          if (!CTM) return;
                          const dx = (moveEvent.clientX - startX) / CTM.a;
                          const dy = (moveEvent.clientY - startY) / CTM.d;
                          
                          const newPoints = [...activePoints];
                          newPoints[idx] = {
                            ...point,
                            x: Math.max(0, Math.min(800, initialX + dx)),
                            y: Math.max(0, Math.min(400, initialY + dy))
                          };
                          onUpdateCustomPoints(newPoints);
                        };

                        const onMouseUp = () => {
                          window.removeEventListener('mousemove', onMouseMove);
                          window.removeEventListener('mouseup', onMouseUp);
                        };

                        window.addEventListener('mousemove', onMouseMove);
                        window.addEventListener('mouseup', onMouseUp);
                      }}
                      onClick={(e) => {
                        // Only set editing if not dragging (simple check: if it was a quick click)
                        setEditingPointId(point.id);
                      }}
                    >
                      <circle 
                        cx={point.x} 
                        cy={point.y} 
                        r={editingPointId === point.id ? "12" : "8"} 
                        fill={editingPointId === point.id ? "var(--theme-accent)" : "var(--theme-primary)"}
                        className="transition-all duration-300 group-hover:r-12 group-hover:fill-[var(--theme-accent)]"
                      />
                      <text 
                        x={point.x} 
                        y={point.y + 35} 
                        textAnchor="middle" 
                        className={`fill-[var(--theme-primary)] font-bold text-lg handwritten transition-all duration-300 select-none ${editingPointId === point.id ? 'fill-[var(--theme-accent)] scale-110' : ''}`}
                      >
                        {point.label}
                      </text>
                      {pointsData[point.id]?.sceneId && (
                        <circle cx={point.x} cy={point.y} r="18" fill="none" stroke="var(--theme-accent)" strokeWidth="1" strokeDasharray="2,2" className="animate-spin-slow" />
                      )}
                    </g>
                  ))}
                </svg>
              </div>
              <p className="text-center text-[var(--theme-primary)]/40 text-xs mt-4">ניתן לגרור את הנקודות לשינוי המבנה. לחצו על נקודה לעריכת פרטים.</p>
            </div>

            {/* Point Editor */}
            {editingPointId && activePoint && (
              <div className="bg-[var(--theme-card)] rounded-[2rem] p-8 border-2 border-[var(--theme-accent)] shadow-xl animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="bg-[var(--theme-accent)] p-2 rounded-xl text-white">
                      <Sparkles size={20} />
                    </div>
                    <div className="flex flex-col">
                      <input 
                        value={activePoint.label}
                        onChange={(e) => {
                          if (selectedStructure === 'custom') {
                            const newPoints = [...activePoints];
                            const idx = newPoints.findIndex(p => p.id === editingPointId);
                            if (idx !== -1) {
                              newPoints[idx].label = e.target.value;
                              onUpdateCustomPoints(newPoints);
                            }
                          }
                        }}
                        className="text-2xl font-bold bg-transparent border-none focus:ring-0 p-0 text-[var(--theme-primary)] handwritten text-4xl"
                        placeholder="שם הנקודה..."
                        disabled={editingPointId === 'custom-start' || editingPointId === 'custom-end'}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedStructure === 'custom' && editingPointId !== 'custom-start' && editingPointId !== 'custom-end' && (
                      <button
                        onClick={() => {
                          const newPoints = activePoints.filter((p: any) => p.id !== editingPointId);
                          onUpdateCustomPoints(newPoints);
                          setEditingPointId(null);
                        }}
                        className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors"
                        title="מחיקת נקודה"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                    <button 
                      onClick={() => setEditingPointId(null)}
                      className="p-2 hover:bg-[var(--theme-secondary)] rounded-full text-[var(--theme-primary)]/40 hover:text-[var(--theme-primary)] transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-[var(--theme-primary)]/60">
                      <Link size={16} />
                      קישור לסצנה מלוח העלילה
                    </label>
                    <select
                      value={activeData.sceneId || ''}
                      onChange={(e) => onUpdatePoint(editingPointId, { ...activeData, sceneId: e.target.value })}
                      className="w-full bg-[var(--theme-secondary)]/50 border-2 border-[var(--theme-border)]/30 rounded-2xl p-4 text-[var(--theme-primary)] font-bold focus:border-[var(--theme-accent)] focus:ring-0 transition-all"
                    >
                      <option value="">בחר סצנה...</option>
                      {scenes.map(scene => (
                        <option key={scene.id} value={scene.id}>{scene.title}</option>
                      ))}
                    </select>
                    {activeData.sceneId && (
                      <div className="p-4 bg-[var(--theme-accent)]/10 rounded-2xl border border-[var(--theme-accent)]/20 flex items-center gap-3 text-[var(--theme-accent)]">
                        <CheckCircle2 size={18} />
                        <span className="text-sm font-bold">סצנה מקושרת בהצלחה</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-[var(--theme-primary)]/60">
                      <FileText size={16} />
                      פירוט מה קורה בנקודה זו
                    </label>
                    <textarea
                      value={activeData.description || ''}
                      onChange={(e) => onUpdatePoint(editingPointId, { ...activeData, description: e.target.value })}
                      placeholder="פרטו כאן את ההתרחשות המרכזית בנקודה זו..."
                      className="w-full h-40 bg-[var(--theme-secondary)]/50 border-2 border-[var(--theme-border)]/30 rounded-2xl p-4 text-[var(--theme-primary)] focus:border-[var(--theme-accent)] focus:ring-0 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedStructure && selectedStructure !== 'three-acts' && selectedStructure !== 'five-acts' && selectedStructure !== 'seven-acts' && selectedStructure !== 'heros-journey' && selectedStructure !== 'custom' && (
          <div className="bg-[var(--theme-card)] rounded-[2rem] p-10 border border-[var(--theme-border)]/50 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
             <p className="text-[var(--theme-primary)]/60 italic">
               כאן יוצגו שלבי המבנה הנבחר: {STRUCTURES.find(s => s.id === selectedStructure)?.label}
             </p>
          </div>
        )}

        {/* Linked Scenes Summary Section */}
        {selectedStructure && activePoints.some((p: any) => pointsData[p.id]?.sceneId || pointsData[p.id]?.description) && (
          <div className="mt-12 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-[var(--theme-accent)] p-2 rounded-xl text-white">
                <FileText size={20} />
              </div>
              <h3 className="text-2xl font-bold text-[var(--theme-primary)] handwritten text-4xl">סיכום נקודות עלילה</h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {activePoints.map((point: any) => {
                const data = pointsData[point.id];
                if (!data?.sceneId && !data?.description) return null;
                const scene = scenes.find(s => s.id === data.sceneId);
                return (
                  <div key={point.id} className="bg-[var(--theme-card)] p-6 rounded-[2rem] border border-[var(--theme-border)]/50 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--theme-accent)] font-bold text-lg">{point.label}</span>
                      {scene && (
                        <span className="bg-[var(--theme-secondary)]/50 px-3 py-1 rounded-full text-xs font-bold text-[var(--theme-primary)]/60">
                          סצנה: {scene.title}
                        </span>
                      )}
                    </div>
                    {data.description && (
                      <p className="text-[var(--theme-primary)]/80 leading-relaxed whitespace-pre-wrap">
                        {data.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
          </>
        ) : activeSubView === 'arc' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Explanation Space */}
            <div className="bg-[var(--theme-accent)]/5 p-8 rounded-[2rem] border border-[var(--theme-accent)]/20">
              <div className="flex items-center gap-3 mb-4 text-[var(--theme-accent)]">
                <Info size={20} />
                <h3 className="text-xl font-bold handwritten text-3xl">על קשת התפתחות הדמות</h3>
              </div>
              <div className="text-[var(--theme-primary)]/70 leading-relaxed italic">
                דמות שלא משתנה, היא דמות משעממת.
                <br />
                אם נקודת הסיום וההתחלה יכולות להיות מתוארות באותן מילים, פספסנו.
                <br />
                זה המקום לתכנן או לשקף את השינוי שהדמויות שלנו עושות.
                <br />
                אחרי המצב ההתחלתי, נכתוב על המשברים, על הבחירות שתעשה הדמות, ועל ההשפעה של הבחירות עליה ועל אחרים.
                <br />
                נוודא שבכל שלב משמעותי בסיפור, משהו בדמות ישתנה. תובנה חדשה, הרגל שמשתנה, נסיון נוסף.
                <br />
                כך שבסוף הסיפור, תהיה לנו דמות עשירה ועמוקה יותר מבנקודת ההתחלה.
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => {
                  const newArc = {
                    id: `arc-${Date.now()}`,
                    characterName: 'דמות חדשה',
                    steps: [{ id: `step-${Date.now()}`, text: 'תחילת הספר' }]
                  };
                  onUpdateArcs([newArc, ...characterArcs]);
                }}
                className="flex items-center gap-2 px-8 py-4 bg-[var(--theme-accent)] text-white rounded-2xl font-bold shadow-lg hover:scale-105 transition-all"
              >
                <Plus size={20} />
                הוספת דמות לקשת התפתחות
              </button>
            </div>

            <div className="space-y-12">
              {characterArcs.map((arc, arcIndex) => (
                <div key={arc.id} className="bg-[var(--theme-card)] rounded-[2rem] p-8 border border-[var(--theme-border)]/50 shadow-sm space-y-8">
                  <div className="flex items-center justify-between border-b border-[var(--theme-border)]/30 pb-6">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="bg-[var(--theme-accent)]/10 p-3 rounded-2xl text-[var(--theme-accent)]">
                        <TrendingUp size={24} />
                      </div>
                      <input
                        value={arc.characterName}
                        onChange={(e) => {
                          const newArcs = [...characterArcs];
                          newArcs[arcIndex].characterName = e.target.value;
                          onUpdateArcs(newArcs);
                        }}
                        className="text-2xl font-bold bg-transparent border-none focus:ring-0 p-0 text-[var(--theme-primary)] handwritten text-4xl w-full"
                        placeholder="שם הדמות..."
                      />
                    </div>
                    <button
                      onClick={() => {
                        const newArcs = characterArcs.filter(a => a.id !== arc.id);
                        onUpdateArcs(newArcs);
                      }}
                      className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-colors"
                      title="מחיקת קשת דמות"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-6" dir="rtl">
                    {arc.steps.map((step, stepIndex) => (
                      <React.Fragment key={step.id}>
                        <div className="relative group">
                          <div className="w-64 bg-[var(--theme-secondary)]/50 border-2 border-[var(--theme-border)]/30 rounded-2xl p-4 focus-within:border-[var(--theme-accent)] transition-all shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-[var(--theme-primary)]/40 uppercase tracking-wider">
                                  שלב {stepIndex + 1}
                                </span>
                                <button
                                  onClick={() => {
                                    setPullingDataFor({ arcIndex, stepIndex });
                                    setSelectedCharForPull(null);
                                  }}
                                  className="text-[var(--theme-accent)] hover:scale-110 transition-transform"
                                  title="שליפה משאלון דמות"
                                >
                                  <FileText size={12} />
                                </button>
                              </div>
                              {arc.steps.length > 1 && (
                                <button
                                  onClick={() => {
                                    const newArcs = [...characterArcs];
                                    newArcs[arcIndex].steps = newArcs[arcIndex].steps.filter(s => s.id !== step.id);
                                    onUpdateArcs(newArcs);
                                  }}
                                  className="text-red-300 hover:text-red-500 transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                            <textarea
                              value={step.text}
                              onChange={(e) => {
                                const newArcs = [...characterArcs];
                                newArcs[arcIndex].steps[stepIndex].text = e.target.value;
                                onUpdateArcs(newArcs);
                              }}
                              placeholder={stepIndex === 0 ? "תחילת הספר..." : "תארו את ההתפתחות..."}
                              className="w-full bg-transparent border-none focus:ring-0 p-0 text-[var(--theme-primary)] text-sm resize-none h-24"
                            />
                          </div>
                        </div>
                        {stepIndex < arc.steps.length - 1 && (
                          <div className="text-[var(--theme-accent)] animate-pulse">
                            <ArrowLeft size={24} />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                    
                    <button
                      onClick={() => {
                        const newArcs = [...characterArcs];
                        newArcs[arcIndex].steps.push({ id: `step-${Date.now()}`, text: '' });
                        onUpdateArcs(newArcs);
                      }}
                      className="w-12 h-12 rounded-full border-2 border-dashed border-[var(--theme-accent)]/40 text-[var(--theme-accent)] flex items-center justify-center hover:bg-[var(--theme-accent)]/5 transition-all hover:scale-110"
                      title="הוספת שלב התפתחות"
                    >
                      <Plus size={24} />
                    </button>
                  </div>
                </div>
              ))}

              {characterArcs.length === 0 && (
                <div className="text-center py-20 opacity-40">
                  <p className="handwritten text-3xl">עדיין לא נוספו דמויות לקשת ההתפתחות</p>
                </div>
              )}
            </div>
          </div>
        ) : activeSubView === 'relationships' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Explanation Space */}
            <div className="bg-[var(--theme-accent)]/5 p-8 rounded-[2rem] border border-[var(--theme-accent)]/20">
              <div className="flex items-center gap-3 mb-4 text-[var(--theme-accent)]">
                <Users size={20} />
                <h3 className="text-xl font-bold handwritten text-3xl">מערכות יחסים ודינמיקה</h3>
              </div>
              <div className="text-[var(--theme-primary)]/70 leading-relaxed italic">
                כשנרצה לבנות מערכת יחסים, 
                נצטרך לזכור שכל אחד מהצדדים מתנהל באופן יומיומי מלא. 
                <br />
                כל צד במערכת היחסים עסוק בחיים שלו, עד שהם משתלבים בחייו של הצד השני.
                <br />
                גם אחרי השילוב, יש זמנים נפרדים וזמנים משותפים. פה נוכל לכתוב את השלבים האלו.
                <br />
                בנוסף, נוכל לתאר את ההתפתחות הרגשית בקשר. 
                <br />
                אם צד אחד מרגיש נלהב וסקרן, והצד השני, אדיש ומרוחק, זה המקום לכתוב, ולוודא שהתפתחות מערכת היחסים מתנהלת באופן אמין, ודו צדדי.
                <br />
                גם אם הספר שלנו כתוב רק על צד אחד, נוכל להשלים את הצד השני כדי לוודא שהכל מתנהל בצורה הגיונית.
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => {
                  const newRel = {
                    id: `rel-${Date.now()}`,
                    char1Id: '',
                    char2Id: '',
                    steps: [{ id: `step-${Date.now()}`, track1Text: 'התחלה', track2Text: 'התחלה', isMerged: false }]
                  };
                  onUpdateRelationships([newRel, ...relationships]);
                }}
                className="flex items-center gap-2 px-8 py-4 bg-[var(--theme-accent)] text-white rounded-2xl font-bold shadow-lg hover:scale-105 transition-all"
              >
                <Plus size={20} />
                הוספת מערכת יחסים חדשה
              </button>
            </div>

            <div className="space-y-12">
              {relationships.map((rel, relIndex) => (
                <div key={rel.id} className="bg-[var(--theme-card)] rounded-[2rem] p-8 border border-[var(--theme-border)]/50 shadow-sm space-y-8">
                  <div className="flex items-center justify-between border-b border-[var(--theme-border)]/30 pb-6">
                    <div className="flex items-center gap-4 flex-1">
                      <select
                        value={rel.char1Id}
                        onChange={(e) => {
                          const newRels = [...relationships];
                          newRels[relIndex].char1Id = e.target.value;
                          onUpdateRelationships(newRels);
                        }}
                        className="bg-[var(--theme-secondary)]/30 border-none rounded-xl px-4 py-2 text-[var(--theme-primary)] font-bold focus:ring-2 focus:ring-[var(--theme-accent)]"
                      >
                        <option value="">בחירת דמות 1...</option>
                        {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <div className="text-[var(--theme-accent)]">
                        <Users size={20} />
                      </div>
                      <select
                        value={rel.char2Id}
                        onChange={(e) => {
                          const newRels = [...relationships];
                          newRels[relIndex].char2Id = e.target.value;
                          onUpdateRelationships(newRels);
                        }}
                        className="bg-[var(--theme-secondary)]/30 border-none rounded-xl px-4 py-2 text-[var(--theme-primary)] font-bold focus:ring-2 focus:ring-[var(--theme-accent)]"
                      >
                        <option value="">בחירת דמות 2...</option>
                        {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        const newRels = relationships.filter(r => r.id !== rel.id);
                        onUpdateRelationships(newRels);
                      }}
                      className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  <div className="space-y-6 relative">
                    {/* Vertical Line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-[var(--theme-border)]/20 -translate-x-1/2 hidden md:block" />
                    
                    {rel.steps.map((step: any, stepIndex: number) => (
                      <div key={step.id} className="relative z-10">
                        {step.isMerged ? (
                          <div className="flex justify-center">
                            <div className="w-full max-w-2xl bg-[var(--theme-accent)]/5 border-2 border-[var(--theme-accent)]/30 rounded-3xl p-6 relative group">
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--theme-accent)] text-white px-4 py-1 rounded-full text-[10px] font-bold flex items-center gap-2">
                                <GitMerge size={12} />
                                מסלול משותף
                              </div>
                              <textarea
                                value={step.track1Text}
                                onChange={(e) => {
                                  const newRels = [...relationships];
                                  newRels[relIndex].steps[stepIndex].track1Text = e.target.value;
                                  newRels[relIndex].steps[stepIndex].track2Text = e.target.value;
                                  onUpdateRelationships(newRels);
                                }}
                                placeholder="מה קורה כשהם יחד?"
                                className="w-full bg-transparent border-none focus:ring-0 p-0 text-[var(--theme-primary)] text-center font-bold handwritten text-2xl resize-none h-24"
                              />
                              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    const newRels = [...relationships];
                                    newRels[relIndex].steps[stepIndex].isMerged = false;
                                    onUpdateRelationships(newRels);
                                  }}
                                  className="p-2 bg-white rounded-lg shadow-sm text-[var(--theme-accent)] hover:scale-110 transition-transform"
                                  title="הפרדה למסלולים נפרדים"
                                >
                                  <GitBranch size={16} />
                                </button>
                                {rel.steps.length > 1 && (
                                  <button
                                    onClick={() => {
                                      const newRels = [...relationships];
                                      newRels[relIndex].steps = newRels[relIndex].steps.filter((s: any) => s.id !== step.id);
                                      onUpdateRelationships(newRels);
                                    }}
                                    className="p-2 bg-white rounded-lg shadow-sm text-red-400 hover:scale-110 transition-transform"
                                  >
                                    <X size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            {/* Track 1 */}
                            <div className="bg-[var(--theme-secondary)]/50 border-2 border-[var(--theme-border)]/30 rounded-3xl p-6 relative group">
                              <div className="absolute -top-3 right-6 bg-[var(--theme-secondary)] border border-[var(--theme-border)]/50 text-[var(--theme-primary)]/40 px-3 py-0.5 rounded-full text-[10px] font-bold">
                                {characters.find((c: any) => c.id === rel.char1Id)?.name || 'דמות 1'}
                              </div>
                              <textarea
                                value={step.track1Text}
                                onChange={(e) => {
                                  const newRels = [...relationships];
                                  newRels[relIndex].steps[stepIndex].track1Text = e.target.value;
                                  onUpdateRelationships(newRels);
                                }}
                                placeholder="מה קורה במסלול הזה?"
                                className="w-full bg-transparent border-none focus:ring-0 p-0 text-[var(--theme-primary)] text-sm resize-none h-24"
                              />
                            </div>

                            {/* Track 2 */}
                            <div className="bg-[var(--theme-secondary)]/50 border-2 border-[var(--theme-border)]/30 rounded-3xl p-6 relative group">
                              <div className="absolute -top-3 right-6 bg-[var(--theme-secondary)] border border-[var(--theme-border)]/50 text-[var(--theme-primary)]/40 px-3 py-0.5 rounded-full text-[10px] font-bold">
                                {characters.find((c: any) => c.id === rel.char2Id)?.name || 'דמות 2'}
                              </div>
                              <textarea
                                value={step.track2Text}
                                onChange={(e) => {
                                  const newRels = [...relationships];
                                  newRels[relIndex].steps[stepIndex].track2Text = e.target.value;
                                  onUpdateRelationships(newRels);
                                }}
                                placeholder="מה קורה במסלול הזה?"
                                className="w-full bg-transparent border-none focus:ring-0 p-0 text-[var(--theme-primary)] text-sm resize-none h-24"
                              />
                              
                              <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    const newRels = [...relationships];
                                    newRels[relIndex].steps[stepIndex].isMerged = true;
                                    newRels[relIndex].steps[stepIndex].track1Text = step.track1Text || step.track2Text;
                                    onUpdateRelationships(newRels);
                                  }}
                                  className="p-2 bg-white rounded-lg shadow-sm text-[var(--theme-accent)] hover:scale-110 transition-transform"
                                  title="חיבור למסלול משותף"
                                >
                                  <GitMerge size={16} />
                                </button>
                                {rel.steps.length > 1 && (
                                  <button
                                    onClick={() => {
                                      const newRels = [...relationships];
                                      newRels[relIndex].steps = newRels[relIndex].steps.filter((s: any) => s.id !== step.id);
                                      onUpdateRelationships(newRels);
                                    }}
                                    className="p-2 bg-white rounded-lg shadow-sm text-red-400 hover:scale-110 transition-transform"
                                  >
                                    <X size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {stepIndex < rel.steps.length - 1 && (
                          <div className="flex justify-center py-4">
                            <div className="w-0.5 h-8 bg-[var(--theme-accent)]/20 animate-pulse" />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    <div className="flex justify-center pt-4">
                      <button
                        onClick={() => {
                          const newRels = [...relationships];
                          newRels[relIndex].steps.push({ 
                            id: `step-${Date.now()}`, 
                            track1Text: '', 
                            track2Text: '', 
                            isMerged: false 
                          });
                          onUpdateRelationships(newRels);
                        }}
                        className="w-12 h-12 rounded-full border-2 border-dashed border-[var(--theme-accent)]/40 text-[var(--theme-accent)] flex items-center justify-center hover:bg-[var(--theme-accent)]/5 transition-all hover:scale-110"
                        title="הוספת שלב בסיפור המשותף"
                      >
                        <Plus size={24} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {relationships.length === 0 && (
                <div className="text-center py-20 opacity-40">
                  <p className="handwritten text-3xl">עדיין לא נוספו מערכות יחסים</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-[var(--theme-card)] rounded-[2rem] p-20 border border-[var(--theme-border)]/50 shadow-sm text-center animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-[var(--theme-accent)]/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Share2 size={40} className="text-[var(--theme-accent)]" />
            </div>
            <h3 className="text-3xl font-bold text-[var(--theme-primary)] mb-4 handwritten text-5xl">מערכות יחסים</h3>
            <p className="text-[var(--theme-primary)]/60 max-w-md mx-auto text-lg">
              כאן תוכלו למפות את הקשרים, הבריתות והיריבויות בין הדמויות שלכם.
              <br />
              <span className="text-sm italic mt-4 block">(בקרוב: מפת קשרים דינמית)</span>
            </p>
          </div>
        )}
      </div>

      {/* Pull Data Modal */}
      {pullingDataFor && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--theme-card)] w-full max-w-md rounded-[2.5rem] shadow-2xl border border-[var(--theme-border)]/50 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--theme-border)]/30 flex justify-between items-center bg-[var(--theme-secondary)]/20">
              <h3 className="text-xl font-bold text-[var(--theme-primary)]">שליפה משאלון דמות</h3>
              <button onClick={() => setPullingDataFor(null)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {!selectedCharForPull ? (
                <div className="space-y-2">
                  <p className="text-sm text-[var(--theme-primary)]/60 mb-3">בחרו דמות:</p>
                  {characters.length > 0 ? (
                    characters.map(char => (
                      <button
                        key={char.id}
                        onClick={() => setSelectedCharForPull(char.id)}
                        className="w-full text-right p-4 rounded-2xl hover:bg-[var(--theme-accent)]/5 border border-transparent hover:border-[var(--theme-accent)]/20 transition-all flex items-center justify-between group"
                      >
                        <span className="font-bold text-[var(--theme-primary)]">{char.name}</span>
                        <ChevronRight size={18} className="text-[var(--theme-accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))
                  ) : (
                    <p className="text-center py-8 text-[var(--theme-primary)]/40 italic">לא נמצאו דמויות בשאלונים</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <button 
                    onClick={() => setSelectedCharForPull(null)}
                    className="text-xs text-[var(--theme-accent)] font-bold mb-4 flex items-center gap-1 hover:underline"
                  >
                    <ChevronRight size={14} className="rotate-180" /> חזרה לרשימת הדמויות
                  </button>
                  <p className="text-sm text-[var(--theme-primary)]/60 mb-3">בחרו שדה לשליפה:</p>
                  {Object.entries(characters.find(c => c.id === selectedCharForPull)?.data || {}).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => {
                        const newArcs = [...characterArcs];
                        const { arcIndex, stepIndex } = pullingDataFor;
                        const currentText = newArcs[arcIndex].steps[stepIndex].text;
                        newArcs[arcIndex].steps[stepIndex].text = currentText && currentText !== 'תחילת הספר' 
                          ? `${currentText}\n\n${value}` 
                          : String(value);
                        onUpdateArcs(newArcs);
                        setPullingDataFor(null);
                      }}
                      className="w-full text-right p-4 rounded-2xl hover:bg-[var(--theme-accent)]/5 border border-transparent hover:border-[var(--theme-accent)]/20 transition-all"
                    >
                      <p className="text-xs font-bold text-[var(--theme-accent)] mb-1">{key}</p>
                      <p className="text-sm text-[var(--theme-primary)] line-clamp-2">{String(value)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlotStructure;
