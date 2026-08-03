import React from 'react';
import { Circle, Info, Plus, Square, Trash2, Triangle } from 'lucide-react';
import { Scene } from '../../types';
import MultiScenePicker from './MultiScenePicker';

interface CharacterArcEditorProps {
  characterArcs: any[];
  onUpdateArcs: (arcs: any[]) => void;
  scenes: Scene[];
  isLibrarySidebarCollapsed: boolean;
}

const CharacterArcEditor: React.FC<CharacterArcEditorProps> = ({
  characterArcs,
  onUpdateArcs,
  scenes,
  isLibrarySidebarCollapsed,
}) => {
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
  return (
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
        <col style={{ width: 'calc((100% - 3.5rem) / 4)' }} />
        <col style={{ width: 'calc((100% - 3.5rem) / 4)' }} />
        <col style={{ width: 'calc((100% - 3.5rem) / 4)' }} />
        <col style={{ width: 'calc((100% - 3.5rem) / 4)' }} />
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

</div>
  );
};

export default CharacterArcEditor;
