import React, { useEffect, useState } from 'react';
import { Layout, CheckCircle2, Info, Link, FileText, X, ChevronRight, Sparkles, TrendingUp, Share2, Plus, Trash2, ArrowLeft, Users, Circle, Triangle, Square, Diamond, Hexagon } from 'lucide-react';
import { PlotStructureSubView, QuestionnaireEntry, Scene } from '../types';

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
    falseBelief?: string;
    finalGoal?: string;
    steps: { 
      id: string; 
      text: string;
      argument?: string;
      validation?: string;
      contradiction?: string;
    }[];
    sceneLinks?: {
      id: string;
      sceneId?: string;
      sceneName?: string;
      summary?: string;
      stepNumber?: number; // 1-indexed to match logic
      type?: 'argument' | 'validation' | 'contradiction';
    }[];
  }[];
  onUpdateArcs: (arcs: any[]) => void;
  characters: any[];
  relationships: any[];
  onUpdateRelationships: (rels: any[]) => void;
  onUpdateCharacters: (chars: any[]) => void;
  conflicts: any[];
  onUpdateConflicts: (conflicts: any[]) => void;
  initialSubView?: PlotStructureSubView;
  onSubViewChange?: (subView: PlotStructureSubView) => void;
  isLibrarySidebarCollapsed?: boolean;
}

