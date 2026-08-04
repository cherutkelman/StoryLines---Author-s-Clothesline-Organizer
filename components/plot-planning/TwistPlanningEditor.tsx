import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';
import type { QuestionnaireEntry, Scene } from '../../types';
import TwistQuestionnaire from '../questionnaires/TwistQuestionnaire';
import { TWIST_QUESTIONS } from '../questionnaires/questionnaireDefinitions';
import { resolveQuestionnaireNameOnBlur } from '../questionnaires/questionnaireNames';

interface TwistPlanningEditorProps {
  twists: QuestionnaireEntry[];
  scenes: Scene[];
  onUpdateTwists: (twists: QuestionnaireEntry[]) => void;
}

const TwistPlanningEditor: React.FC<TwistPlanningEditorProps> = ({ twists, scenes, onUpdateTwists }) => {
  const [selectedId, setSelectedId] = useState<string | null>(twists[0]?.id || null);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [newQuestionLabel, setNewQuestionLabel] = useState('');
  const anchors = useRef<Record<string, HTMLButtonElement | null>>({});
  const selected = twists.find(twist => twist.id === selectedId) || null;
  const categories = Array.from(new Set(TWIST_QUESTIONS.map(question => question.category)));
  if (selected?.customFields?.length) categories.push('שאלות נוספות');
  const activeCategory = categories[categoryIndex] || categories[0];
  const questions = TWIST_QUESTIONS.filter(question => question.category === activeCategory);

  useEffect(() => {
    if (selectedId && twists.some(twist => twist.id === selectedId)) return;
    setSelectedId(twists[0]?.id || null);
  }, [twists, selectedId]);

  const updateSelected = (updates: Partial<QuestionnaireEntry>) => {
    if (!selected) return;
    onUpdateTwists(twists.map(twist => twist.id === selected.id ? { ...twist, ...updates } : twist));
  };

  const addTwist = () => {
    const twist: QuestionnaireEntry = { id: `q-${Date.now()}`, name: 'טוויסט חדש', data: {}, customFields: [] };
    onUpdateTwists([...twists, twist]);
    setSelectedId(twist.id);
    setCategoryIndex(0);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={addTwist} className="flex items-center gap-2 px-6 py-3 bg-[var(--theme-accent)] text-white rounded-2xl font-bold shadow-lg hover:scale-105 transition-all"><Plus size={18} />הוסף טוויסט</button>
        <select value={selectedId || ''} onChange={event => { setSelectedId(event.target.value || null); setCategoryIndex(0); }} className="min-w-56 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-4 py-3 font-bold text-[var(--theme-primary)]">
          <option value="">בחרי טוויסט</option>
          {twists.map(twist => <option key={twist.id} value={twist.id}>{twist.name.trim() || 'פריט ללא שם'}</option>)}
        </select>
      </div>
      {selected ? (
        <div className="rounded-[2rem] border border-[var(--theme-border)]/50 bg-[var(--theme-card)] p-6 sm:p-8 shadow-sm space-y-8">
          <div className="flex items-center gap-4">
            <Zap className="text-[var(--theme-accent)]" />
            <input value={selected.name} onChange={event => updateSelected({ name: event.target.value })} onBlur={() => updateSelected({ name: resolveQuestionnaireNameOnBlur(selected.name, 'twists') })} className="flex-1 bg-transparent border-none focus:ring-0 text-3xl font-bold text-[var(--theme-primary)] handwritten" />
            <button onClick={() => { onUpdateTwists(twists.filter(twist => twist.id !== selected.id)); setSelectedId(null); }} className="p-2 text-red-400 hover:text-red-600" title="מחק טוויסט"><Trash2 size={18} /></button>
          </div>
          <TwistQuestionnaire
            entry={selected} categories={categories} activeCategoryIndex={categoryIndex} activeCategory={activeCategory}
            questions={questions} customQuestions={selected.customFields || []} newQuestionLabel={newQuestionLabel}
            onSelectCategory={index => { if (index === categoryIndex) return; setCategoryIndex(index); requestAnimationFrame(() => anchors.current[categories[index]]?.scrollIntoView({ block: 'start', behavior: 'smooth' })); }}
            onRegisterCategoryAnchor={(category, element) => { anchors.current[category] = element; }}
            onUpdateAnswer={(questionId, value) => updateSelected({ data: { ...selected.data, [questionId]: value } })}
            onNewQuestionLabelChange={setNewQuestionLabel}
            onAddCustomQuestion={() => { if (!newQuestionLabel.trim()) return; updateSelected({ customFields: [...(selected.customFields || []), { id: `custom-${Date.now()}`, label: newQuestionLabel.trim() }] }); setNewQuestionLabel(''); }}
            onRemoveCustomQuestion={questionId => { const data = { ...selected.data }; delete data[questionId]; updateSelected({ customFields: (selected.customFields || []).filter(field => field.id !== questionId), data }); }}
            scenes={scenes}
            onUpdateQuestionSceneIds={(questionId, sceneIds) => updateSelected({ sceneIdsByQuestionId: { ...(selected.sceneIdsByQuestionId || {}), [questionId]: sceneIds } })}
          />
        </div>
      ) : <div className="rounded-3xl border-2 border-dashed border-[var(--theme-border)] p-12 text-center text-[var(--theme-primary)]/40">אין טוויסטים. הוסיפי טוויסט חדש כדי להתחיל.</div>}
    </div>
  );
};

export default TwistPlanningEditor;
