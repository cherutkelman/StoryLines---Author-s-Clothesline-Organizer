import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ImageOff, RefreshCw, X } from 'lucide-react';
import type { Book, CharacterEntry } from '../../types';
import {
  applyCharacterSyncResolutions,
  buildCharacterSyncPlan,
  normalizeCharacterSyncValueForComparison,
  type CharacterSyncFieldPlan,
  type CharacterSyncPlan,
  type CharacterSyncResolution,
  type SharedCharacterFieldPath,
} from '../../src/characters/characterSync';
import { FEMALE_QUESTIONS_CONFIG } from './questionnaireDefinitions';

interface CharacterSyncDialogProps {
  isOpen: boolean;
  books: Book[];
  activeBookId: string;
  character: CharacterEntry;
  onClose: () => void;
  onApplyBooks: (books: Book[]) => void;
  onSuccess?: () => void;
}

export interface CharacterSyncChoice {
  mode: 'skip' | 'value' | 'manual';
  value: string;
  manualValue?: string;
}

export const getCharacterSyncFieldLabel = (field: SharedCharacterFieldPath): string => {
  if (field === 'name') return 'שם הדמות בספר';
  if (field === 'imageUrl') return 'תמונת הדמות';
  if (field === 'data.name') return 'השם המלא';
  const questionId = field.slice(5);
  return FEMALE_QUESTIONS_CONFIG.find(question => question.id === questionId)?.question || questionId;
};

export const createInitialCharacterSyncChoices = (
  fields: CharacterSyncFieldPlan[]
): Record<string, CharacterSyncChoice> => Object.fromEntries(fields.map(field => [
  field.field,
  field.status === 'fillable' && field.suggestedValue
    ? { mode: 'value', value: field.suggestedValue }
    : { mode: 'skip', value: '' },
]));

export const getActionableCharacterSyncFields = (
  plan: CharacterSyncPlan
): CharacterSyncFieldPlan[] => plan.fields.filter(field => field.status !== 'unchanged');

export const buildCombinedCharacterSyncValue = (
  field: CharacterSyncFieldPlan,
  activeBookId: string
): string => {
  if (field.status !== 'conflict' || field.field === 'imageUrl') return '';

  const orderedValues = [
    ...field.appearanceValues.filter(item => item.bookId === activeBookId),
    ...field.appearanceValues.filter(item => item.bookId !== activeBookId),
  ];
  const seenValues = new Set<string>();

  return orderedValues
    .filter(item => {
      if (item.isEmpty || typeof item.value !== 'string') return false;
      const normalizedValue = normalizeCharacterSyncValueForComparison(item.value);
      if (!normalizedValue || seenValues.has(normalizedValue)) return false;
      seenValues.add(normalizedValue);
      return true;
    })
    .map(item => item.value as string)
    .join('\n\n');
};

export const selectManualCharacterSyncChoice = (
  field: CharacterSyncFieldPlan,
  activeBookId: string,
  choice: CharacterSyncChoice
): CharacterSyncChoice => {
  const manualValue = choice.manualValue
    ?? (choice.mode === 'manual' ? choice.value : buildCombinedCharacterSyncValue(field, activeBookId));
  return { mode: 'manual', value: manualValue, manualValue };
};

export const buildCharacterSyncResolutionsFromChoices = (
  fields: CharacterSyncFieldPlan[],
  choices: Record<string, CharacterSyncChoice>
): { resolutions?: CharacterSyncResolution[]; error?: string } => {
  const resolutions: CharacterSyncResolution[] = [];
  for (const field of fields) {
    const choice = choices[field.field] || { mode: 'skip', value: '' };
    if (choice.mode === 'skip') {
      resolutions.push({ field: field.field, action: 'skip' });
      continue;
    }
    if (!choice.value.trim()) {
      return { error: `יש להזין ערך עבור „${getCharacterSyncFieldLabel(field.field)}”.` };
    }
    resolutions.push({ field: field.field, action: 'use_value', value: choice.value });
  }
  return { resolutions };
};

