import React from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { QuestionnaireEntry, Scene } from '../../types';
import { createCharacterEntry } from '../../src/characters/characterFactory';

export const createPlanningCharacter = (name: string): QuestionnaireEntry =>
  createCharacterEntry({ name });

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
      const newChar = createPlanningCharacter(newName);
      onUpdateCharacters([...characters, newChar]);
      
      const newRels = [...relationships];
      if (charNum === 1) newRels[relIndex].char1Id = newChar.id;
      else newRels[relIndex].char2Id = newChar.id;
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


export default RelationshipDynamicsTable;
