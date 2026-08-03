import React from 'react';
import { MessageSquarePlus, X } from 'lucide-react';
import type { QuestionnaireEntry } from '../../types';
import QuestionnaireAccordion from './QuestionnaireAccordion';
import QuestionnaireFields, { type QuestionnaireQuestion } from './QuestionnaireFields';

export interface StandardAccordionQuestionnaireProps {
  idPrefix: string;
  entry: QuestionnaireEntry;
  categories: string[];
  activeCategoryIndex: number;
  questions: QuestionnaireQuestion[];
  activeCategory: string;
  customQuestions: Array<{ id: string; label: string }>;
  newQuestionLabel: string;
  onSelectCategory: (index: number) => void;
  onRegisterCategoryAnchor: (category: string, element: HTMLButtonElement | null) => void;
  onUpdateAnswer: (questionId: string, value: string) => void;
  onNewQuestionLabelChange: (value: string) => void;
  onAddCustomQuestion: () => void;
  onRemoveCustomQuestion: (questionId: string) => void;
}

const StandardAccordionQuestionnaire: React.FC<StandardAccordionQuestionnaireProps> = ({
  idPrefix,
  entry,
  categories,
  activeCategoryIndex,
  questions,
  activeCategory,
  customQuestions,
  newQuestionLabel,
  onSelectCategory,
  onRegisterCategoryAnchor,
  onUpdateAnswer,
  onNewQuestionLabelChange,
  onAddCustomQuestion,
  onRemoveCustomQuestion,
}) => (
  <QuestionnaireAccordion
    enabled
    idPrefix={idPrefix}
    categories={categories}
    activeCategoryIndex={activeCategoryIndex}
    onSelectCategory={onSelectCategory}
    registerCategoryAnchor={onRegisterCategoryAnchor}
  >
    <QuestionnaireFields
      questions={questions}
      data={entry.data}
      onChange={onUpdateAnswer}
    />
    {activeCategory === 'שאלות נוספות' && customQuestions.map(question => (
      <div key={question.id} className="group space-y-3 animate-in fade-in duration-500 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-[var(--text-accent)]/30 uppercase tracking-[0.2em]">שאלות נוספות</span>
            <div className="h-px w-8 bg-[var(--color-secondary)]" />
            <label className="text-sm font-bold text-[var(--text-accent)]">{question.label}</label>
          </div>
          <button onClick={() => onRemoveCustomQuestion(question.id)} className="text-red-200 hover:text-red-500 transition-colors p-1" title="הסר שאלה"><X size={14} /></button>
        </div>
        <textarea
          value={entry.data[question.id] || ''}
          onChange={(event) => onUpdateAnswer(question.id, event.target.value)}
          className="w-full bg-[var(--color-secondary)]/20 border-2 border-[var(--color-border)]/50 rounded-2xl p-5 text-sm focus:ring-4 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]/50 transition-all outline-none min-h-[120px] leading-relaxed shadow-inner"
          placeholder="תשובה לשאלה המותאמת..."
        />
      </div>
    ))}
    {activeCategory === 'שאלות נוספות' && (
      <div className="pt-10 border-t border-[var(--theme-border)]/50 mt-10">
        <div className="text-xs font-black text-[var(--theme-accent)]/40 uppercase tracking-widest mb-4">הוספת שאלה מותאמת אישית</div>
        <div className="flex gap-3">
          <input
            type="text"
            value={newQuestionLabel}
            onChange={(event) => onNewQuestionLabelChange(event.target.value)}
            placeholder="מה ברצונך לשאול?"
            className="flex-1 bg-[var(--theme-card)] border-2 border-[var(--theme-border)]/50 rounded-2xl px-5 py-3 text-sm focus:border-[var(--theme-primary)]/50 outline-none"
          />
          <button onClick={onAddCustomQuestion} className="bg-[var(--theme-primary)] text-[var(--theme-card)] px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-md">
            <MessageSquarePlus size={18} />
            <span>הוסף</span>
          </button>
        </div>
      </div>
    )}
  </QuestionnaireAccordion>
);

export default StandardAccordionQuestionnaire;
