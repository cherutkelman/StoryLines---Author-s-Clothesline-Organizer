import React, { useEffect, useRef, useState } from 'react';
import { Trash2, UserRound, X } from 'lucide-react';
import type { CharacterEntry } from '../../types';

interface CharacterRemovalDialogProps {
  isOpen: boolean;
  character: CharacterEntry | null;
  onHideFromQuestionnaire: (characterId: string) => void;
  onDeleteFromBook: (characterId: string) => void;
  onClose: () => void;
}

type CharacterRemovalAction = 'hide' | 'delete';

interface RunCharacterRemovalActionOptions {
  action: CharacterRemovalAction;
  characterId: string;
  submitting: { current: boolean };
  onHideFromQuestionnaire: (characterId: string) => void;
  onDeleteFromBook: (characterId: string) => void;
}

export const runCharacterRemovalAction = ({
  action,
  characterId,
  submitting,
  onHideFromQuestionnaire,
  onDeleteFromBook,
}: RunCharacterRemovalActionOptions): boolean => {
  if (submitting.current) return false;
  submitting.current = true;
  if (action === 'hide') onHideFromQuestionnaire(characterId);
  else onDeleteFromBook(characterId);
  return true;
};

const CharacterRemovalDialog: React.FC<CharacterRemovalDialogProps> = ({
  isOpen,
  character,
  onHideFromQuestionnaire,
  onDeleteFromBook,
  onClose,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
      submittingRef.current = false;
      return;
    }
    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submittingRef.current) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !character) return null;

  const runAction = (action: CharacterRemovalAction) => {
    const started = runCharacterRemovalAction({
      action,
      characterId: character.id,
      submitting: submittingRef,
      onHideFromQuestionnaire,
      onDeleteFromBook,
    });
    if (started) setIsSubmitting(true);
  };

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !submittingRef.current) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="character-removal-dialog-title"
        dir="rtl"
        className="w-full max-w-lg rounded-[2rem] border border-[var(--theme-border)] bg-[var(--theme-card)] p-5 text-right shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--theme-border)] bg-[var(--theme-secondary)]">
              {character.imageUrl ? (
                <img src={character.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserRound size={28} className="text-[var(--theme-primary)]/45" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <h2 id="character-removal-dialog-title" className="text-xl font-black text-[var(--theme-primary)] sm:text-2xl">מה לעשות עם הדמות?</h2>
              <p className="mt-1 truncate font-bold text-[var(--theme-text)]/70">{character.name}</p>
            </div>
          </div>
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="ביטול וסגירת החלון"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] disabled:opacity-50"
          >
            <X size={22} />
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => runAction('hide')}
            disabled={isSubmitting}
            className="w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-secondary)]/45 p-4 text-right transition-colors hover:bg-[var(--theme-secondary)] disabled:cursor-wait disabled:opacity-60"
          >
            <span className="block font-black text-[var(--theme-primary)]">הסרה משאלון הדמויות</span>
            <span className="mt-1 block text-sm leading-relaxed text-[var(--theme-text)]/70">הדמות לא תופיע ברשימת השאלון, אך המידע שלה יישמר והיא תישאר בכל המפות שבהן היא נמצאת.</span>
            <span className="mt-2 block text-xs leading-relaxed text-[var(--theme-text)]/55">ניתן להחזיר את השאלון דרך „פתיחת שאלון לדמות קיימת”.</span>
          </button>

          <button
            type="button"
            onClick={() => runAction('delete')}
            disabled={isSubmitting}
            className="w-full rounded-2xl border border-red-300 bg-red-50 p-4 text-right transition-colors hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
          >
            <span className="flex items-center gap-2 font-black text-red-700"><Trash2 size={18} />מחיקה מהספר ומהמפות</span>
            <span className="mt-1 block text-sm leading-relaxed text-red-800/75">הדמות תימחק מהספר ותוסר מכל מפות הדמויות שלו.</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="mt-5 min-h-11 w-full rounded-xl border border-[var(--theme-border)] px-4 font-bold text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] disabled:opacity-50"
        >
          ביטול
        </button>
      </section>
    </div>
  );
};

export default CharacterRemovalDialog;
