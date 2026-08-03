import React from 'react';
import { Diamond, Hexagon, Plus, Trash2, X } from 'lucide-react';
import { Scene } from '../../types';
import MultiScenePicker from './MultiScenePicker';
import { TrapezoidIcon } from './PlotPlanningIcons';

interface ConflictEditorProps {
  conflicts: any[];
  onUpdateConflicts: (conflicts: any[]) => void;
  scenes: Scene[];
  isLibrarySidebarCollapsed: boolean;
}

const createConflictRow = (id = `row-${Date.now()}`) => ({ id, goal: '', goalScenes: [], needReason: '', needReasonScenes: [], obstacle: '', obstacleScenes: [], resolution: '', resolutionScenes: [] });
const createConflict = () => ({ id: `conflict-${Date.now()}`, title: '', characterName: '', rows: [createConflictRow()] });

const ConflictEditor: React.FC<ConflictEditorProps> = ({ conflicts, onUpdateConflicts, scenes, isLibrarySidebarCollapsed }) => {
  const flattenedConflictRows = (conflicts || []).flatMap((conflict: any, conflictIndex: number) => {
    const rows = conflict.rows?.length ? conflict.rows : [createConflictRow(`row-${conflict.id}-empty`)];
    return rows.map((row: any, rowIndex: number) => ({ conflict, conflictIndex, row, rowIndex }));
  });
  const conflictRows = flattenedConflictRows.length > 0 ? flattenedConflictRows : [{ conflict: { id: 'draft-conflict', title: '', characterName: '', rows: [createConflictRow('draft-conflict-row')] }, conflictIndex: -1, row: createConflictRow('draft-conflict-row'), rowIndex: 0 }];
  const updateConflictRow = (rowRef: { conflictIndex: number; rowIndex: number }, updater: (conflict: any, rowIndex: number) => void) => {
    if (rowRef.conflictIndex < 0) {
      const newConflict = createConflict();
      updater(newConflict, 0);
      onUpdateConflicts([...(conflicts || []), newConflict]);
      return;
    }
    const newConflicts = [...(conflicts || [])];
    const conflict = { ...newConflicts[rowRef.conflictIndex], rows: [...(newConflicts[rowRef.conflictIndex].rows || [])] };
    while (!conflict.rows[rowRef.rowIndex]) conflict.rows.push(createConflictRow());
    updater(conflict, rowRef.rowIndex);
    newConflicts[rowRef.conflictIndex] = conflict;
    onUpdateConflicts(newConflicts);
  };
  const updateConflictRowField = (rowRef: { conflictIndex: number; rowIndex: number }, field: 'goal' | 'needReason' | 'obstacle' | 'resolution', value: string) =>
    updateConflictRow(rowRef, (conflict, rowIndex) => { conflict.rows[rowIndex] = { ...conflict.rows[rowIndex], [field]: value }; });
  const updateConflictSceneLinks = (rowRef: { conflictIndex: number; rowIndex: number }, field: 'needReasonScenes' | 'obstacleScenes' | 'resolutionScenes', links: any[]) =>
    updateConflictRow(rowRef, (conflict, rowIndex) => { conflict.rows[rowIndex] = { ...conflict.rows[rowIndex], [field]: links }; });
  const conflictSceneSummaryRows = conflictRows.flatMap((flatRow: any, rowNumber: number) => [
    { type: 'needReason' as const, links: flatRow.row.needReasonScenes ?? flatRow.row.goalScenes ?? [] },
    { type: 'obstacle' as const, links: flatRow.row.obstacleScenes || [] },
    { type: 'resolution' as const, links: flatRow.row.resolutionScenes || [] },
  ].flatMap(({ type, links }) => links.filter((link: any) => link.sceneId).map((link: any) => {
    const scene = scenes.find(candidate => candidate.id === link.sceneId);
    return scene ? { scene, type, rowNumber: rowNumber + 1, linkId: link.id } : null;
  }).filter(Boolean))).sort((a: any, b: any) => a.scene.position !== b.scene.position ? a.scene.position - b.scene.position : (a.scene.title || '').localeCompare(b.scene.title || ''));
  const deleteConflictRow = (rowRef: { conflictIndex: number; rowIndex: number }) => {
    if (rowRef.conflictIndex < 0) return;
    const newConflicts = [...(conflicts || [])], conflict = newConflicts[rowRef.conflictIndex], rows = conflict.rows || [];
    if (rows.length <= 1) {
      onUpdateConflicts(newConflicts.filter((_: any, index: number) => index !== rowRef.conflictIndex));
      return;
    }
    newConflicts[rowRef.conflictIndex] = { ...conflict, rows: rows.filter((_: any, index: number) => index !== rowRef.rowIndex) };
    onUpdateConflicts(newConflicts);
  };
  return (
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
         <col style={{ width: 'calc((100% - 3.5rem) / 4)' }} />
         <col style={{ width: 'calc((100% - 3.5rem) / 4)' }} />
         <col style={{ width: 'calc((100% - 3.5rem) / 4)' }} />
         <col style={{ width: 'calc((100% - 3.5rem) / 4)' }} />
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

</div>
  );
};

export default ConflictEditor;
