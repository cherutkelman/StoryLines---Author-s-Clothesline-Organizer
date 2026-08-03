import React from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, FileText, Info, Layout, Link, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { Scene } from '../../types';
import {
  FIVE_ACT_POINTS,
  HEROS_JOURNEY_POINTS,
  SEVEN_ACT_POINTS,
  STRUCTURES,
  THREE_ACT_POINTS,
} from './plotPlanningDefinitions';

interface PlotStructureEditorProps {
  selectedStructure: string | undefined;
  onSelect: (id: string) => void;
  scenes: Scene[];
  pointsData: Record<string, { sceneId?: string; description?: string }>;
  onUpdatePoint: (pointId: string, data: { sceneId?: string; description?: string }) => void;
  customPlotPoints: { id: string; label: string; x: number; y: number }[];
  onUpdateCustomPoints: (points: { id: string; label: string; x: number; y: number }[]) => void;
  editingPointId: string | null;
  setEditingPointId: React.Dispatch<React.SetStateAction<string | null>>;
}

const PlotStructureEditor: React.FC<PlotStructureEditorProps> = ({
  selectedStructure,
  onSelect,
  scenes,
  pointsData,
  onUpdatePoint,
  customPlotPoints,
  onUpdateCustomPoints,
  editingPointId,
  setEditingPointId,
}) => {
  const activePoints = selectedStructure === 'three-acts' ? THREE_ACT_POINTS :
    selectedStructure === 'five-acts' ? FIVE_ACT_POINTS :
    selectedStructure === 'seven-acts' ? SEVEN_ACT_POINTS :
    selectedStructure === 'heros-journey' ? HEROS_JOURNEY_POINTS :
    selectedStructure === 'custom' ? (customPlotPoints.length > 0 ? customPlotPoints : [
      { id: 'custom-start', label: 'התחלה', x: 700, y: 350 },
      { id: 'custom-end', label: 'סיום', x: 100, y: 350 },
    ]) : [];
  const activePoint = editingPointId ? activePoints.find(point => point.id === editingPointId) : null;
  const activeData = editingPointId ? pointsData[editingPointId] || {} : {};

  return (
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
  );
};

export default PlotStructureEditor;