const MultiScenePicker: React.FC<{
  links: { id: string; sceneId?: string; sceneName?: string }[];
  onUpdate: (newLinks: any[]) => void;
  scenes: Scene[];
  placeholder: string;
}> = ({ links = [], onUpdate, scenes = [], placeholder }) => {
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customName, setCustomName] = useState('');

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[24px]">
        {(links || []).map((link, idx) => (
          <div key={link.id} className="flex items-center gap-1.5 bg-white border border-[var(--theme-border)]/40 px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-sm group/chip">
            <span className="text-[var(--theme-primary)]">
              {link.sceneName || scenes.find(s => s.id === link.sceneId)?.title || '...'}
            </span>
            <button 
              onClick={() => onUpdate(links.filter((_, i) => i !== idx))}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {!isAddingCustom ? (
          <>
            <select
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                const scene = (scenes || []).find(s => s.id === e.target.value);
                onUpdate([...(links || []), { id: `link-${Date.now()}`, sceneId: e.target.value, sceneName: scene?.title }]);
              }}
              className="text-[11px] bg-white/80 border border-[var(--theme-border)]/30 rounded-lg px-2 py-1.5 outline-none flex-1 focus:ring-1 focus:ring-[var(--theme-accent)]/30 transition-all font-medium"
            >
              <option value="">{placeholder}</option>
              {(scenes || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            <button 
              onClick={() => setIsAddingCustom(true)}
              className="p-1.5 bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] rounded-lg hover:bg-[var(--theme-accent)]/20 transition-all"
              title="הוספה חופשית"
            >
              <Plus size={14} />
            </button>
          </>
        ) : (
          <div className="flex gap-1 flex-1">
            <input 
              autoFocus
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customName.trim()) {
                  onUpdate([...links, { id: `link-${Date.now()}`, sceneName: customName.trim() }]);
                  setCustomName('');
                  setIsAddingCustom(false);
                } else if (e.key === 'Escape') {
                  setIsAddingCustom(false);
                  setCustomName('');
                }
              }}
              placeholder="שם הסצנה..."
              className="text-[11px] bg-white border border-[var(--theme-border)]/30 rounded-lg px-2 py-1.5 outline-none flex-1 font-medium"
            />
            <button 
              onClick={() => {
                if (customName.trim()) {
                  onUpdate([...links, { id: `link-${Date.now()}`, sceneName: customName.trim() }]);
                  setCustomName('');
                  setIsAddingCustom(false);
                }
              }}
              className="px-2 py-1 bg-green-500 text-white rounded-lg text-[10px] font-bold"
            >
              הוסף
            </button>
            <button 
              onClick={() => setIsAddingCustom(false)}
              className="px-2 py-1 bg-gray-200 text-gray-600 rounded-lg text-[10px] font-bold"
            >
              ביטול
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const TrapezoidIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M6 5h12l4 14H2L6 5Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

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

const createPlanningCharacter = (id: string, name: string): QuestionnaireEntry => ({
  id,
  name,
  x: 200,
  y: 200,
  data: { gender: 'female' },
  customFields: []
});

interface RelationshipDynamicsTableProps {
  rel: any;
  relIndex: number;
  relationships: any[];
  onUpdateRelationships: (rels: any[]) => void;
  characters: any[];
  onUpdateCharacters: (chars: any[]) => void;
  scenes: Scene[];
}

const RelationshipDynamicsTable: React.FC<RelationshipDynamicsTableProps> = ({ 
  rel, 
  relIndex, 
  relationships, 
  onUpdateRelationships,
  characters,
  onUpdateCharacters,
  scenes
}) => {
  const tableWrapperRef = React.useRef<HTMLDivElement>(null);
  const cellRefs = React.useRef<Record<string, HTMLTableCellElement | null>>({});
  const [svgSize, setSvgSize] = React.useState({ width: 0, height: 0 });
  const dynamicSteps = rel.dynamicSteps || [];

  const updateSvgSize = React.useCallback(() => {
    const wrapper = tableWrapperRef.current;
    if (!wrapper) return;

    setSvgSize(current => {
      const next = {
        width: wrapper.clientWidth,
        height: wrapper.clientHeight
      };

      return current.width === next.width && current.height === next.height ? current : next;
    });
  }, []);

  React.useLayoutEffect(() => {
    updateSvgSize();

    const wrapper = tableWrapperRef.current;
    const resizeObserver = wrapper && typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateSvgSize)
      : null;

    if (wrapper && resizeObserver) {
      resizeObserver.observe(wrapper);
    }

    window.addEventListener('resize', updateSvgSize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateSvgSize);
    };
  }, [dynamicSteps.length, updateSvgSize]);

  const char1 = characters.find(c => c.id === rel.char1Id);
  const char2 = characters.find(c => c.id === rel.char2Id);

  const updateSteps = (newSteps: any[]) => {
    const newRels = [...relationships];
    newRels[relIndex] = { ...rel, dynamicSteps: newSteps };
    onUpdateRelationships(newRels);
  };

  const addRow = () => {
    const newRow = {
      id: `dyn-${Date.now()}`,
      sceneDescription: '',
      char1Position: null,
      char2Position: null,
      relevantScenes: ''
    };
    updateSteps([...dynamicSteps, newRow]);
  };

  const removeRow = (id: string) => {
    updateSteps(dynamicSteps.filter((s: any) => s.id !== id));
  };

  const handleCellClick = (stepIndex: number, char: 1 | 2, posIndex: number) => {
    const newSteps = [...dynamicSteps];
    const field = char === 1 ? 'char1Position' : 'char2Position';
    newSteps[stepIndex][field] = newSteps[stepIndex][field] === posIndex ? null : posIndex;
    updateSteps(newSteps);
  };

  const parseRelevantScenes = (value: string = '') => {
    const sceneIds = new Set((scenes || []).map(scene => scene.id));
    const parts = value
      .split(/\r?\n/)
      .map(part => part.trim())
      .filter(Boolean);

    return {
      selectedSceneIds: parts.filter(part => sceneIds.has(part)),
      legacyText: parts.filter(part => !sceneIds.has(part)).join('\n')
    };
  };

  const formatRelevantScenes = (selectedSceneIds: string[], legacyText: string) => {
    return [
      ...selectedSceneIds,
      ...legacyText
        .split(/\r?\n/)
        .map(part => part.trim())
        .filter(Boolean)
    ].join('\n');
  };

  const updateRelevantScenes = (stepIndex: number, selectedSceneIds: string[], legacyText: string) => {
    const newSteps = [...dynamicSteps];
    newSteps[stepIndex] = {
      ...newSteps[stepIndex],
      relevantScenes: formatRelevantScenes(selectedSceneIds, legacyText)
    };
    updateSteps(newSteps);
  };

  const handleRenameCharacter = (charId: string, newName: string, relIndex?: number, charNum?: 1 | 2) => {
    if (!charId && relIndex !== undefined && charNum !== undefined) {
      // Create new character if typing in an empty field
      const newCharId = `char-${Date.now()}`;
      const newChar = createPlanningCharacter(newCharId, newName);
      onUpdateCharacters([...characters, newChar]);
      
      const newRels = [...relationships];
      if (charNum === 1) newRels[relIndex].char1Id = newCharId;
      else newRels[relIndex].char2Id = newCharId;
      onUpdateRelationships(newRels);
      return;
    }
    if (!charId) return;
    const newChars = characters.map(c => c.id === charId ? { ...c, name: newName } : c);
    onUpdateCharacters(newChars);
  };

  const ROW_HEIGHT = 80;
  const getCellKey = (stepId: string, char: 1 | 2, posIndex: number) => `${stepId}-${char}-${posIndex}`;

  const getLinePoints = (char: 1 | 2) => {
    const wrapper = tableWrapperRef.current;
    if (!wrapper) return '';

    const wrapperRect = wrapper.getBoundingClientRect();
    const points: { x: number; y: number }[] = [];

    dynamicSteps.forEach((step: any, idx: number) => {
      const pos = char === 1 ? step.char1Position : step.char2Position;
      if (pos === null || pos === undefined) return;

      const cell = cellRefs.current[getCellKey(step.id, char, pos)];
      if (!cell) return;

      const cellRect = cell.getBoundingClientRect();
      points.push({
        x: cellRect.left - wrapperRect.left + (cellRect.width / 2),
        y: cellRect.top - wrapperRect.top + (cellRect.height / 2)
      });
    });

    return points.map(p => `${p.x},${p.y}`).join(' ');
  };

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xl font-bold handwritten text-3xl">טבלת דינמיקה והתקרבות</h4>
        <button
          onClick={addRow}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-accent)] text-white rounded-xl font-bold hover:bg-[var(--theme-accent)]/90 transition-all text-sm shadow-sm"
        >
          <Plus size={16} />
          הוספת שורה
        </button>
      </div>

      <div className="overflow-x-auto rounded-[2rem] border border-[var(--theme-border)]/50 shadow-sm bg-[var(--theme-card)]">
        <div ref={tableWrapperRef} className="relative min-w-[800px]">
          {/* SVG Layer for Lines */}
          <div className="absolute inset-0 pointer-events-none z-10">
            {svgSize.width > 0 && svgSize.height > 0 && (
              <svg
                className="w-full h-full"
                viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
                preserveAspectRatio="none"
              >
                {/* Lines for Char 1 (A) */}
                <polyline
                  points={getLinePoints(1)}
                  fill="none"
                  stroke="rgba(234, 179, 8, 0.7)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Lines for Char 2 (B) */}
                <polyline
                  points={getLinePoints(2)}
                  fill="none"
                  stroke="rgba(249, 115, 22, 0.7)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>

          <table className="w-full border-collapse">
            <thead>
              {/* Main Headers */}
              <tr className="text-center font-bold text-sm bg-[var(--theme-secondary)]/20">
                <th className="p-4 border-b border-l border-[var(--theme-border)]/30 w-[20%] bg-green-50/50">רשימת סצנות רלוונטיות</th>
                <th colSpan={3} className="p-4 border-b border-l border-[var(--theme-border)]/30 bg-yellow-50/50 relative">
                  <div className="flex flex-col gap-2 items-center">
                    <input 
                      value={char1?.name || ''} 
                      onChange={(e) => handleRenameCharacter(rel.char1Id, e.target.value, relIndex, 1)}
                      placeholder="שם דמות א..."
                      className="bg-white/50 border border-yellow-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-yellow-400 text-center font-bold w-full text-base shadow-sm hover:bg-white/70 transition-colors"
                    />
                    <select
                      value={rel.char1Id}
                      onChange={(e) => {
                        const newRels = [...relationships];
                        newRels[relIndex].char1Id = e.target.value;
                        onUpdateRelationships(newRels);
                      }}
                      className="text-[10px] bg-white/70 border border-yellow-200 rounded-lg px-2 py-1 outline-none"
                    >
                      <option value="">החלפת דמות...</option>
                      {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </th>
                <th colSpan={3} className="p-4 border-b border-l border-[var(--theme-border)]/30 bg-orange-50/50">
                  <div className="flex flex-col gap-2 items-center">
                    <input 
                      value={char2?.name || ''} 
                      onChange={(e) => handleRenameCharacter(rel.char2Id, e.target.value, relIndex, 2)}
                      placeholder="שם דמות ב..."
                      className="bg-white/50 border border-orange-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-400 text-center font-bold w-full text-base shadow-sm hover:bg-white/70 transition-colors"
                    />
                    <select
                      value={rel.char2Id}
                      onChange={(e) => {
                        const newRels = [...relationships];
                        newRels[relIndex].char2Id = e.target.value;
                        onUpdateRelationships(newRels);
                      }}
                      className="text-[10px] bg-white/70 border border-orange-200 rounded-lg px-2 py-1 outline-none"
                    >
                      <option value="">החלפת דמות...</option>
                      {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </th>
                <th className="p-4 border-b border-[var(--theme-border)]/30 w-[30%] bg-blue-50/50">מה קורה בסצנה?</th>
                <th className="p-4 border-b border-[var(--theme-border)]/30 w-10"></th>
              </tr>
              {/* Sub Headers */}
              <tr className="text-center text-[10px] font-black uppercase tracking-wider bg-[var(--theme-secondary)]/10">
                <th className="p-2 border-b border-l border-[var(--theme-border)]/30 bg-green-50/30"></th>
                <th className="p-2 border-b border-l border-[var(--theme-border)]/30 bg-yellow-50/30">רחוק</th>
                <th className="p-2 border-b border-l border-[var(--theme-border)]/30 bg-yellow-50/30">מתקרב</th>
                <th className="p-2 border-b border-l border-[var(--theme-border)]/30 bg-yellow-50/30 text-yellow-700">קרוב</th>
                <th className="p-2 border-b border-l border-[var(--theme-border)]/30 bg-orange-50/30 text-orange-700">קרוב</th>
                <th className="p-2 border-b border-l border-[var(--theme-border)]/30 bg-orange-50/30">מתקרב</th>
                <th className="p-2 border-b border-l border-[var(--theme-border)]/30 bg-orange-50/30">רחוק</th>
                <th className="p-2 border-b border-[var(--theme-border)]/30 bg-blue-50/30"></th>
                <th className="p-2 border-b border-[var(--theme-border)]/30"></th>
              </tr>
            </thead>
            <tbody>
              {dynamicSteps.map((step: any, idx: number) => {
                const { selectedSceneIds, legacyText } = parseRelevantScenes(step.relevantScenes || '');
                const selectedSceneIdSet = new Set(selectedSceneIds);
                const selectedScenes = selectedSceneIds
                  .map(sceneId => scenes.find(scene => scene.id === sceneId))
                  .filter(Boolean) as Scene[];
                const availableScenes = (scenes || []).filter(scene => !selectedSceneIdSet.has(scene.id));

                return (
              <tr key={step.id} className="group" style={{ height: `${ROW_HEIGHT}px` }}>
                {/* Relevant Scenes */}
                <td className="border-b border-l border-[var(--theme-border)]/30 p-2 bg-green-50/10">
                  <div className="flex h-full min-h-[72px] flex-col gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {selectedScenes.map(scene => (
                        <span
                          key={scene.id}
                          className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[var(--theme-border)]/40 bg-white/80 px-2 py-1 text-[11px] font-bold text-[var(--theme-primary)] shadow-sm"
                          title={scene.title}
                        >
                          <span className="truncate">{scene.title || 'סצנה ללא שם'}</span>
                          <button
                            type="button"
                            onClick={() => updateRelevantScenes(
                              idx,
                              selectedSceneIds.filter(sceneId => sceneId !== scene.id),
                              legacyText
                            )}
                            className="shrink-0 text-red-400 transition-colors hover:text-red-600"
                            aria-label={`הסרת ${scene.title || 'סצנה'}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>

                    <select
                      value=""
                      onChange={(e) => {
                        if (!e.target.value) return;
                        updateRelevantScenes(idx, [...selectedSceneIds, e.target.value], legacyText);
                      }}
                      className="w-full rounded-lg border border-[var(--theme-border)]/40 bg-white/80 px-2 py-1.5 text-[11px] font-bold text-[var(--theme-primary)] outline-none transition-all focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)]/20"
                    >
                      <option value="">
                        {availableScenes.length > 0 ? 'בחירת סצנה...' : 'אין סצנות נוספות'}
                      </option>
                      {availableScenes.map(scene => (
                        <option key={scene.id} value={scene.id}>
                          {scene.title || 'סצנה ללא שם'}
                        </option>
                      ))}
                    </select>

                    {legacyText && (
                      <textarea
                        dir="rtl"
                        value={legacyText}
                        onChange={(e) => updateRelevantScenes(idx, selectedSceneIds, e.target.value)}
                        className="min-h-[44px] w-full resize-y rounded-lg border border-[var(--theme-border)]/30 bg-white/50 px-2 py-1.5 text-[11px] text-[var(--theme-primary)] outline-none transition-all focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)]/20"
                      />
                    )}
                  </div>
                </td>

                {/* Char A Columns (Yellow) */}
                {[0, 1, 2].map(pos => (
                  <td 
                    key={`a-${pos}`}
                    ref={(node) => {
                      cellRefs.current[getCellKey(step.id, 1, pos)] = node;
                    }}
                    onClick={() => handleCellClick(idx, 1, pos)}
                    className="border-b border-l border-[var(--theme-border)]/30 p-0 cursor-pointer hover:bg-yellow-100/30 transition-colors relative bg-yellow-50/10 w-[8.33%]"
                  >
                    {step.char1Position === pos && (
                      <div className="absolute inset-0 flex items-center justify-center z-20">
                        <div className="w-4 h-4 rounded-full bg-yellow-600 shadow-md ring-4 ring-yellow-600/20" />
                      </div>
                    )}
                  </td>
                ))}

                {/* Char B Columns (Orange) */}
                {[0, 1, 2].map(pos => (
                  <td 
                    key={`b-${pos}`}
                    ref={(node) => {
                      cellRefs.current[getCellKey(step.id, 2, pos)] = node;
                    }}
                    onClick={() => handleCellClick(idx, 2, pos)}
                    className="border-b border-l border-[var(--theme-border)]/30 p-0 cursor-pointer hover:bg-orange-100/30 transition-colors relative bg-orange-50/10 w-[8.33%]"
                  >
                    {step.char2Position === pos && (
                      <div className="absolute inset-0 flex items-center justify-center z-20">
                        <div className="w-4 h-4 rounded-full bg-orange-500 shadow-md ring-4 ring-orange-500/20" />
                      </div>
                    )}
                  </td>
                ))}

                {/* Scene Description */}
                <td className="border-b border-l border-[var(--theme-border)]/30 p-2 bg-blue-50/10">
                  <textarea
                    value={step.sceneDescription}
                    onChange={(e) => {
                      const newSteps = [...dynamicSteps];
                      newSteps[idx].sceneDescription = e.target.value;
                      updateSteps(newSteps);
                    }}
                    placeholder="..."
                    className="w-full h-full bg-transparent border-none focus:ring-0 text-sm resize-none scrollbar-hide"
                  />
                </td>

                {/* Actions */}
                <td className="border-b border-[var(--theme-border)]/30 p-2 text-center">
                  <button
                    onClick={() => removeRow(step.id)}
                    className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {dynamicSteps.length === 0 && (
        <p className="text-center text-sm text-[var(--theme-primary)]/40 italic py-8 border-2 border-dashed border-[var(--theme-border)]/20 rounded-[2rem]">
          עדיין לא נוספו שורות לטבלת הדינמיקה. לחצו על "הוספת שורה" כדי להתחיל.
        </p>
      )}
    </div>
  );
};

const PlotStructure: React.FC<PlotStructureProps> = ({ 
  selectedStructure, 
  onSelect, 
  pointsData, 
  onUpdatePoint,
  customPlotPoints,
  onUpdateCustomPoints,
  characterArcs,
  onUpdateArcs,
  characters,
  relationships,
  onUpdateRelationships,
  onUpdateCharacters,
  conflicts = [],
  onUpdateConflicts,
  initialSubView,
  onSubViewChange,
  isLibrarySidebarCollapsed = false,
  scenes = []
}) => {
  const [activeSubView, setActiveSubView] = useState<PlotStructureSubView>(initialSubView || 'structure');
  const [editingPointId, setEditingPointId] = useState<string | null>(null);
  const [pullingDataFor, setPullingDataFor] = useState<{ arcIndex: number; stepIndex: number } | null>(null);
  const [selectedCharForPull, setSelectedCharForPull] = useState<string | null>(null);

  useEffect(() => {
    if (!initialSubView || initialSubView === activeSubView) return;
    setActiveSubView(initialSubView);
  }, [initialSubView, activeSubView]);

  const handleSubViewChange = (subView: PlotStructureSubView) => {
    setActiveSubView(subView);
    onSubViewChange?.(subView);
  };

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
  const createArcStep = (id = `step-${Date.now()}`) => ({
    id,
    text: '',
    argument: '',
    validation: '',
    contradiction: ''
  });
  const createCharacterArc = () => ({
    id: `arc-${Date.now()}`,
    characterName: '',
    falseBelief: '',
    finalGoal: '',
    steps: [createArcStep()],
    sceneLinks: []
  });
  const flattenedArcRows = (characterArcs || []).flatMap((arc: any, arcIndex: number) => {
    const steps = arc.steps?.length ? arc.steps : [createArcStep(`step-${arc.id}-empty`)];
    return steps.map((step: any, stepIndex: number) => ({ arc, arcIndex, step, stepIndex }));
  });
  const arcRows = flattenedArcRows.length > 0
    ? flattenedArcRows
    : [{ arc: { id: 'draft-arc', characterName: '', falseBelief: '', finalGoal: '', steps: [createArcStep('draft-step')], sceneLinks: [] }, arcIndex: -1, step: createArcStep('draft-step'), stepIndex: 0 }];
  const updateArcRow = (
    row: { arcIndex: number; stepIndex: number },
    updater: (arc: any, stepIndex: number) => void
  ) => {
    if (row.arcIndex < 0) {
      const newArc = createCharacterArc();
      updater(newArc, 0);
      onUpdateArcs([...(characterArcs || []), newArc]);
      return;
    }

    const newArcs = [...(characterArcs || [])];
    const arc = {
      ...newArcs[row.arcIndex],
      steps: [...(newArcs[row.arcIndex].steps || [])],
      sceneLinks: [...(newArcs[row.arcIndex].sceneLinks || [])]
    };
    while (!arc.steps[row.stepIndex]) {
      arc.steps.push(createArcStep());
    }
    updater(arc, row.stepIndex);
    newArcs[row.arcIndex] = arc;
    onUpdateArcs(newArcs);
  };
  const updateArcStepField = (
    row: { arcIndex: number; stepIndex: number },
    field: 'argument' | 'validation' | 'contradiction',
    value: string
  ) => {
    updateArcRow(row, (arc, stepIndex) => {
      arc.steps[stepIndex] = { ...arc.steps[stepIndex], [field]: value };
      if (field === 'argument') arc.steps[stepIndex].text = value;
    });
  };
  const getArcLinksForCell = (arc: any, stepIndex: number, type: 'argument' | 'validation' | 'contradiction') =>
    (arc.sceneLinks || []).filter((link: any) =>
      link.stepNumber === stepIndex + 1 && (link.type || 'argument') === type
    );
  const updateArcSceneLinks = (
    row: { arcIndex: number; stepIndex: number },
    type: 'argument' | 'validation' | 'contradiction',
    links: any[]
  ) => {
    updateArcRow(row, (arc, stepIndex) => {
      const stepNumber = stepIndex + 1;
      const otherLinks = (arc.sceneLinks || []).filter((link: any) =>
        !(link.stepNumber === stepNumber && (link.type || 'argument') === type)
      );
      arc.sceneLinks = [
        ...otherLinks,
        ...links.map((link: any) => ({
          ...link,
          id: link.id || `link-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          stepNumber,
          type
        }))
      ];
    });
  };
  const arcSceneSummaryRows = arcRows
    .flatMap((row: any, rowIndex: number) =>
      (row.arc.sceneLinks || [])
        .filter((link: any) => link.sceneId && link.stepNumber === row.stepIndex + 1)
        .map((link: any) => {
          const scene = scenes.find((s) => s.id === link.sceneId);
          const type = (link.type || 'argument') as 'argument' | 'validation' | 'contradiction';
          return scene ? { scene, type, rowNumber: rowIndex + 1, linkId: link.id } : null;
        })
        .filter(Boolean)
    )
    .sort((a: any, b: any) => {
      if (a.scene.position !== b.scene.position) return a.scene.position - b.scene.position;
      return (a.scene.title || '').localeCompare(b.scene.title || '');
    });
  const deleteArcRow = (row: { arcIndex: number; stepIndex: number }) => {
    if (row.arcIndex < 0) return;
    const newArcs = [...(characterArcs || [])];
    const arc = newArcs[row.arcIndex];
    const steps = arc.steps || [];
    const removedStepNumber = row.stepIndex + 1;

    if (steps.length <= 1) {
      onUpdateArcs(newArcs.filter((_: any, index: number) => index !== row.arcIndex));
      return;
    }

    newArcs[row.arcIndex] = {
      ...arc,
      steps: steps.filter((_: any, index: number) => index !== row.stepIndex),
      sceneLinks: (arc.sceneLinks || [])
        .filter((link: any) => link.stepNumber !== removedStepNumber)
        .map((link: any) => (
          link.stepNumber && link.stepNumber > removedStepNumber
            ? { ...link, stepNumber: link.stepNumber - 1 }
            : link
        ))
    };
    onUpdateArcs(newArcs);
  };
  const createConflictRow = (id = `row-${Date.now()}`) => ({
    id,
    goal: '',
    goalScenes: [],
    needReason: '',
    needReasonScenes: [],
    obstacle: '',
    obstacleScenes: [],
    resolution: '',
    resolutionScenes: []
  });
  const createConflict = () => ({
    id: `conflict-${Date.now()}`,
    title: '',
    characterName: '',
    rows: [createConflictRow()]
  });
  const flattenedConflictRows = (conflicts || []).flatMap((conflict: any, conflictIndex: number) => {
    const rows = conflict.rows?.length ? conflict.rows : [createConflictRow(`row-${conflict.id}-empty`)];
    return rows.map((row: any, rowIndex: number) => ({ conflict, conflictIndex, row, rowIndex }));
  });
  const conflictRows = flattenedConflictRows.length > 0
    ? flattenedConflictRows
    : [{ conflict: { id: 'draft-conflict', title: '', characterName: '', rows: [createConflictRow('draft-conflict-row')] }, conflictIndex: -1, row: createConflictRow('draft-conflict-row'), rowIndex: 0 }];
  const updateConflictRow = (
    rowRef: { conflictIndex: number; rowIndex: number },
    updater: (conflict: any, rowIndex: number) => void
  ) => {
    if (rowRef.conflictIndex < 0) {
      const newConflict = createConflict();
      updater(newConflict, 0);
      onUpdateConflicts([...(conflicts || []), newConflict]);
      return;
    }

    const newConflicts = [...(conflicts || [])];
    const conflict = {
      ...newConflicts[rowRef.conflictIndex],
      rows: [...(newConflicts[rowRef.conflictIndex].rows || [])]
    };
    while (!conflict.rows[rowRef.rowIndex]) {
      conflict.rows.push(createConflictRow());
    }
    updater(conflict, rowRef.rowIndex);
    newConflicts[rowRef.conflictIndex] = conflict;
    onUpdateConflicts(newConflicts);
  };
  const updateConflictRowField = (
    rowRef: { conflictIndex: number; rowIndex: number },
    field: 'goal' | 'needReason' | 'obstacle' | 'resolution',
    value: string
  ) => {
    updateConflictRow(rowRef, (conflict, rowIndex) => {
      conflict.rows[rowIndex] = { ...conflict.rows[rowIndex], [field]: value };
    });
  };
  const updateConflictSceneLinks = (
    rowRef: { conflictIndex: number; rowIndex: number },
    field: 'needReasonScenes' | 'obstacleScenes' | 'resolutionScenes',
    links: any[]
  ) => {
    updateConflictRow(rowRef, (conflict, rowIndex) => {
      conflict.rows[rowIndex] = { ...conflict.rows[rowIndex], [field]: links };
    });
  };
  const conflictSceneSummaryRows = conflictRows
    .flatMap((flatRow: any, rowNumber: number) => {
      const linksByType = [
        { type: 'needReason' as const, links: flatRow.row.needReasonScenes ?? flatRow.row.goalScenes ?? [] },
        { type: 'obstacle' as const, links: flatRow.row.obstacleScenes || [] },
        { type: 'resolution' as const, links: flatRow.row.resolutionScenes || [] }
      ];

      return linksByType.flatMap(({ type, links }) =>
        links
          .filter((link: any) => link.sceneId)
          .map((link: any) => {
            const scene = scenes.find((s) => s.id === link.sceneId);
            return scene ? { scene, type, rowNumber: rowNumber + 1, linkId: link.id } : null;
          })
          .filter(Boolean)
      );
    })
    .sort((a: any, b: any) => {
      if (a.scene.position !== b.scene.position) return a.scene.position - b.scene.position;
      return (a.scene.title || '').localeCompare(b.scene.title || '');
    });
  const deleteConflictRow = (rowRef: { conflictIndex: number; rowIndex: number }) => {
    if (rowRef.conflictIndex < 0) return;
    const newConflicts = [...(conflicts || [])];
    const conflict = newConflicts[rowRef.conflictIndex];
    const rows = conflict.rows || [];

    if (rows.length <= 1) {
      onUpdateConflicts(newConflicts.filter((_: any, index: number) => index !== rowRef.conflictIndex));
      return;
    }

    newConflicts[rowRef.conflictIndex] = {
      ...conflict,
      rows: rows.filter((_: any, index: number) => index !== rowRef.rowIndex)
    };
    onUpdateConflicts(newConflicts);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--theme-bg)] p-8 overflow-y-auto">
      <div className={`${isLibrarySidebarCollapsed ? 'max-w-7xl' : 'max-w-5xl'} mx-auto w-full space-y-8 pb-20`}>
        {/* Internal Sub-Navigation */}
        <div className="flex items-center justify-center gap-2 mb-8 bg-[var(--theme-secondary)]/30 p-2 rounded-3xl border border-[var(--theme-border)]/30 w-fit mx-auto">
          <button
            onClick={() => handleSubViewChange('structure')}
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
            onClick={() => handleSubViewChange('relationships')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeSubView === 'relationships'
                ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-lg'
                : 'text-[var(--theme-primary)]/60 hover:text-[var(--theme-primary)]'
            }`}
          >
            <Share2 size={18} />
            מערכת יחסים
          </button>
          <button
            onClick={() => handleSubViewChange('arc')}
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
            onClick={() => handleSubViewChange('conflicts')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeSubView === 'conflicts'
                ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-lg'
                : 'text-[var(--theme-primary)]/60 hover:text-[var(--theme-primary)]'
            }`}
          >
            <X size={18} />
            מניע ומטרה
          </button>
        </div>
        <div className="hidden">
          <button
            onClick={() => handleSubViewChange('structure')}
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
            onClick={() => handleSubViewChange('arc')}
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
            onClick={() => handleSubViewChange('relationships')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeSubView === 'relationships'
                ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-lg'
                : 'text-[var(--theme-primary)]/60 hover:text-[var(--theme-primary)]'
            }`}
          >
            <Share2 size={18} />
            מערכת יחסים
          </button>
          <button
            onClick={() => handleSubViewChange('conflicts')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeSubView === 'conflicts'
                ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-lg'
                : 'text-[var(--theme-primary)]/60 hover:text-[var(--theme-primary)]'
            }`}
          >
            <X size={18} />
            קונפליקטים
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
               לכל דמות, תהיה אמונה כלשהי שמובילה אותה בדרך. המציאות תעמת אותה מול האמונה הזו, והיא תנסה להלחם במציאות ותביא טיעונים לסיבה שהאמונה הזו, היא הנכונה. 
                <br />
                כל טיעון שנתייחס אליו במהלך הסיפור: 
                <br />
                נצטרך לוודא שהוא לא נטען 'באוויר'. 
                <br />
                נכתוב לו הוכחות. 
                <br />
                נצטרך לוודא שבסופו של דבר הוכח אחרת. בין אם בדיאלוגים, בין אם בהתרחשות שסותרת את הטיעון באופן מוחלט.
                בסוף הסיפור הדמות תגיע לתובנה חדשה, המבוססת על התהליך שעברה.
                <br />
                בטבלה השניה, תוכלו לעבור על התהליך, לכתוב את הסצנות הרלוונטיות, לוודא שכל טיעון נפתח, מוכח, ומופרך.
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[var(--theme-border)]/30 shadow-inner bg-white/50" dir="rtl">
              <table className={`w-full table-fixed border-collapse ${isLibrarySidebarCollapsed ? 'min-w-[1120px]' : 'min-w-[960px]'}`}>
                <colgroup>
                  <col className="w-14" />
                  <col className={isLibrarySidebarCollapsed ? 'w-[360px]' : 'w-[320px]'} />
                  <col className={isLibrarySidebarCollapsed ? 'w-[220px]' : 'w-[180px]'} />
                  <col className={isLibrarySidebarCollapsed ? 'w-[220px]' : 'w-[180px]'} />
                  <col className={isLibrarySidebarCollapsed ? 'w-[220px]' : 'w-[180px]'} />
                </colgroup>
                <thead>
                  <tr className="bg-[var(--theme-secondary)]/30 text-[10px] font-black uppercase tracking-wider text-[var(--theme-primary)]/60">
                    <th className="p-3 border-b border-l border-[var(--theme-border)]/30 text-center">#</th>
                    <th className="p-3 border-b border-l border-[var(--theme-border)]/30 text-center">דמות ואמונה שקרית</th>
                    <th className="p-3 border-b border-l border-[var(--theme-border)]/30 text-center leading-tight">
                      <div className="flex flex-col items-center gap-1">
                        <Square size={14} className="text-blue-500 fill-blue-500/20" />
                        <span>טיעון שמחזק את האמונה</span>
                      </div>
                    </th>
                    <th className="p-3 border-b border-l border-[var(--theme-border)]/30 text-center leading-tight">
                      <div className="flex flex-col items-center gap-1">
                        <Triangle size={14} className="text-orange-500 fill-orange-500/20" />
                        <span>אישור או הוכחה בסיפור</span>
                      </div>
                    </th>
                    <th className="p-3 border-b border-[var(--theme-border)]/30 text-center leading-tight">
                      <div className="flex flex-col items-center gap-1">
                        <Circle size={14} className="text-green-500 fill-green-500/20" />
                        <span>סתירה או הפרכה</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {arcRows.map((row: any, rowIndex: number) => (
                    <React.Fragment key={`${row.arc.id}-${row.step.id}-${row.stepIndex}`}>
                      <tr className="group hover:bg-[var(--theme-accent)]/5 transition-colors">
                        <td className="p-2 border-b border-l border-[var(--theme-border)]/30 text-center align-middle font-bold text-[var(--theme-primary)]/40">
                          <div className="flex flex-col items-center gap-1">
                            <span>{rowIndex + 1}</span>
                            <button
                              onClick={() => deleteArcRow(row)}
                              className="text-red-200 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all p-1"
                              title="מחיקת שורה"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                        <td className="p-3 border-b border-l border-[var(--theme-border)]/30 align-top bg-[var(--theme-accent)]/5">
                          <div className="space-y-3">
                            <input
                              value={row.arc.characterName || ''}
                              onChange={(e) => updateArcRow(row, (arc) => { arc.characterName = e.target.value; })}
                              className="w-full bg-white/60 border border-[var(--theme-border)]/30 rounded-xl px-3 py-2 text-sm font-bold text-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-accent)]/30 outline-none"
                              placeholder="שם הדמות"
                            />
                            <textarea
                              value={row.arc.falseBelief || ''}
                              onChange={(e) => updateArcRow(row, (arc) => { arc.falseBelief = e.target.value; })}
                              placeholder="האמונה השקרית..."
                              className="w-full bg-white/60 border border-[var(--theme-border)]/30 rounded-xl px-3 py-2 text-sm text-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-accent)]/30 outline-none resize-none h-24 scrollbar-hide"
                            />
                          </div>
                        </td>
                        <td className="p-3 border-b border-l border-[var(--theme-border)]/30 align-top">
                          <textarea
                            value={row.step.argument || row.step.text || ''}
                            onChange={(e) => updateArcStepField(row, 'argument', e.target.value)}
                            placeholder="..."
                            className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 resize-none h-28 scrollbar-hide"
                          />
                        </td>
                        <td className="p-3 border-b border-l border-[var(--theme-border)]/30 align-top">
                          <textarea
                            value={row.step.validation || ''}
                            onChange={(e) => updateArcStepField(row, 'validation', e.target.value)}
                            placeholder="..."
                            className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 resize-none h-28 scrollbar-hide"
                          />
                        </td>
                        <td className="p-3 border-b border-[var(--theme-border)]/30 align-top">
                          <textarea
                            value={row.step.contradiction || ''}
                            onChange={(e) => updateArcStepField(row, 'contradiction', e.target.value)}
                            placeholder="..."
                            className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 resize-none h-28 scrollbar-hide"
                          />
                        </td>
                      </tr>
                      <tr className="bg-[var(--theme-secondary)]/10">
                        <td className="p-2 border-b border-l border-[var(--theme-border)]/30"></td>
                        <td className="p-3 border-b border-l border-[var(--theme-border)]/30 text-[11px] font-bold text-[var(--theme-primary)]/45 align-top">
                          באילו סצנות זה מתרחש?
                        </td>
                        {(['argument', 'validation', 'contradiction'] as const).map((type) => (
                          <td key={type} className="p-3 border-b border-l border-[var(--theme-border)]/30 align-top">
                            <div className="space-y-2">
                              <p className="text-[10px] font-black text-[var(--theme-primary)]/45">באילו סצנות זה מתרחש?</p>
                              <MultiScenePicker
                                links={getArcLinksForCell(row.arc, row.stepIndex, type)}
                                onUpdate={(links) => updateArcSceneLinks(row, type, links)}
                                scenes={scenes}
                                placeholder="בחירת סצנה קיימת..."
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--theme-border)]/30 bg-white/40 shadow-sm" dir="rtl">
              <table className="w-full border-collapse">
                <thead className="bg-[var(--theme-secondary)]/30 text-[10px] font-black uppercase tracking-wider text-[var(--theme-primary)]/60">
                  <tr>
                    <th className="p-3 border-b border-l border-[var(--theme-border)]/30 text-right">סצנות</th>
                    <th className="p-3 border-b border-l border-[var(--theme-border)]/30 text-center w-36">צורה</th>
                    <th className="p-3 border-b border-[var(--theme-border)]/30 text-center w-28">שורה</th>
                  </tr>
                </thead>
                <tbody>
                  {arcSceneSummaryRows.length > 0 ? (
                    arcSceneSummaryRows.map((item: any) => (
                      <tr key={`${item.scene.id}-${item.type}-${item.rowNumber}-${item.linkId}`} className="hover:bg-[var(--theme-accent)]/5 transition-colors">
                        <td className="p-3 border-b border-l border-[var(--theme-border)]/30 text-sm font-bold text-[var(--theme-primary)]">
                          {item.scene.title}
                        </td>
                        <td className="p-3 border-b border-l border-[var(--theme-border)]/30">
                          <div className="flex items-center justify-center">
                            {item.type === 'argument' && <Square size={18} className="text-blue-500 fill-blue-500/20" />}
                            {item.type === 'validation' && <Triangle size={18} className="text-orange-500 fill-orange-500/20" />}
                            {item.type === 'contradiction' && <Circle size={18} className="text-green-500 fill-green-500/20" />}
                          </div>
                        </td>
                        <td className="p-3 border-b border-[var(--theme-border)]/30 text-center text-sm font-black text-[var(--theme-primary)]/70">
                          {item.rowNumber}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-sm text-[var(--theme-primary)]/35 italic">
                        עדיין לא שויכו סצנות לקשת ההתפתחות.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => onUpdateArcs([...(characterArcs || []), createCharacterArc()])}
                className="flex items-center gap-2 px-6 py-3 bg-[var(--theme-accent)] text-white rounded-2xl font-bold shadow-lg hover:scale-105 transition-all"
              >
                <Plus size={18} />
                הוספת שורת אמונה שקרית
              </button>
            </div>

            {false && (
            <>
            <div className="flex justify-center">
              <button
                onClick={() => {
                  const newArc = {
                    id: `arc-${Date.now()}`,
                    characterName: '',
                    falseBelief: '',
                    finalGoal: '',
                    steps: [
                      { id: `step-${Date.now()}`, argument: '', validation: '', contradiction: '', text: '' }
                    ]
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
              {(characterArcs || []).map((arc, arcIndex) => (
                <div key={arc.id} className="bg-[var(--theme-card)] rounded-[2rem] p-8 border border-[var(--theme-border)]/50 shadow-sm space-y-8">
                  <div className="flex items-center justify-between border-b border-[var(--theme-border)]/30 pb-6">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="bg-[var(--theme-accent)]/10 p-3 rounded-2xl text-[var(--theme-accent)]">
                        <TrendingUp size={24} />
                      </div>
                      <input
                        value={arc.characterName || ''}
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

                  {/* Character Arc Table */}
                  <div className="overflow-hidden rounded-2xl border border-[var(--theme-border)]/30 shadow-inner bg-white/50" dir="rtl">
                    <table className="w-full border-collapse">
                      <thead>
                        {/* Top Header: False Belief */}
                        <tr className="bg-[var(--theme-accent)]/10">
                          <th className="w-12 border-b border-l border-[var(--theme-border)]/30"></th>
                          <th colSpan={3} className="p-4 border-b border-[var(--theme-border)]/30 text-center font-bold text-[var(--theme-accent)]">
                            <div className="space-y-2">
                              <span className="text-sm uppercase tracking-widest block opacity-70">אמונה שקרית שמפריעה לגיבור להגיע ליעד</span>
                              <textarea
                                value={arc.falseBelief || ''}
                                onChange={(e) => {
                                  const newArcs = [...characterArcs];
                                  newArcs[arcIndex].falseBelief = e.target.value;
                                  onUpdateArcs(newArcs);
                                }}
                                placeholder="כתבו כאן את האמונה השקרית..."
                                className="w-full bg-transparent border-none focus:ring-0 text-center text-xl font-bold p-0 resize-none h-12 scrollbar-hide"
                              />
                            </div>
                          </th>
                        </tr>
                        {/* Middle Headers */}
                        <tr className="bg-[var(--theme-secondary)]/30 text-[10px] font-black uppercase tracking-wider text-[var(--theme-primary)]/60">
                          <th className="w-12 border-b border-l border-[var(--theme-border)]/30">#</th>
                          <th className="p-3 border-b border-l border-[var(--theme-border)]/30 text-center w-1/3 leading-tight">
                            <div className="flex flex-col items-center gap-1">
                              <Square size={14} className="text-blue-500 fill-blue-500/20" />
                              <span>טיעונים לאמונה השקרית.</span>
                            </div>
                            <span className="text-[9px] block opacity-60">
                              אמירות שהגיבור אומר לעצמו.
                            </span>
                          </th>
                          <th className="p-3 border-b border-l border-[var(--theme-border)]/30 text-center w-1/3 leading-tight">
                            <div className="flex flex-col items-center gap-1">
                              <Triangle size={14} className="text-orange-500 fill-orange-500/20" />
                              <span>הוכחות בתוך גוף הסיפור</span>
                            </div>
                            <span className="text-[9px] block opacity-60">
                              שמאמתות את הטענות.
                            </span>
                          </th>
                          <th className="p-3 border-b border-[var(--theme-border)]/30 text-center w-1/3 leading-tight">
                            <div className="flex flex-col items-center gap-1">
                              <Circle size={14} className="text-green-500 fill-green-500/20" />
                              <span>הוכחות נגד, בתוך גוף הסיפור.</span>
                            </div>
                            <span className="text-[9px] block opacity-60">
                              שמראות שהטענות לא נכונות והאמונה היא שקרית.
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(arc.steps || []).map((step: any, idx: number) => (
                          <tr key={step.id} className="group hover:bg-[var(--theme-accent)]/5 transition-colors">
                            {/* Counter and Remove */}
                            <td className="p-2 border-b border-l border-[var(--theme-border)]/30 text-center align-middle font-bold text-[var(--theme-primary)]/20">
                              <div className="flex flex-col items-center gap-1">
                                <span>{idx + 1}</span>
                                <button
                                  onClick={() => {
                                    const newArcs = [...characterArcs];
                                    newArcs[arcIndex].steps = newArcs[arcIndex].steps.filter((s: any) => s.id !== step.id);
                                    onUpdateArcs(newArcs);
                                  }}
                                  className="text-red-200 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all p-1"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </td>
                            {/* Arguments for False Belief */}
                            <td className="p-2 border-b border-l border-[var(--theme-border)]/30 align-top">
                              <textarea
                                value={step.argument || step.text || ''}
                                onChange={(e) => {
                                  const newArcs = [...characterArcs];
                                  const val = e.target.value;
                                  newArcs[arcIndex].steps[idx].argument = val;
                                  newArcs[arcIndex].steps[idx].text = val; // fallback for legacy
                                  onUpdateArcs(newArcs);
                                }}
                                placeholder="..."
                                className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 resize-none h-24 scrollbar-hide"
                              />
                            </td>
                            {/* Validation Evidence */}
                            <td className="p-2 border-b border-l border-[var(--theme-border)]/30 align-top">
                              <textarea
                                value={step.validation || ''}
                                onChange={(e) => {
                                  const newArcs = [...characterArcs];
                                  newArcs[arcIndex].steps[idx].validation = e.target.value;
                                  onUpdateArcs(newArcs);
                                }}
                                placeholder="..."
                                className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 resize-none h-24 scrollbar-hide"
                              />
                            </td>
                            {/* Evidence Against */}
                            <td className="p-2 border-b border-[var(--theme-border)]/30 align-top">
                              <textarea
                                value={step.contradiction || ''}
                                onChange={(e) => {
                                  const newArcs = [...characterArcs];
                                  newArcs[arcIndex].steps[idx].contradiction = e.target.value;
                                  onUpdateArcs(newArcs);
                                }}
                                placeholder="..."
                                className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 resize-none h-24 scrollbar-hide"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        {/* Final Goal Footer */}
                        <tr className="bg-[var(--theme-accent)]/5">
                          <td className="p-2 text-center border-l border-[var(--theme-border)]/30 align-middle">
                            <button
                              onClick={() => {
                                const newArcs = [...characterArcs];
                                if (!newArcs[arcIndex].steps) newArcs[arcIndex].steps = [];
                                newArcs[arcIndex].steps.push({ 
                                  id: `step-${Date.now()}`, 
                                  argument: '', 
                                  validation: '', 
                                  contradiction: '',
                                  text: '' 
                                });
                                onUpdateArcs(newArcs);
                              }}
                              className="w-8 h-8 rounded-full bg-[var(--theme-accent)] text-white flex items-center justify-center hover:scale-110 transition-all shadow-sm mx-auto"
                              title="הוספת שורה"
                            >
                              <Plus size={18} />
                            </button>
                          </td>
                          <td colSpan={3} className="p-4 text-center font-bold text-[var(--theme-accent)]">
                             <div className="space-y-2">
                              <span className="text-sm uppercase tracking-widest block opacity-70">היעד שאליו יגיע הגיבור בסוף הספר</span>
                               <textarea
                                value={arc.finalGoal || ''}
                                onChange={(e) => {
                                  const newArcs = [...characterArcs];
                                  newArcs[arcIndex].finalGoal = e.target.value;
                                  onUpdateArcs(newArcs);
                                }}
                                placeholder="כתבו כאן את היעד הסופי..."
                                className="w-full bg-transparent border-none focus:ring-0 text-center text-xl font-bold p-0 resize-none h-12 scrollbar-hide"
                              />
                            </div>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Scene Mapping Table */}
                  <div className="space-y-4" dir="rtl">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-lg handwritten">מיפוי סצנות לקשת ההתפתחות</h5>
                      <button
                        onClick={() => {
                          const newArcs = [...characterArcs];
                          if (!newArcs[arcIndex].sceneLinks) newArcs[arcIndex].sceneLinks = [];
                          newArcs[arcIndex].sceneLinks.push({
                            id: `link-${Date.now()}`,
                            sceneName: '',
                            summary: '',
                            stepNumber: 1,
                            type: 'argument'
                          });
                          onUpdateArcs(newArcs);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] rounded-lg font-bold hover:bg-[var(--theme-accent)]/20 transition-all text-sm"
                      >
                         <Plus size={14} />
                         הוספת סצנה
                      </button>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-[var(--theme-border)]/30 shadow-sm bg-white/30">
                      <table className="w-full border-collapse">
                        <thead className="bg-[var(--theme-secondary)]/20 text-[10px] font-black uppercase tracking-wider text-[var(--theme-primary)]/60">
                          <tr>
                            <th className="p-3 border-b border-l border-[var(--theme-border)]/30 text-center w-12">#</th>
                            <th className="p-3 border-b border-l border-[var(--theme-border)]/30 text-right w-1/4">שם הסצנה / קישור</th>
                            <th className="p-3 border-b border-l border-[var(--theme-border)]/30 text-right w-1/2">תמצית המתרחש בסצנה</th>
                            <th className="p-3 border-b border-l border-[var(--theme-border)]/30 text-center w-32">שיוך לשלב</th>
                            <th className="p-3 border-b border-[var(--theme-border)]/30 w-12"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(arc.sceneLinks || []).map((link: any, linkIdx: number) => (
                            <tr key={link.id} className="group hover:bg-[var(--theme-accent)]/5 transition-colors">
                              <td className="p-2 border-b border-l border-[var(--theme-border)]/30 text-center align-middle font-bold text-[var(--theme-primary)]/20">
                                {linkIdx + 1}
                              </td>
                              {/* Scene Name / Picker */}
                              <td className="p-2 border-b border-l border-[var(--theme-border)]/30 align-top">
                                <div className="space-y-1">
                                  <input 
                                    value={link.sceneName || (scenes.find(s => s.id === link.sceneId)?.title || '')}
                                    onChange={(e) => {
                                      const newArcs = [...characterArcs];
                                      const links = newArcs[arcIndex].sceneLinks;
                                      if (links) {
                                        links[linkIdx].sceneName = e.target.value;
                                        links[linkIdx].sceneId = undefined;
                                      }
                                      onUpdateArcs(newArcs);
                                    }}
                                    placeholder="שם הסצנה..."
                                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold p-0"
                                  />
                                  <select
                                    value={link.sceneId || ''}
                                    onChange={(e) => {
                                      const scene = scenes.find(s => s.id === e.target.value);
                                      const newArcs = [...characterArcs];
                                      const links = newArcs[arcIndex].sceneLinks;
                                      if (links) {
                                        links[linkIdx].sceneId = e.target.value;
                                        links[linkIdx].sceneName = scene?.title || '';
                                      }
                                      onUpdateArcs(newArcs);
                                    }}
                                    className="text-[10px] bg-white/50 border border-[var(--theme-border)]/20 rounded-md px-1 py-0.5 outline-none w-full"
                                  >
                                    <option value="">קישור לסצנה קיימת...</option>
                                    {scenes.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                  </select>
                                </div>
                              </td>
                              {/* Summary */}
                              <td className="p-2 border-b border-l border-[var(--theme-border)]/30 align-top">
                                <textarea
                                  value={link.summary || ''}
                                  onChange={(e) => {
                                    const newArcs = [...characterArcs];
                                    const links = newArcs[arcIndex].sceneLinks;
                                    if (links) {
                                      links[linkIdx].summary = e.target.value;
                                    }
                                    onUpdateArcs(newArcs);
                                  }}
                                  placeholder="מה קורה בסצנה?"
                                  className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 resize-none h-12 scrollbar-hide"
                                />
                              </td>
                              {/* Association: Step # and Icon */}
                              <td className="p-2 border-b border-l border-[var(--theme-border)]/30 text-center align-middle">
                                <div className="flex items-center justify-center gap-2">
                                  <select
                                    value={link.stepNumber || 1}
                                    onChange={(e) => {
                                      const newArcs = [...characterArcs];
                                      const links = newArcs[arcIndex].sceneLinks;
                                      if (links) {
                                        links[linkIdx].stepNumber = parseInt(e.target.value);
                                      }
                                      onUpdateArcs(newArcs);
                                    }}
                                    className="text-xs bg-white border border-[var(--theme-border)]/30 rounded px-1 py-0.5"
                                  >
                                    {arc.steps.map((_: any, sidx: number) => (
                                      <option key={sidx} value={sidx + 1}>{sidx + 1}</option>
                                    ))}
                                  </select>
                                  <div className="flex items-center gap-1 bg-[var(--theme-secondary)]/10 p-1 rounded-lg">
                                    <button 
                                      onClick={() => {
                                        const newArcs = [...characterArcs];
                                        const links = newArcs[arcIndex].sceneLinks;
                                        if (links) {
                                          links[linkIdx].type = 'argument';
                                        }
                                        onUpdateArcs(newArcs);
                                      }}
                                      className={`p-1 rounded transition-all ${link.type === 'argument' || !link.type ? 'bg-blue-500 text-white shadow-sm' : 'text-blue-500/40 hover:bg-blue-500/10'}`}
                                      title="טיעון"
                                    >
                                      <Square size={14} className={link.type === 'argument' || !link.type ? 'fill-white/20' : ''} />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        const newArcs = [...characterArcs];
                                        const links = newArcs[arcIndex].sceneLinks;
                                        if (links) {
                                          links[linkIdx].type = 'validation';
                                        }
                                        onUpdateArcs(newArcs);
                                      }}
                                      className={`p-1 rounded transition-all ${link.type === 'validation' ? 'bg-orange-500 text-white shadow-sm' : 'text-orange-500/40 hover:bg-orange-500/10'}`}
                                      title="הוכחה"
                                    >
                                      <Triangle size={14} className={link.type === 'validation' ? 'fill-white/20' : ''} />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        const newArcs = [...characterArcs];
                                        const links = newArcs[arcIndex].sceneLinks;
                                        if (links) {
                                          links[linkIdx].type = 'contradiction';
                                        }
                                        onUpdateArcs(newArcs);
                                      }}
                                      className={`p-1 rounded transition-all ${link.type === 'contradiction' ? 'bg-green-500 text-white shadow-sm' : 'text-green-500/40 hover:bg-green-500/10'}`}
                                      title="הוכחת נגד"
                                    >
                                      <Circle size={14} className={link.type === 'contradiction' ? 'fill-white/20' : ''} />
                                    </button>
                                  </div>
                                </div>
                              </td>
                              {/* Remove */}
                              <td className="p-2 border-b border-[var(--theme-border)]/30 text-center align-middle">
                                <button
                                  onClick={() => {
                                    const newArcs = [...characterArcs];
                                    const links = newArcs[arcIndex].sceneLinks;
                                    if (links) {
                                      newArcs[arcIndex].sceneLinks = links.filter((_: any, i: number) => i !== linkIdx);
                                    }
                                    onUpdateArcs(newArcs);
                                  }}
                                  className="text-red-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all p-1"
                                >
                                  <X size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {(arc.sceneLinks || []).length === 0 && (
                        <div className="p-4 text-center text-xs text-[var(--theme-primary)]/30 italic">
                          עדיין לא שויכו סצנות לקשת זו.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {characterArcs.length === 0 && (
                <div className="text-center py-20 opacity-40">
                  <p className="handwritten text-3xl">עדיין לא נוספו דמויות לקשת ההתפתחות</p>
                </div>
              )}
            </div>
            </>
            )}
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
                    steps: [{ id: `step-${Date.now()}`, track1Text: 'התחלה', track2Text: 'התחלה', isMerged: false }],
                    questionnaire: {
                      sharedAnswers: {},
                      personalAnswers: {},
                      participantGenders: {}
                    }
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
              {(relationships || []).map((rel, relIndex) => (
                <div key={rel.id} className="bg-[var(--theme-card)] rounded-[2rem] p-8 border border-[var(--theme-border)]/50 shadow-sm space-y-8">
                  <div className="flex items-center justify-between border-b border-[var(--theme-border)]/30 pb-6">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex flex-col gap-1 w-[200px]">
                        <input 
                          value={characters.find(c => c.id === rel.char1Id)?.name || ''} 
                          onChange={(e) => {
                            const newName = e.target.value;
                            if (!rel.char1Id) {
                                const newCharId = `char-${Date.now()}-1`;
                                const newChar = createPlanningCharacter(newCharId, newName);
                                onUpdateCharacters([...characters, newChar]);
                                const newRels = [...relationships];
                                newRels[relIndex].char1Id = newCharId;
                                onUpdateRelationships(newRels);
                            } else {
                                const newChars = characters.map(c => c.id === rel.char1Id ? { ...c, name: newName } : c);
                                onUpdateCharacters(newChars);
                            }
                          }}
                          placeholder="שם דמות 1..."
                          className="bg-[var(--theme-secondary)]/20 border-b-2 border-transparent focus:border-[var(--theme-accent)] focus:ring-0 text-[var(--theme-primary)] font-bold text-lg px-2 py-1 rounded-t-lg transition-all"
                        />
                        <select
                          value={rel.char1Id}
                          onChange={(e) => {
                            const newRels = [...relationships];
                            newRels[relIndex].char1Id = e.target.value;
                            onUpdateRelationships(newRels);
                          }}
                          className="bg-[var(--theme-secondary)]/30 border-none rounded-lg px-2 py-1 text-[10px] focus:ring-1 focus:ring-[var(--theme-accent)]"
                        >
                          <option value="">החלפת דמות...</option>
                          {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>

                      <div className="text-[var(--theme-accent)]">
                        <Users size={20} />
                      </div>

                      <div className="flex flex-col gap-1 w-[200px]">
                        <input 
                          value={characters.find(c => c.id === rel.char2Id)?.name || ''} 
                          onChange={(e) => {
                            const newName = e.target.value;
                            if (!rel.char2Id) {
                                const newCharId = `char-${Date.now()}-2`;
                                const newChar = createPlanningCharacter(newCharId, newName);
                                onUpdateCharacters([...characters, newChar]);
                                const newRels = [...relationships];
                                newRels[relIndex].char2Id = newCharId;
                                onUpdateRelationships(newRels);
                            } else {
                                const newChars = characters.map(c => c.id === rel.char2Id ? { ...c, name: newName } : c);
                                onUpdateCharacters(newChars);
                            }
                          }}
                          placeholder="שם דמות 2..."
                          className="bg-[var(--theme-secondary)]/20 border-b-2 border-transparent focus:border-[var(--theme-accent)] focus:ring-0 text-[var(--theme-primary)] font-bold text-lg px-2 py-1 rounded-t-lg transition-all"
                        />
                        <select
                          value={rel.char2Id}
                          onChange={(e) => {
                            const newRels = [...relationships];
                            newRels[relIndex].char2Id = e.target.value;
                            onUpdateRelationships(newRels);
                          }}
                          className="bg-[var(--theme-secondary)]/30 border-none rounded-lg px-2 py-1 text-[10px] focus:ring-1 focus:ring-[var(--theme-accent)]"
                        >
                          <option value="">החלפת דמות...</option>
                          {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                  </div>

                  <div className="space-y-4">
                    <h4 className="handwritten text-3xl font-bold text-[var(--theme-primary)]">
                      דינמיקת מערכת היחסים לאורך העלילה
                    </h4>
                    <RelationshipDynamicsTable 
                      rel={rel} 
                      relIndex={relIndex} 
                      relationships={relationships} 
                      onUpdateRelationships={onUpdateRelationships} 
                      characters={characters}
                      onUpdateCharacters={onUpdateCharacters}
                      scenes={scenes}
                    />
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
        ) : activeSubView === 'conflicts' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
             {/* Explanation Space */}
             <div className="bg-[var(--theme-accent)]/5 p-8 rounded-[2rem] border border-[var(--theme-accent)]/20 [&>div:nth-child(3)]:hidden">
               <div className="flex items-center gap-3 mb-4 text-[var(--theme-accent)] [&>h3:last-child]:hidden">
                 <X size={20} />
                 <h3 className="text-xl font-bold handwritten text-3xl">מטרות, בעיות והישגים</h3>
                 <h3 className="text-xl font-bold handwritten text-3xl">ניהול קונפליקטים</h3>
               </div>
               <div className="text-[var(--theme-primary)]/70 leading-relaxed italic">
                 קונפליקט הוא המנוע של הדרמה. כאן תוכלו לרכז את כל המכשולים, הבעיות והעימותים שיש לדמויות שלכם.
                 <br />
                 לכל קונפליקט, תוכלו למפות את המטרה, המכשול והפתרון - ולשייך לכל אחד מהם את הסצנות הרלוונטיות.
               </div>
             </div>

             <div className="overflow-x-auto rounded-2xl border border-[var(--theme-border)]/30 shadow-inner bg-white/50" dir="rtl">
               <table className={`w-full table-fixed border-collapse ${isLibrarySidebarCollapsed ? 'min-w-[1120px]' : 'min-w-[960px]'}`}>
                 <colgroup>
                   <col className="w-14" />
                   <col className={isLibrarySidebarCollapsed ? 'w-[360px]' : 'w-[320px]'} />
                   <col className={isLibrarySidebarCollapsed ? 'w-[220px]' : 'w-[180px]'} />
                   <col className={isLibrarySidebarCollapsed ? 'w-[220px]' : 'w-[180px]'} />
                   <col className={isLibrarySidebarCollapsed ? 'w-[220px]' : 'w-[180px]'} />
                 </colgroup>
                 <thead>
                   <tr className="bg-[var(--theme-secondary)]/30 text-[10px] font-black uppercase tracking-wider text-[var(--theme-primary)]/60">
                     <th className="p-3 border-b border-l border-[var(--theme-border)]/30 text-center">#</th>
                     <th className="p-3 border-b border-l border-[var(--theme-border)]/30 text-center">המטרה של X - שם הדמות</th>
                     <th className="p-3 border-b border-l border-[var(--theme-border)]/30 text-center leading-tight">
                       <div className="flex flex-col items-center gap-1">
                         <Diamond size={14} className="text-purple-500 fill-purple-500/20" />
                         <span>טיעונים - למה היא נצרכת</span>
                       </div>
                     </th>
                     <th className="p-3 border-b border-l border-[var(--theme-border)]/30 text-center leading-tight">
                       <div className="flex flex-col items-center gap-1">
                         <TrapezoidIcon size={14} className="text-rose-500" />
                         <span>בעיה - מה מפריע להשגת המטרה</span>
                       </div>
                     </th>
                     <th className="p-3 border-b border-[var(--theme-border)]/30 text-center leading-tight">
                       <div className="flex flex-col items-center gap-1">
                         <Hexagon size={14} className="text-cyan-500 fill-cyan-500/20" />
                         <span>הישג - השלבים בדרך לפתרון ולהצלחה</span>
                       </div>
                     </th>
                   </tr>
                 </thead>
                 <tbody>
                   {conflictRows.map((flatRow: any, flatIndex: number) => {
                     const characterName = flatRow.conflict.characterName ?? flatRow.conflict.title ?? '';
                     const needReasonScenes = flatRow.row.needReasonScenes ?? flatRow.row.goalScenes ?? [];

                     return (
                       <React.Fragment key={`${flatRow.conflict.id}-${flatRow.row.id}-${flatRow.rowIndex}`}>
                         <tr className="group hover:bg-[var(--theme-accent)]/5 transition-colors">
                           <td className="p-2 border-b border-l border-[var(--theme-border)]/30 text-center align-middle font-bold text-[var(--theme-primary)]/40">
                             <div className="flex flex-col items-center gap-1">
                               <span>{flatIndex + 1}</span>
                               <button
                                 onClick={() => deleteConflictRow(flatRow)}
                                 className="text-red-200 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all p-1"
                                 title="מחיקת שורה"
                               >
                                 <Trash2 size={13} />
                               </button>
                             </div>
                           </td>
                           <td className="p-3 border-b border-l border-[var(--theme-border)]/30 align-top bg-[var(--theme-accent)]/5">
                             <div className="space-y-3">
                               {characterName && (
                                 <p className="text-[10px] font-black text-[var(--theme-primary)]/45">המטרה של {characterName}</p>
                               )}
                               <input
                                 value={characterName}
                                 onChange={(e) => updateConflictRow(flatRow, (conflict) => { conflict.characterName = e.target.value; })}
                                 className="w-full bg-white/60 border border-[var(--theme-border)]/30 rounded-xl px-3 py-2 text-sm font-bold text-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-accent)]/30 outline-none"
                                 placeholder="שם הדמות..."
                               />
                               <textarea
                                 value={flatRow.row.goal || ''}
                                 onChange={(e) => updateConflictRowField(flatRow, 'goal', e.target.value)}
                                 placeholder="מה המטרה שלה?"
                                 className="w-full bg-white/60 border border-[var(--theme-border)]/30 rounded-xl px-3 py-2 text-sm text-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-accent)]/30 outline-none resize-none h-24 scrollbar-hide"
                               />
                             </div>
                           </td>
                           <td className="p-3 border-b border-l border-[var(--theme-border)]/30 align-top">
                             <textarea
                               value={flatRow.row.needReason || ''}
                               onChange={(e) => updateConflictRowField(flatRow, 'needReason', e.target.value)}
                               placeholder="למה המטרה חשובה או נצרכת לדמות?"
                               className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 resize-none h-28 scrollbar-hide"
                             />
                           </td>
                           <td className="p-3 border-b border-l border-[var(--theme-border)]/30 align-top">
                             <textarea
                               value={flatRow.row.obstacle || ''}
                               onChange={(e) => updateConflictRowField(flatRow, 'obstacle', e.target.value)}
                               placeholder="מה מפריע להשגת המטרה?"
                               className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 resize-none h-28 scrollbar-hide"
                             />
                           </td>
                           <td className="p-3 border-b border-[var(--theme-border)]/30 align-top">
                             <textarea
                               value={flatRow.row.resolution || ''}
                               onChange={(e) => updateConflictRowField(flatRow, 'resolution', e.target.value)}
                               placeholder="אילו הישגים ושלבים מובילים לפתרון?"
                               className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 resize-none h-28 scrollbar-hide"
                             />
                           </td>
                         </tr>
                         <tr className="bg-[var(--theme-secondary)]/10">
                           <td className="p-2 border-b border-l border-[var(--theme-border)]/30"></td>
                           <td className="p-3 border-b border-l border-[var(--theme-border)]/30 text-[11px] font-bold text-[var(--theme-primary)]/45 align-top"></td>
                           <td className="p-3 border-b border-l border-[var(--theme-border)]/30 align-top">
                             <p className="text-[10px] font-black text-[var(--theme-primary)]/45 mb-2">באילו סצנות זה מתרחש?</p>
                             <MultiScenePicker
                               links={needReasonScenes}
                               onUpdate={(links) => updateConflictSceneLinks(flatRow, 'needReasonScenes', links)}
                               scenes={scenes}
                               placeholder="בחירת סצנה קיימת..."
                             />
                           </td>
                           <td className="p-3 border-b border-l border-[var(--theme-border)]/30 align-top">
                             <p className="text-[10px] font-black text-[var(--theme-primary)]/45 mb-2">באילו סצנות זה מתרחש?</p>
                             <MultiScenePicker
                               links={flatRow.row.obstacleScenes || []}
                               onUpdate={(links) => updateConflictSceneLinks(flatRow, 'obstacleScenes', links)}
                               scenes={scenes}
                               placeholder="בחירת סצנה קיימת..."
                             />
                           </td>
                           <td className="p-3 border-b border-[var(--theme-border)]/30 align-top">
                             <p className="text-[10px] font-black text-[var(--theme-primary)]/45 mb-2">באילו סצנות זה מתרחש?</p>
                             <MultiScenePicker
                               links={flatRow.row.resolutionScenes || []}
                               onUpdate={(links) => updateConflictSceneLinks(flatRow, 'resolutionScenes', links)}
                               scenes={scenes}
                               placeholder="בחירת סצנה קיימת..."
                             />
                           </td>
                         </tr>
                       </React.Fragment>
                     );
                   })}
                 </tbody>
               </table>
             </div>

             <div className="overflow-hidden rounded-2xl border border-[var(--theme-border)]/30 bg-white/40 shadow-sm" dir="rtl">
               <table className="w-full border-collapse">
                 <thead className="bg-[var(--theme-secondary)]/30 text-[10px] font-black uppercase tracking-wider text-[var(--theme-primary)]/60">
                   <tr>
                     <th className="p-3 border-b border-l border-[var(--theme-border)]/30 text-right">סצנות</th>
                     <th className="p-3 border-b border-l border-[var(--theme-border)]/30 text-center w-36">צורה</th>
                     <th className="p-3 border-b border-[var(--theme-border)]/30 text-center w-28">שורה</th>
                   </tr>
                 </thead>
                 <tbody>
                   {conflictSceneSummaryRows.length > 0 ? (
                     conflictSceneSummaryRows.map((item: any) => (
                       <tr key={`${item.scene.id}-${item.type}-${item.rowNumber}-${item.linkId}`} className="hover:bg-[var(--theme-accent)]/5 transition-colors">
                         <td className="p-3 border-b border-l border-[var(--theme-border)]/30 text-sm font-bold text-[var(--theme-primary)]">
                           {item.scene.title}
                         </td>
                         <td className="p-3 border-b border-l border-[var(--theme-border)]/30">
                           <div className="flex items-center justify-center">
                             {item.type === 'needReason' && <Diamond size={18} className="text-purple-500 fill-purple-500/20" />}
                             {item.type === 'obstacle' && <TrapezoidIcon size={18} className="text-rose-500" />}
                             {item.type === 'resolution' && <Hexagon size={18} className="text-cyan-500 fill-cyan-500/20" />}
                           </div>
                         </td>
                         <td className="p-3 border-b border-[var(--theme-border)]/30 text-center text-sm font-black text-[var(--theme-primary)]/70">
                           {item.rowNumber}
                         </td>
                       </tr>
                     ))
                   ) : (
                     <tr>
                       <td colSpan={3} className="p-6 text-center text-sm text-[var(--theme-primary)]/35 italic">
                         עדיין לא שויכו סצנות למניע ומטרה.
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>

             <div className="flex justify-center">
               <button
                 onClick={() => onUpdateConflicts([...(conflicts || []), createConflict()])}
                 className="flex items-center gap-2 px-6 py-3 bg-[var(--theme-accent)] text-white rounded-2xl font-bold shadow-lg hover:scale-105 transition-all"
               >
                 <Plus size={18} />
                 הוספת שורת מטרה
               </button>
             </div>

             {false && (
             <>
             <div className="flex justify-center">
               <button
                 onClick={() => {
                   const newConflict = {
                     id: `conflict-${Date.now()}`,
                     title: '',
                     rows: [
                       {
                         id: `row-${Date.now()}`,
                         goal: '',
                         goalScenes: [],
                         obstacle: '',
                         obstacleScenes: [],
                         resolution: '',
                         resolutionScenes: []
                       }
                     ]
                   };
                   onUpdateConflicts([newConflict, ...conflicts]);
                 }}
                 className="flex items-center gap-2 px-8 py-4 bg-[var(--theme-accent)] text-white rounded-2xl font-bold shadow-lg hover:scale-105 transition-all"
               >
                 <Plus size={20} />
                 הוספת קונפליקט חדש
               </button>
             </div>

             <div className="space-y-12">
               {(conflicts || []).map((conflict, conflictIndex) => (
                 <div key={conflict.id} className="bg-[var(--theme-card)] rounded-[2rem] p-8 border border-[var(--theme-border)]/50 shadow-sm space-y-8">
                   <div className="flex items-center justify-between border-b border-[var(--theme-border)]/30 pb-6">
                     <div className="flex items-center gap-4 flex-1">
                       <span className="text-lg font-bold text-[var(--theme-primary)]/60 handwritten">שם הקונפליקט:</span>
                       <input
                         value={conflict.title || ''}
                         onChange={(e) => {
                           const newConflicts = [...conflicts];
                           newConflicts[conflictIndex].title = e.target.value;
                           onUpdateConflicts(newConflicts);
                         }}
                         className="text-2xl font-bold bg-transparent border-none focus:ring-0 p-0 text-[var(--theme-primary)] handwritten text-4xl flex-1"
                         placeholder="..."
                       />
                     </div>
                     <button
                       onClick={() => {
                         const newConflicts = conflicts.filter((c: any) => c.id !== conflict.id);
                         onUpdateConflicts(newConflicts);
                       }}
                       className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-colors"
                       title="מחיקת קונפליקט"
                     >
                       <Trash2 size={20} />
                     </button>
                   </div>

                   <div className="space-y-6" dir="rtl">
                     <div className="overflow-hidden rounded-2xl border border-[var(--theme-border)]/30 shadow-sm bg-white/30">
                       <table className="w-full border-collapse">
                         <thead className="bg-[var(--theme-secondary)]/20 text-xs font-bold text-[var(--theme-primary)]/80">
                           <tr>
                             <th className="p-4 border-b border-l border-[var(--theme-border)]/30 text-right w-1/3">מטרה</th>
                             <th className="p-4 border-b border-l border-[var(--theme-border)]/30 text-right w-1/3">מה מפריע להשיג את המטרה</th>
                             <th className="p-4 border-b border-[var(--theme-border)]/30 text-right w-1/3">איך נפתרת הבעיה</th>
                           </tr>
                         </thead>
                         <tbody>
                           {(conflict?.rows || []).map((row: any, rowIdx: number) => (
                             <React.Fragment key={row?.id || rowIdx}>
                               <tr className="bg-white/40">
                                 <td className="p-4 border-b border-l border-[var(--theme-border)]/30 align-top">
                                   <textarea
                                     value={row.goal || ''}
                                     onChange={(e) => {
                                       const newConflicts = [...conflicts];
                                       newConflicts[conflictIndex].rows[rowIdx].goal = e.target.value;
                                       onUpdateConflicts(newConflicts);
                                     }}
                                     placeholder="הגדרת המטרה..."
                                     className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 resize-none h-20 scrollbar-hide"
                                   />
                                 </td>
                                 <td className="p-4 border-b border-l border-[var(--theme-border)]/30 align-top">
                                   <textarea
                                     value={row.obstacle || ''}
                                     onChange={(e) => {
                                       const newConflicts = [...conflicts];
                                       newConflicts[conflictIndex].rows[rowIdx].obstacle = e.target.value;
                                       onUpdateConflicts(newConflicts);
                                     }}
                                     placeholder="מה מונע את השגת המטרה?"
                                     className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 resize-none h-20 scrollbar-hide"
                                   />
                                 </td>
                                 <td className="p-4 border-b border-[var(--theme-border)]/30 align-top">
                                   <textarea
                                     value={row.resolution || ''}
                                     onChange={(e) => {
                                       const newConflicts = [...conflicts];
                                       newConflicts[conflictIndex].rows[rowIdx].resolution = e.target.value;
                                       onUpdateConflicts(newConflicts);
                                     }}
                                     placeholder="איך מסתיים הקונפליקט?"
                                     className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 resize-none h-20 scrollbar-hide"
                                   />
                                 </td>
                               </tr>
                               <tr className="bg-[var(--theme-accent)]/5 group/row">
                                 <td className="p-4 border-b border-l border-[var(--theme-border)]/30 align-top">
                                   <div className="text-[10px] uppercase font-black tracking-widest text-[var(--theme-primary)]/40 mb-2 font-sans">באילו סצנות מופיעה?</div>
                                   <MultiScenePicker
                                     links={row?.goalScenes || []}
                                     onUpdate={(newLinks) => {
                                       const newConflicts = [...(conflicts || [])];
                                       newConflicts[conflictIndex].rows[rowIdx].goalScenes = newLinks;
                                       onUpdateConflicts(newConflicts);
                                     }}
                                     scenes={scenes || []}
                                     placeholder="שיוך סצנה..."
                                   />
                                 </td>
                                 <td className="p-4 border-b border-l border-[var(--theme-border)]/30 align-top">
                                   <div className="text-[10px] uppercase font-black tracking-widest text-[var(--theme-primary)]/40 mb-2 font-sans">באילו סצנות מופיעה?</div>
                                   <MultiScenePicker
                                     links={row?.obstacleScenes || []}
                                     onUpdate={(newLinks) => {
                                       const newConflicts = [...(conflicts || [])];
                                       newConflicts[conflictIndex].rows[rowIdx].obstacleScenes = newLinks;
                                       onUpdateConflicts(newConflicts);
                                     }}
                                     scenes={scenes || []}
                                     placeholder="שיוך סצנה..."
                                   />
                                 </td>
                                 <td className="p-4 border-b border-[var(--theme-border)]/30 align-top relative">
                                   <div className="text-[10px] uppercase font-black tracking-widest text-[var(--theme-primary)]/40 mb-2 font-sans">באילו סצנות מופיעה?</div>
                                   <MultiScenePicker
                                     links={row?.resolutionScenes || []}
                                     onUpdate={(newLinks) => {
                                       const newConflicts = [...(conflicts || [])];
                                       newConflicts[conflictIndex].rows[rowIdx].resolutionScenes = newLinks;
                                       onUpdateConflicts(newConflicts);
                                     }}
                                     scenes={scenes || []}
                                     placeholder="שיוך סצנה..."
                                   />
                                   {(conflict?.rows?.length || 0) > 1 && (
                                     <button
                                       onClick={() => {
                                         const newConflicts = [...conflicts];
                                         newConflicts[conflictIndex].rows = newConflicts[conflictIndex].rows.filter((_: any, i: number) => i !== rowIdx);
                                         onUpdateConflicts(newConflicts);
                                       }}
                                       className="absolute bottom-2 left-2 p-1 text-red-300 hover:text-red-500 opacity-0 group-hover/row:opacity-100 transition-opacity"
                                       title="מחיקת שורה"
                                     >
                                       <Trash2 size={14} />
                                     </button>
                                   )}
                                 </td>
                               </tr>
                             </React.Fragment>
                           ))}
                         </tbody>
                       </table>
                     </div>
                     <div className="flex justify-center">
                        <button
                          onClick={() => {
                            const newConflicts = [...conflicts];
                            if (!newConflicts[conflictIndex].rows) {
                              newConflicts[conflictIndex].rows = [];
                            }
                            newConflicts[conflictIndex].rows.push({
                              id: `row-${Date.now()}`,
                              goal: '',
                              goalScenes: [],
                              obstacle: '',
                              obstacleScenes: [],
                              resolution: '',
                              resolutionScenes: []
                            });
                            onUpdateConflicts(newConflicts);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] rounded-xl font-bold hover:bg-[var(--theme-accent)]/20 transition-all text-sm"
                        >
                          <Plus size={16} />
                          הוספת שורת מטרה לקונפליקט
                        </button>
                     </div>
                   </div>
                 </div>
               ))}

               {conflicts.length === 0 && (
                 <div className="text-center py-20 opacity-40">
                   <p className="handwritten text-3xl">עדיין לא נוספו קונפליקטים</p>
                 </div>
               )}
             </div>
             </>
             )}
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

      {false && (
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
                    (characters || []).map(char => (
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
                  {Object.entries((characters || []).find(c => c.id === selectedCharForPull)?.data || {}).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => {
                        const newArcs = [...characterArcs];
                        const { arcIndex, stepIndex } = pullingDataFor!;
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