interface SubmitCharacterSyncDialogOptions {
  fields: CharacterSyncFieldPlan[];
  choices: Record<string, CharacterSyncChoice>;
  books: Book[];
  characterEntityId: string;
  onApplyBooks: (books: Book[]) => void;
  onSuccess?: () => void;
  onClose: () => void;
  onError: (message: string) => void;
}

export const submitCharacterSyncDialog = ({
  fields,
  choices,
  books,
  characterEntityId,
  onApplyBooks,
  onSuccess,
  onClose,
  onError,
}: SubmitCharacterSyncDialogOptions): string => {
  const resolutionResult = buildCharacterSyncResolutionsFromChoices(fields, choices);
  if (!resolutionResult.resolutions) {
    onError(resolutionResult.error || 'לא ניתן להכין את החלטות הסנכרון.');
    return 'invalid_choices';
  }

  if (resolutionResult.resolutions.every(resolution => resolution.action === 'skip')) {
    onClose();
    return 'skipped_all';
  }

  const result = applyCharacterSyncResolutions(
    books,
    characterEntityId,
    resolutionResult.resolutions
  );
  if (result.status === 'updated') {
    onApplyBooks(result.books);
    onSuccess?.();
    onClose();
  } else if (result.status === 'no_changes') {
    onError('לא נבחרו שינויים לסנכרון.');
  } else if (result.status === 'invalid_resolutions') {
    onError('אחת מהחלטות הסנכרון אינה תקינה. בדקי את הערכים שנבחרו.');
  } else if (result.status === 'invalid_character_entity_id') {
    onError('לא ניתן לסנכרן את הדמות משום שזהותה אינה תקינה.');
  } else {
    onError('לא נמצאו רשומות של הדמות בספרים הטעונים.');
  }
  return result.status;
};

