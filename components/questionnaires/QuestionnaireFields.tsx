import React, { useRef } from 'react';

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
  promoteMultilineTextValues?: boolean;
}

export const hasQuestionnaireLineBreak = (value: unknown): boolean =>
  typeof value === 'string' && /[\r\n]/.test(value);

export const resolveQuestionnaireEditorType = (
  question: QuestionnaireQuestion,
  value: string,
  promotedTextFieldIds: Set<string>,
  promoteMultilineTextValues: boolean
): 'input' | 'textarea' => {
  if (question.type === 'textarea') return 'textarea';
  if (promoteMultilineTextValues && question.type === 'text' && hasQuestionnaireLineBreak(value)) {
    promotedTextFieldIds.add(question.id);
  }
  return promotedTextFieldIds.has(question.id) ? 'textarea' : 'input';
};

const QuestionnaireFields: React.FC<QuestionnaireFieldsProps> = ({
  questions,
  data,
  onChange,
  renderAfterQuestion,
  promoteMultilineTextValues = false,
}) => {
  const promotedTextFieldIds = useRef(new Set<string>());

  return (
  <>
    {questions.map(question => {
      const value = data[question.id] || '';
      const editorType = resolveQuestionnaireEditorType(
        question,
        value,
        promotedTextFieldIds.current,
        promoteMultilineTextValues
      );
      const isPromotedTextArea = question.type === 'text' && editorType === 'textarea';

      return (
      <div key={question.id} className="group space-y-3 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-[var(--text-accent)]/30 uppercase tracking-[0.2em]">{question.category}</span>
            <div className="h-px w-8 bg-[var(--color-secondary)]" />
            <label className="text-sm font-bold text-[var(--text-accent)]">{question.question}</label>
          </div>
        </div>
        {editorType === 'textarea' ? (
          <textarea
            value={value}
            onChange={(event) => onChange(question.id, event.target.value)}
            className={`w-full bg-[var(--theme-secondary)]/20 border-2 border-[var(--theme-border)]/50 rounded-2xl p-5 text-sm focus:ring-4 focus:ring-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)]/50 transition-all outline-none min-h-[120px] leading-relaxed shadow-inner ${isPromotedTextArea ? 'resize-y overflow-x-hidden whitespace-pre-wrap break-words' : ''}`}
            placeholder="כתוב כאן..."
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(question.id, event.target.value)}
            className="w-full bg-[var(--theme-secondary)]/20 border-2 border-[var(--theme-border)]/50 rounded-2xl p-5 text-sm focus:ring-4 focus:ring-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)]/50 transition-all outline-none shadow-inner"
            placeholder="כתוב כאן..."
          />
        )}
        {renderAfterQuestion?.(question)}
      </div>
      );
    })}
  </>
  );
};

export default QuestionnaireFields;
