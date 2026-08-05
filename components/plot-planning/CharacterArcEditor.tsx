import React from 'react';
import { Info, Plus, Trash2 } from 'lucide-react';
import { Scene } from '../../types';
import MultiScenePicker from './MultiScenePicker';

interface CharacterArcEditorProps {
  characterArcs: any[];
  onUpdateArcs: (arcs: any[]) => void;
  scenes: Scene[];
  isLibrarySidebarCollapsed: boolean;
}

type ArcLinkType = 'belief' | 'argument' | 'contradiction' | 'newBelief' | 'validation';

const createArcStep = (id = `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`) => ({
  id,
  text: '',
  argument: '',
  contradiction: '',
});

const createEvidence = (id = `evidence-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`) => ({ id, text: '' });

const createCharacterArc = () => ({
  id: `arc-${Date.now()}`,
  characterName: '',
  falseBelief: '',
  finalGoal: '',
  steps: [createArcStep()],
  evidences: [createEvidence()],
  sceneLinks: [],
});

const getSteps = (arc: any) => arc.steps?.length ? arc.steps : [createArcStep(`step-${arc.id}-default`)];

const getEvidences = (arc: any) => {
  if (arc.evidences?.length) return arc.evidences;
  const legacyEvidence = (arc.steps || [])
    .filter((step: any) => step.validation)
    .map((step: any, index: number) => ({ id: `evidence-${step.id || index}`, text: step.validation }));
  return legacyEvidence.length ? legacyEvidence : [createEvidence(`evidence-${arc.id}-default`)];
};

