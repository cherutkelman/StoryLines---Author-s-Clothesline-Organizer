import React from 'react';

export interface QuestionnaireQuestion {
  id: string;
  category: string;
  question: string;
  type: string;
}

interface QuestionnaireFieldsProps {
  questions: QuestionnaireQuestion[];
  data: Record<string, string>;
  onChange: (questionId: string, value: string) => void;
  renderAfterQuestion?: (question: QuestionnaireQuestion) => React.ReactNode;
}

const QuestionnaireFields: React.FC<QuestionnaireFieldsProps> = ({ questions, data, onChange, renderAfterQuestion }) => (
  <>
    {questions.map(question => (
      <div key={question.id} className="group space-y-3 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-[var(--text-accent)]/30 uppercase tracking-[0.2em]">{question.category}</span>
            <div className="h-px w-8 bg-[var(--color-secondary)]" />
            <label className="text-sm font-bold text-[var(--text-accent)]">{question.question}</label>
          </div>
        </div>
        {question.type === 'textarea' ? (
          <textarea
            value={data[question.id] || ''}
            onChange={(event) => onChange(question.id, event.target.value)}
            className="w-full bg-[var(--theme-secondary)]/20 border-2 border-[var(--theme-border)]/50 rounded-2xl p-5 text-sm focus:ring-4 focus:ring-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)]/50 transition-all outline-none min-h-[120px] leading-relaxed shadow-inner"
            placeholder="כתוב כאן..."
          />
        ) : (
          <input
            type="text"
            value={data[question.id] || ''}
            onChange={(event) => onChange(question.id, event.target.value)}
            className="w-full bg-[var(--theme-secondary)]/20 border-2 border-[var(--theme-border)]/50 rounded-2xl p-5 text-sm focus:ring-4 focus:ring-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)]/50 transition-all outline-none shadow-inner"
            placeholder="כתוב כאן..."
          />
        )}
        {renderAfterQuestion?.(question)}
      </div>
    ))}
  </>
);

export default QuestionnaireFields;