const CharacterSyncDialog: React.FC<CharacterSyncDialogProps> = ({
  isOpen,
  books,
  activeBookId,
  character,
  onClose,
  onApplyBooks,
  onSuccess,
}) => {
  const planResult = useMemo(
    () => isOpen
      ? buildCharacterSyncPlan(books, character.characterEntityId || '')
      : null,
    [isOpen, books, character.characterEntityId]
  );
  const plan = planResult?.status === 'ready' ? planResult.plan : null;
  const actionableFields = useMemo(
    () => plan ? getActionableCharacterSyncFields(plan) : [],
    [plan]
  );
  const [choices, setChoices] = useState<Record<string, CharacterSyncChoice>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen || !plan) return;
    setChoices(createInitialCharacterSyncChoices(actionableFields));
    setErrorMessage('');
    setBrokenImages(new Set());
  }, [isOpen, plan, actionableFields]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !planResult) return null;

  const duplicateDiagnostic = plan?.diagnostics.find(
    diagnostic => diagnostic.code === 'duplicate_character_record_in_book'
  );
  const unchangedCount = plan?.fields.filter(field => field.status === 'unchanged').length || 0;

  const updateChoice = (field: SharedCharacterFieldPath, choice: CharacterSyncChoice) => {
    setChoices(current => ({ ...current, [field]: choice }));
    setErrorMessage('');
  };

  const handleApply = () => {
    if (!plan || duplicateDiagnostic || actionableFields.length === 0) return;
    submitCharacterSyncDialog({
      fields: actionableFields,
      choices,
      books,
      characterEntityId: character.characterEntityId || '',
      onApplyBooks,
      onSuccess,
      onClose,
      onError: setErrorMessage,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
      dir="rtl"
      onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="character-sync-title"
        className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[var(--theme-border)]/50 bg-[var(--theme-card)] shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-[var(--theme-border)]/40 p-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <RefreshCw className="shrink-0 text-[var(--theme-primary)]" size={24} />
            <div className="min-w-0">
              <h2 id="character-sync-title" className="truncate text-xl font-bold text-[var(--theme-primary)] sm:text-2xl">סנכרון מידע</h2>
              <p className="mt-1 truncate text-xs text-[var(--theme-text)]/50">{character.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="סגירת חלון סנכרון מידע"
            className="rounded-xl p-3 hover:bg-[var(--theme-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/20">
            <X size={22} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {planResult.status === 'invalid_character_entity_id' && (
            <StatusMessage>לא ניתן לסנכרן את הדמות משום שזהותה אינה תקינה.</StatusMessage>
          )}
          {planResult.status === 'not_found' && (
            <StatusMessage>לא נמצאו רשומות של הדמות בספרים הטעונים.</StatusMessage>
          )}
          {planResult.status === 'single_appearance' && (
            <StatusMessage>הדמות קיימת כרגע רק בספר הזה, ולכן אין מידע נוסף לסנכרון.</StatusMessage>
          )}

          {plan && (
            <div className="space-y-5">
              <section className="rounded-2xl bg-[var(--theme-secondary)]/30 p-4">
                <p className="font-bold text-[var(--theme-primary)]">הדמות מופיעה ב־{plan.appearances.length} ספרים</p>
                <p className="mt-2 text-sm text-[var(--theme-text)]/60">
                  {Array.from(new Set(plan.appearances.map(appearance => appearance.bookTitle))).join(' · ')}
                </p>
              </section>

              {duplicateDiagnostic && (
                <WarningMessage>נמצאו בספר אחד שתי רשומות המקושרות לאותה דמות. יש לפתור את הכפילות לפני הסנכרון.</WarningMessage>
              )}
              <p className="text-sm text-[var(--theme-text)]/60">
                {unchangedCount} שדות כבר מסונכרנים · {actionableFields.length} שדות דורשים בדיקה
              </p>

              {actionableFields.length === 0 ? (
                <StatusMessage icon="success">כל המידע הכללי של הדמות כבר מסונכרן.</StatusMessage>
              ) : (
                <div className="space-y-4">
                  {actionableFields.map(field => (
                    <SyncFieldCard
                      key={field.field}
                      field={field}
                      plan={plan}
                      activeBookId={activeBookId}
                      choice={choices[field.field] || { mode: 'skip', value: '' }}
                      onChange={choice => updateChoice(field.field, choice)}
                      brokenImages={brokenImages}
                      onImageError={value => setBrokenImages(current => new Set(current).add(value))}
                    />
                  ))}
                </div>
              )}
              {errorMessage && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{errorMessage}</p>}
            </div>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-[var(--theme-border)]/40 bg-[var(--theme-card)] p-4 sm:flex-row sm:justify-end sm:p-6">
          <button type="button" onClick={onClose} className="min-h-12 rounded-2xl border border-[var(--theme-border)] px-6 font-bold text-[var(--theme-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/20">ביטול</button>
          <button type="button" onClick={handleApply}
            disabled={!plan || Boolean(duplicateDiagnostic) || actionableFields.length === 0}
            className="min-h-12 rounded-2xl bg-[var(--theme-primary)] px-6 font-bold text-[var(--theme-card)] disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/25">
            סנכרון מידע
          </button>
        </footer>
      </section>
    </div>
  );
};

interface SyncFieldCardProps {
  field: CharacterSyncFieldPlan;
  plan: CharacterSyncPlan;
  activeBookId: string;
  choice: CharacterSyncChoice;
  onChange: (choice: CharacterSyncChoice) => void;
  brokenImages: Set<string>;
  onImageError: (value: string) => void;
}

const SyncFieldCard: React.FC<SyncFieldCardProps> = ({ field, plan, activeBookId, choice, onChange, brokenImages, onImageError }) => {
  const emptyBooks = field.appearanceValues.filter(item => item.isEmpty).map(item => item.bookTitle);
  const bookNamesForOption = (option: CharacterSyncFieldPlan['options'][number]) =>
    option.appearances.map(appearance =>
      plan.appearances.find(item => item.bookId === appearance.bookId && item.characterId === appearance.characterId)?.bookTitle
    ).filter(Boolean).join(' · ');
  const optionName = `${field.field}-sync-choice`;

  return (
    <section className="rounded-2xl border border-[var(--theme-border)]/50 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-[var(--theme-primary)]">{getCharacterSyncFieldLabel(field.field)}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${field.status === 'fillable' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {field.status === 'fillable' ? 'מידע להשלמה' : 'ערכים סותרים'}
        </span>
      </div>

      {field.status === 'fillable' && emptyBooks.length > 0 && (
        <p className="mb-3 text-xs text-[var(--theme-text)]/55">חסר בספרים: {emptyBooks.join(' · ')}</p>
      )}

      <div className="space-y-3">
        {field.options.map(option => {
          const checked = choice.mode === 'value' && choice.value === option.value;
          return (
            <label key={option.normalizedValue} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border border-[var(--theme-border)]/40 p-3 hover:bg-[var(--theme-secondary)]/30">
              <input type="radio" name={optionName} checked={checked}
                onChange={() => onChange({ mode: 'value', value: option.value, manualValue: choice.manualValue })}
                className="mt-1 h-5 w-5 accent-[var(--theme-primary)]" />
              <span className="min-w-0 flex-1">
                {field.field === 'imageUrl' ? (
                  brokenImages.has(option.value) ? (
                    <span className="flex items-center gap-2 text-sm text-[var(--theme-text)]/60"><ImageOff size={20} /> התמונה אינה זמינה</span>
                  ) : (
                    <img src={option.value} alt="אפשרות לתמונת הדמות" onError={() => onImageError(option.value)} className="h-20 w-20 rounded-xl object-cover" />
                  )
                ) : (
                  <span
                    className="block min-w-0 max-w-full whitespace-pre-wrap break-words text-sm text-[var(--theme-text)]"
                    style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                  >
                    {option.value}
                  </span>
                )}
                <span className="mt-1 block text-xs text-[var(--theme-text)]/50">קיים בספרים: {bookNamesForOption(option)}</span>
                {field.status === 'fillable' && (
                  <span className="mt-1 block text-xs font-bold text-emerald-700">בחירה באפשרות זו תחיל את הערך בכל הספרים לאחר האישור.</span>
                )}
              </span>
            </label>
          );
        })}

        {field.field !== 'imageUrl' && (
          <div className="rounded-2xl border border-[var(--theme-border)]/40 p-3">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 font-bold text-[var(--theme-primary)]">
              <input type="radio" name={optionName} checked={choice.mode === 'manual'}
                onChange={() => onChange(selectManualCharacterSyncChoice(field, activeBookId, choice))}
                className="h-5 w-5 accent-[var(--theme-primary)]" />
              ערך משולב או ערוך ידנית
            </label>
            {choice.mode === 'manual' && (
              <textarea value={choice.value} onChange={event => onChange({ mode: 'manual', value: event.target.value, manualValue: event.target.value })}
                aria-label={`ערך ידני עבור ${getCharacterSyncFieldLabel(field.field)}`}
                className="mt-3 min-h-24 w-full resize-y rounded-xl border border-[var(--theme-border)]/50 bg-[var(--theme-secondary)]/20 p-3 text-sm outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/20" />
            )}
          </div>
        )}

        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border border-[var(--theme-border)]/40 p-3 font-bold text-[var(--theme-text)]/70">
          <input type="radio" name={optionName} checked={choice.mode === 'skip'} onChange={() => onChange({ mode: 'skip', value: '', manualValue: choice.manualValue })}
            className="h-5 w-5 accent-[var(--theme-primary)]" />
          לא לסנכרן את השדה הפעם
        </label>
      </div>
    </section>
  );
};

const StatusMessage: React.FC<React.PropsWithChildren<{ icon?: 'success' }>> = ({ children, icon }) => (
  <div className="flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--theme-border)]/40 p-8 text-center font-bold text-[var(--theme-text)]/60">
    {icon === 'success' && <CheckCircle2 className="text-emerald-600" size={22} />}{children}
  </div>
);

const WarningMessage: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div role="alert" className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800">
    <AlertTriangle className="mt-0.5 shrink-0" size={19} />{children}
  </div>
);

export default CharacterSyncDialog;