const CharacterArcEditor: React.FC<CharacterArcEditorProps> = ({
  characterArcs,
  onUpdateArcs,
  scenes,
  isLibrarySidebarCollapsed,
}) => {
  const arcs = characterArcs || [];

  const updateArc = (arcIndex: number, updater: (arc: any) => void) => {
    const nextArcs = [...arcs];
    const arc = {
      ...nextArcs[arcIndex],
      steps: [...getSteps(nextArcs[arcIndex])],
      evidences: [...getEvidences(nextArcs[arcIndex])],
      sceneLinks: [...(nextArcs[arcIndex].sceneLinks || [])],
    };
    updater(arc);
    nextArcs[arcIndex] = arc;
    onUpdateArcs(nextArcs);
  };

  const addArgumentPair = (arcIndex: number) => updateArc(arcIndex, arc => {
    arc.steps.push(createArcStep());
  });

  const deleteArgumentPair = (arcIndex: number, stepIndex: number) => updateArc(arcIndex, arc => {
    if (arc.steps.length <= 1) return;
    const removedNumber = stepIndex + 1;
    arc.steps = arc.steps.filter((_: any, index: number) => index !== stepIndex);
    arc.sceneLinks = arc.sceneLinks
      .filter((link: any) => !(['argument', 'contradiction'].includes(link.type)) || link.stepNumber !== removedNumber)
      .map((link: any) => (
        ['argument', 'contradiction'].includes(link.type) && link.stepNumber > removedNumber
          ? { ...link, stepNumber: link.stepNumber - 1 }
          : link
      ));
  });

  const addEvidence = (arcIndex: number) => updateArc(arcIndex, arc => {
    arc.evidences.push(createEvidence());
  });

  const deleteEvidence = (arcIndex: number, evidenceIndex: number) => updateArc(arcIndex, arc => {
    if (arc.evidences.length <= 1) return;
    const removedNumber = evidenceIndex + 1;
    arc.evidences = arc.evidences.filter((_: any, index: number) => index !== evidenceIndex);
    arc.sceneLinks = arc.sceneLinks
      .filter((link: any) => link.type !== 'validation' || link.stepNumber !== removedNumber)
      .map((link: any) => (
        link.type === 'validation' && link.stepNumber > removedNumber
          ? { ...link, stepNumber: link.stepNumber - 1 }
          : link
      ));
  });

  const getLinks = (arc: any, type: ArcLinkType, rowNumber: number) =>
    (arc.sceneLinks || []).filter((link: any) => link.type === type && (link.stepNumber || 0) === rowNumber);

  const updateLinks = (arcIndex: number, type: ArcLinkType, rowNumber: number, links: any[]) => updateArc(arcIndex, arc => {
    const otherLinks = arc.sceneLinks.filter((link: any) => !(link.type === type && (link.stepNumber || 0) === rowNumber));
    arc.sceneLinks = [
      ...otherLinks,
      ...links.map((link: any) => ({
        ...link,
        id: link.id || `link-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        stepNumber: rowNumber,
      })),
    ];
  });

  const scenePicker = (arc: any, arcIndex: number, type: ArcLinkType, rowNumber: number) => (
    <MultiScenePicker
      links={getLinks(arc, type, rowNumber)}
      onUpdate={links => updateLinks(arcIndex, type, rowNumber, links)}
      scenes={scenes}
      placeholder="בחירת סצנה..."
    />
  );

  const linkTypeLabels: Record<ArcLinkType, string> = {
    belief: 'אמונה התחלתית',
    argument: 'טיעון',
    contradiction: 'הפרכה',
    newBelief: 'אמונה חדשה בסוף הספר',
    validation: 'הוכחה',
  };

  const sceneSummary = arcs.flatMap((arc: any) => (arc.sceneLinks || []).map((link: any) => {
    const scene = scenes.find(item => item.id === link.sceneId);
    return scene ? { scene, link, arc } : null;
  }).filter(Boolean)).sort((a: any, b: any) => a.scene.position - b.scene.position);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-[var(--theme-accent)]/5 p-8 rounded-[2rem] border border-[var(--theme-accent)]/20">
        <div className="flex items-center gap-3 mb-4 text-[var(--theme-accent)]">
          <Info size={20} />
          <h3 className="text-xl font-bold handwritten text-3xl">על קשת התפתחות הדמות</h3>
        </div>
        <p className="text-[var(--theme-primary)]/70 leading-relaxed italic">
          הגדירו את האמונה ההתחלתית של הדמות, את הטיעונים שמחזקים אותה ואת ההפרכות שמערערות אותם. לאחר מכן נסחו את האמונה החדשה והוסיפו את ההוכחות שמבססות אותה במהלך הסיפור.
        </p>
      </div>

      {arcs.map((arc: any, arcIndex: number) => {
        const steps = getSteps(arc);
        const evidences = getEvidences(arc);
        return (
          <div key={arc.id} className="overflow-x-auto rounded-2xl border border-[var(--theme-border)]/40 bg-white/50 shadow-sm" dir="rtl">
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
                      <input
                        value={arc.characterName || ''}
                        onChange={event => updateArc(arcIndex, next => { next.characterName = event.target.value; })}
                        className="w-full bg-white/70 border border-[var(--theme-border)]/30 rounded-xl px-3 py-2 text-sm font-bold outline-none"
                        placeholder="שם הדמות"
                      />
                      <button onClick={() => onUpdateArcs(arcs.filter((_: any, index: number) => index !== arcIndex))} className="p-2 text-red-300 hover:text-red-500" title="מחיקת קשת">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </th>
                  <th className="p-3 border-b border-[var(--theme-border)]/40">באיזו סצנה זה מופיע</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border-b border-l border-[var(--theme-border)]/30 align-middle font-black text-[var(--theme-accent)]">אמונה התחלתית</td>
                  <td className="p-3 border-b border-l border-[var(--theme-border)]/30">
                    <textarea
                      value={arc.falseBelief || ''}
                      onChange={event => updateArc(arcIndex, next => { next.falseBelief = event.target.value; })}
                      className="w-full min-h-20 bg-white/70 border border-[var(--theme-border)]/30 rounded-xl px-3 py-2 resize-y focus:ring-1 focus:ring-[var(--theme-accent)]/30 outline-none text-sm"
                      placeholder="האמונה ההתחלתית..."
                    />
                  </td>
                  <td className="p-3 border-b border-[var(--theme-border)]/30 align-top">{scenePicker(arc, arcIndex, 'belief', 0)}</td>
                </tr>

                {steps.map((step: any, stepIndex: number) => (
                  <tr key={step.id}>
                    <td className="p-0 border-b border-l border-[var(--theme-border)]/30 font-bold text-[var(--theme-primary)]/70">
                      <div className="grid grid-cols-[2.5rem_1fr] min-h-40">
                        <div className="row-span-2 flex items-center justify-center border-l border-[var(--theme-border)]/30 text-lg font-black">{stepIndex + 1}</div>
                        <div className="flex items-center justify-between gap-1 px-2 py-3 border-b border-[var(--theme-border)]/30">
                          <span>טיעון</span>
                          {steps.length > 1 && <button onClick={() => deleteArgumentPair(arcIndex, stepIndex)} className="p-1 text-red-300 hover:text-red-500" title="מחיקת הטיעון וההפרכה"><Trash2 size={14} /></button>}
                        </div>
                        <div className="px-2 py-3">הפרכה</div>
                      </div>
                    </td>
                    <td className="p-3 border-b border-l border-[var(--theme-border)]/30">
                      <div className="grid grid-rows-2 gap-3">
                        <textarea value={step.argument || step.text || ''} onChange={event => updateArc(arcIndex, next => { next.steps[stepIndex] = { ...next.steps[stepIndex], argument: event.target.value, text: event.target.value }; })} className="w-full min-h-16 bg-white/70 border border-[var(--theme-border)]/30 rounded-xl px-3 py-2 resize-y focus:ring-1 focus:ring-[var(--theme-accent)]/30 outline-none text-sm" placeholder="הטיעון..." />
                        <textarea value={step.contradiction || ''} onChange={event => updateArc(arcIndex, next => { next.steps[stepIndex] = { ...next.steps[stepIndex], contradiction: event.target.value }; })} className="w-full min-h-16 bg-white/70 border border-[var(--theme-border)]/30 rounded-xl px-3 py-2 resize-y focus:ring-1 focus:ring-[var(--theme-accent)]/30 outline-none text-sm" placeholder="ההפרכה..." />
                      </div>
                    </td>
                    <td className="p-3 border-b border-[var(--theme-border)]/30 align-top">
                      <div className="grid grid-rows-2 gap-3">
                        <div>{scenePicker(arc, arcIndex, 'argument', stepIndex + 1)}</div>
                        <div>{scenePicker(arc, arcIndex, 'contradiction', stepIndex + 1)}</div>
                      </div>
                    </td>
                  </tr>
                ))}

                <tr className="bg-[var(--theme-secondary)]/10">
                  <td className="p-3 border-b border-l border-[var(--theme-border)]/30">
                    <button onClick={() => addArgumentPair(arcIndex)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] text-sm font-bold text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]">
                      <Plus size={16} /> הוספת טיעון והפרכה
                    </button>
                  </td>
                  <td className="border-b border-l border-[var(--theme-border)]/30" />
                  <td className="border-b border-[var(--theme-border)]/30" />
                </tr>

                <tr className="bg-[var(--theme-accent)]/5">
                  <td className="p-3 border-b border-l border-[var(--theme-border)]/30 font-black text-[var(--theme-accent)]">אמונה חדשה בסוף הספר</td>
                  <td className="p-3 border-b border-l border-[var(--theme-border)]/30">
                    <textarea value={arc.finalGoal || ''} onChange={event => updateArc(arcIndex, next => { next.finalGoal = event.target.value; })} className="w-full min-h-16 bg-white/70 border border-[var(--theme-border)]/30 rounded-xl px-3 py-2 resize-y focus:ring-1 focus:ring-[var(--theme-accent)]/30 outline-none text-sm" placeholder="האמונה החדשה בסוף הספר..." />
                  </td>
                  <td className="p-3 border-b border-[var(--theme-border)]/30 align-top">{scenePicker(arc, arcIndex, 'newBelief', 0)}</td>
                </tr>

                {evidences.map((evidence: any, evidenceIndex: number) => (
                  <tr key={evidence.id}>
                    <td className="p-0 border-b border-l border-[var(--theme-border)]/30 font-bold text-[var(--theme-primary)]/70">
                      <div className="grid grid-cols-[2.5rem_1fr] min-h-20">
                        <div className="flex items-center justify-center border-l border-[var(--theme-border)]/30 text-lg font-black">{evidenceIndex + 1}</div>
                        <div className="flex items-center justify-between gap-1 px-2 py-3">
                          <span>הוכחה</span>
                          {evidences.length > 1 && <button onClick={() => deleteEvidence(arcIndex, evidenceIndex)} className="p-1 text-red-300 hover:text-red-500" title="מחיקת הוכחה"><Trash2 size={14} /></button>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 border-b border-l border-[var(--theme-border)]/30">
                      <textarea value={evidence.text || ''} onChange={event => updateArc(arcIndex, next => { next.evidences[evidenceIndex] = { ...next.evidences[evidenceIndex], text: event.target.value }; })} className="w-full min-h-16 bg-white/70 border border-[var(--theme-border)]/30 rounded-xl px-3 py-2 resize-y focus:ring-1 focus:ring-[var(--theme-accent)]/30 outline-none text-sm" placeholder="הוכחה לאמונה החדשה..." />
                    </td>
                    <td className="p-3 border-b border-[var(--theme-border)]/30 align-top">{scenePicker(arc, arcIndex, 'validation', evidenceIndex + 1)}</td>
                  </tr>
                ))}

                <tr className="bg-[var(--theme-secondary)]/10">
                  <td className="p-3 border-l border-[var(--theme-border)]/30">
                    <button onClick={() => addEvidence(arcIndex)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] text-sm font-bold text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]">
                      <Plus size={16} /> הוספת הוכחה
                    </button>
                  </td>
                  <td className="border-l border-[var(--theme-border)]/30" />
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}

      {arcs.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-[var(--theme-border)]/40 p-10 text-center text-[var(--theme-primary)]/45">
          עדיין לא נוצרה קשת התפתחות.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--theme-border)]/30 bg-white/40 shadow-sm" dir="rtl">
        <table className="w-full border-collapse">
          <thead className="bg-[var(--theme-secondary)]/30 text-sm font-black text-[var(--theme-primary)]/60">
            <tr>
              <th className="p-3 border-b border-l border-[var(--theme-border)]/30 text-right">סצנה</th>
              <th className="p-3 border-b border-l border-[var(--theme-border)]/30 text-right">שלב בקשת</th>
              <th className="p-3 border-b border-[var(--theme-border)]/30 text-right">דמות</th>
            </tr>
          </thead>
          <tbody>
            {sceneSummary.length ? sceneSummary.map((item: any) => (
              <tr key={`${item.link.id}-${item.scene.id}`}>
                <td className="p-3 border-b border-l border-[var(--theme-border)]/30 text-sm font-bold">{item.scene.title}</td>
                <td className="p-3 border-b border-l border-[var(--theme-border)]/30 text-sm">{linkTypeLabels[item.link.type as ArcLinkType] || 'שלב בקשת'}</td>
                <td className="p-3 border-b border-[var(--theme-border)]/30 text-sm">{item.arc.characterName || 'ללא שם'}</td>
              </tr>
            )) : (
              <tr><td colSpan={3} className="p-6 text-center text-sm text-[var(--theme-primary)]/35 italic">עדיין לא שויכו סצנות לקשת ההתפתחות.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center">
        <button onClick={() => onUpdateArcs([...arcs, createCharacterArc()])} className="flex items-center gap-2 px-6 py-3 bg-[var(--theme-accent)] text-white rounded-2xl font-bold shadow-lg hover:scale-105 transition-all">
          <Plus size={18} /> הוספת קשת התפתחות
        </button>
      </div>
    </div>
  );
};

export default CharacterArcEditor;
