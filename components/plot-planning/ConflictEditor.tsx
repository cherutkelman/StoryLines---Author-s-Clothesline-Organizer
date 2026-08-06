import React from 'react';
import { Info, Plus, Trash2 } from 'lucide-react';
import { CharacterEntry, Scene } from '../../types';
import MultiScenePicker from './MultiScenePicker';
import CharacterLinkSelect from './CharacterLinkSelect';
import { getCharacterLinkedRowDisplayName, normalizeCharacterLinkOnEdit } from './characterLinkedRow';

interface ConflictEditorProps {
  conflicts: any[];
  onUpdateConflicts: (conflicts: any[]) => void;
  scenes: Scene[];
  characters: CharacterEntry[];
  isLibrarySidebarCollapsed: boolean;
}

const uniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const createConflictRow = (id = uniqueId('row')) => ({
  id,
  goal: '',
  goalScenes: [],
  needReason: '',
  needReasonScenes: [],
  obstacle: '',
  obstacleScenes: [],
  resolution: '',
  resolutionScenes: [],
});
const createResult = (id = uniqueId('result')) => ({ id, text: '', scenes: [] });
const createConflict = () => ({
  id: uniqueId('conflict'),
  title: '',
  characterName: '',
  rows: [createConflictRow()],
  finalGoal: '',
  finalGoalScenes: [],
  results: [createResult()],
});

const getRows = (conflict: any) => conflict.rows?.length ? conflict.rows : [createConflictRow(`row-${conflict.id}-default`)];
const getResults = (conflict: any) => conflict.results?.length ? conflict.results : [createResult(`result-${conflict.id}-default`)];

const ConflictEditor: React.FC<ConflictEditorProps> = ({ conflicts, onUpdateConflicts, scenes, characters, isLibrarySidebarCollapsed }) => {
  const items = conflicts || [];
  const inputClass = 'w-full bg-white/70 border border-[var(--theme-border)]/30 rounded-xl px-3 py-2 text-sm text-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-accent)]/30 outline-none resize-y min-h-16';

  const updateConflict = (conflictIndex: number, updater: (conflict: any) => void) => {
    const next = [...items];
    const conflict = {
      ...normalizeCharacterLinkOnEdit(next[conflictIndex], characters),
      rows: [...getRows(next[conflictIndex])],
      results: [...getResults(next[conflictIndex])],
      finalGoalScenes: [...(next[conflictIndex].finalGoalScenes || [])],
    };
    updater(conflict);
    next[conflictIndex] = conflict;
    onUpdateConflicts(next);
  };

  const updateRow = (conflictIndex: number, rowIndex: number, updates: Record<string, unknown>) => updateConflict(conflictIndex, conflict => {
    conflict.rows[rowIndex] = { ...conflict.rows[rowIndex], ...updates };
  });

  const addReasonGroup = (conflictIndex: number) => updateConflict(conflictIndex, conflict => conflict.rows.push(createConflictRow()));
  const deleteReasonGroup = (conflictIndex: number, rowIndex: number) => updateConflict(conflictIndex, conflict => {
    if (conflict.rows.length > 1) conflict.rows = conflict.rows.filter((_: any, index: number) => index !== rowIndex);
  });
  const addResult = (conflictIndex: number) => updateConflict(conflictIndex, conflict => conflict.results.push(createResult()));
  const deleteResult = (conflictIndex: number, resultIndex: number) => updateConflict(conflictIndex, conflict => {
    if (conflict.results.length > 1) conflict.results = conflict.results.filter((_: any, index: number) => index !== resultIndex);
  });

  const picker = (links: any[], onUpdate: (links: any[]) => void) => (
    <MultiScenePicker links={links || []} onUpdate={onUpdate} scenes={scenes} placeholder="בחירת סצנה..." />
  );

  const sceneSummary = items.flatMap((conflict: any) => {
    const rows = getRows(conflict);
    const firstRow = rows[0];
    const entries: any[] = [
      { label: 'מטרה בתחילת הספר', links: firstRow.goalScenes || [] },
      ...rows.flatMap((row: any, index: number) => [
        { label: `סיבה ${index + 1}`, links: row.needReasonScenes || [] },
        { label: `בעיה ${index + 1}`, links: row.obstacleScenes || [] },
        { label: `פתרון ${index + 1}`, links: row.resolutionScenes || [] },
      ]),
      { label: 'המטרה שהושגה בסוף הספר', links: conflict.finalGoalScenes || [] },
      ...getResults(conflict).map((result: any, index: number) => ({ label: `תוצאה ${index + 1}`, links: result.scenes || [] })),
    ];
    return entries.flatMap(entry => entry.links.map((link: any) => {
      const scene = scenes.find(candidate => candidate.id === link.sceneId);
      return scene ? { scene, label: entry.label, conflict, linkId: link.id } : null;
    }).filter(Boolean));
  }).sort((a: any, b: any) => a.scene.position - b.scene.position);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-[var(--theme-accent)]/5 p-8 rounded-[2rem] border border-[var(--theme-accent)]/20">
        <div className="flex items-center gap-3 mb-4 text-[var(--theme-accent)]">
          <Info size={20} />
          <h3 className="text-xl font-bold handwritten text-3xl">מניע ומטרה</h3>
        </div>
        <p className="text-[var(--theme-primary)]/70 leading-relaxed italic">
          הגדירו את מטרת הדמות בתחילת הספר, את הסיבות שמניעות אותה, את הבעיות והפתרונות שבדרך, ולבסוף את המטרה שהושגה ואת תוצאותיה.
        </p>
      </div>

      {items.map((conflict: any, conflictIndex: number) => {
        const rows = getRows(conflict);
        const results = getResults(conflict);
        const firstRow = rows[0];
        return (
          <div key={conflict.id} className="overflow-x-auto rounded-2xl border border-[var(--theme-border)]/40 bg-white/50 shadow-sm" dir="rtl">
            <table className={`w-full table-fixed border-collapse ${isLibrarySidebarCollapsed ? 'min-w-[900px]' : 'min-w-[760px]'}`}>
              <colgroup>
                <col className="w-[14%]" />
                <col className="w-[70%]" />
                <col className="w-[16%]" />
              </colgroup>
              <thead className="bg-[var(--theme-secondary)]/30 text-sm font-black text-[var(--theme-primary)]/70">
                <tr>
                  <th className="p-3 border-b border-l border-[var(--theme-border)]/40">שם הדמות</th>
                  <th className="p-3 border-b border-l border-[var(--theme-border)]/40">
                    <div className="flex items-center gap-2">
                      <CharacterLinkSelect
                        row={conflict}
                        characters={characters}
                        onChange={characterId => updateConflict(conflictIndex, next => {
                          if (characterId) next.characterId = characterId;
                          else {
                            delete next.characterId;
                            next.characterName = '';
                          }
                        })}
                        ariaLabel="בחירת דמות לטבלת המטרות"
                      />
                      <button onClick={() => onUpdateConflicts(items.filter((_: any, index: number) => index !== conflictIndex))} className="p-2 text-red-300 hover:text-red-500" title="מחיקת טבלת מטרה"><Trash2 size={16} /></button>
                    </div>
                  </th>
                  <th className="p-3 border-b border-[var(--theme-border)]/40">באיזו סצנה זה מופיע</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border-b border-l border-[var(--theme-border)]/30 font-black text-[var(--theme-accent)]">מטרה בתחילת הספר</td>
                  <td className="p-3 border-b border-l border-[var(--theme-border)]/30">
                    <textarea value={firstRow.goal || ''} onChange={event => updateRow(conflictIndex, 0, { goal: event.target.value })} className={inputClass} placeholder="מה המטרה של הדמות?" />
                  </td>
                  <td className="p-3 border-b border-[var(--theme-border)]/30 align-top">{picker(firstRow.goalScenes || [], links => updateRow(conflictIndex, 0, { goalScenes: links }))}</td>
                </tr>

                {rows.map((row: any, rowIndex: number) => (
                  <tr key={row.id}>
                    <td className="p-0 border-b border-l border-[var(--theme-border)]/30 font-bold text-[var(--theme-primary)]/70">
                      <div className="grid grid-cols-[2.5rem_1fr] min-h-60">
                        <div className="row-span-3 flex items-center justify-center border-l border-[var(--theme-border)]/30 text-lg font-black">{rowIndex + 1}</div>
                        <div className="flex items-center justify-between gap-1 px-2 py-3 border-b border-[var(--theme-border)]/30">
                          <span>סיבה</span>
                          {rows.length > 1 && <button onClick={() => deleteReasonGroup(conflictIndex, rowIndex)} className="p-1 text-red-300 hover:text-red-500" title="מחיקת הקבוצה"><Trash2 size={14} /></button>}
                        </div>
                        <div className="px-2 py-3 border-b border-[var(--theme-border)]/30">בעיה</div>
                        <div className="px-2 py-3">פתרון</div>
                      </div>
                    </td>
                    <td className="p-3 border-b border-l border-[var(--theme-border)]/30">
                      <div className="grid grid-rows-3 gap-3">
                        <textarea value={row.needReason || ''} onChange={event => updateRow(conflictIndex, rowIndex, { needReason: event.target.value })} className={inputClass} placeholder="למה המטרה חשובה לדמות?" />
                        <textarea value={row.obstacle || ''} onChange={event => updateRow(conflictIndex, rowIndex, { obstacle: event.target.value })} className={inputClass} placeholder="מה מפריע להשגת המטרה?" />
                        <textarea value={row.resolution || ''} onChange={event => updateRow(conflictIndex, rowIndex, { resolution: event.target.value })} className={inputClass} placeholder="איך הדמות מתגברת על הבעיה?" />
                      </div>
                    </td>
                    <td className="p-3 border-b border-[var(--theme-border)]/30 align-top">
                      <div className="grid grid-rows-3 gap-3">
                        <div>{picker(row.needReasonScenes || row.goalScenes || [], links => updateRow(conflictIndex, rowIndex, { needReasonScenes: links }))}</div>
                        <div>{picker(row.obstacleScenes || [], links => updateRow(conflictIndex, rowIndex, { obstacleScenes: links }))}</div>
                        <div>{picker(row.resolutionScenes || [], links => updateRow(conflictIndex, rowIndex, { resolutionScenes: links }))}</div>
                      </div>
                    </td>
                  </tr>
                ))}

                <tr className="bg-[var(--theme-secondary)]/10">
                  <td className="p-3 border-b border-l border-[var(--theme-border)]/30">
                    <button onClick={() => addReasonGroup(conflictIndex)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] text-xs font-bold text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]"><Plus size={15} /> הוספת סיבה, בעיה ופתרון</button>
                  </td>
                  <td className="border-b border-l border-[var(--theme-border)]/30" />
                  <td className="border-b border-[var(--theme-border)]/30" />
                </tr>

                <tr className="bg-[var(--theme-accent)]/5">
                  <td className="p-3 border-b border-l border-[var(--theme-border)]/30 font-black text-[var(--theme-accent)]">המטרה שהושגה בסוף הספר</td>
                  <td className="p-3 border-b border-l border-[var(--theme-border)]/30">
                    <textarea value={conflict.finalGoal || ''} onChange={event => updateConflict(conflictIndex, next => { next.finalGoal = event.target.value; })} className={inputClass} placeholder="מה השיגה הדמות בסוף הספר?" />
                  </td>
                  <td className="p-3 border-b border-[var(--theme-border)]/30 align-top">{picker(conflict.finalGoalScenes || [], links => updateConflict(conflictIndex, next => { next.finalGoalScenes = links; }))}</td>
                </tr>

                {results.map((result: any, resultIndex: number) => (
                  <tr key={result.id}>
                    <td className="p-0 border-b border-l border-[var(--theme-border)]/30 font-bold text-[var(--theme-primary)]/70">
                      <div className="grid grid-cols-[2.5rem_1fr] min-h-20">
                        <div className="flex items-center justify-center border-l border-[var(--theme-border)]/30 text-lg font-black">{resultIndex + 1}</div>
                        <div className="flex items-center justify-between gap-1 px-2 py-3">
                          <span>תוצאה</span>
                          {results.length > 1 && <button onClick={() => deleteResult(conflictIndex, resultIndex)} className="p-1 text-red-300 hover:text-red-500" title="מחיקת תוצאה"><Trash2 size={14} /></button>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 border-b border-l border-[var(--theme-border)]/30">
                      <textarea value={result.text || ''} onChange={event => updateConflict(conflictIndex, next => { next.results[resultIndex] = { ...next.results[resultIndex], text: event.target.value }; })} className={inputClass} placeholder="מה התוצאה?" />
                    </td>
                    <td className="p-3 border-b border-[var(--theme-border)]/30 align-top">{picker(result.scenes || [], links => updateConflict(conflictIndex, next => { next.results[resultIndex] = { ...next.results[resultIndex], scenes: links }; }))}</td>
                  </tr>
                ))}

                <tr className="bg-[var(--theme-secondary)]/10">
                  <td className="p-3 border-l border-[var(--theme-border)]/30">
                    <button onClick={() => addResult(conflictIndex)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] text-sm font-bold text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]"><Plus size={16} /> הוספת תוצאה</button>
                  </td>
                  <td className="border-l border-[var(--theme-border)]/30" />
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}

      {items.length === 0 && <div className="rounded-2xl border-2 border-dashed border-[var(--theme-border)]/40 p-10 text-center text-[var(--theme-primary)]/45">עדיין לא נוצרה טבלת מטרה.</div>}

      <div className="overflow-hidden rounded-2xl border border-[var(--theme-border)]/30 bg-white/40 shadow-sm" dir="rtl">
        <table className="w-full border-collapse">
          <thead className="bg-[var(--theme-secondary)]/30 text-sm font-black text-[var(--theme-primary)]/60">
            <tr>
              <th className="p-3 border-b border-l border-[var(--theme-border)]/30 text-right">סצנה</th>
              <th className="p-3 border-b border-l border-[var(--theme-border)]/30 text-right">שלב במטרה</th>
              <th className="p-3 border-b border-[var(--theme-border)]/30 text-right">דמות</th>
            </tr>
          </thead>
          <tbody>
            {sceneSummary.length ? sceneSummary.map((item: any) => (
              <tr key={`${item.linkId}-${item.scene.id}`}>
                <td className="p-3 border-b border-l border-[var(--theme-border)]/30 text-sm font-bold">{item.scene.title}</td>
                <td className="p-3 border-b border-l border-[var(--theme-border)]/30 text-sm">{item.label}</td>
                <td className="p-3 border-b border-[var(--theme-border)]/30 text-sm">{getCharacterLinkedRowDisplayName(item.conflict, characters)}</td>
              </tr>
            )) : <tr><td colSpan={3} className="p-6 text-center text-sm text-[var(--theme-primary)]/35 italic">עדיין לא שויכו סצנות למניע ולמטרה.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center">
        <button onClick={() => onUpdateConflicts([...items, createConflict()])} className="flex items-center gap-2 px-6 py-3 bg-[var(--theme-accent)] text-white rounded-2xl font-bold shadow-lg hover:scale-105 transition-all">
          <Plus size={18} /> הוספת טבלת מטרה
        </button>
      </div>
    </div>
  );
};

export default ConflictEditor;
