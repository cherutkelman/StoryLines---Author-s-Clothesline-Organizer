import React, { useEffect, useMemo, useState } from 'react';
import { UserRound, X } from 'lucide-react';
import type { CharacterEntry } from '../../types';

interface Props {
  isOpen: boolean;
  characters: CharacterEntry[];
  onRestoreCharacter: (characterId: string) => void;
  onClose: () => void;
}

export const getHiddenQuestionnaireCharacters = (characters: CharacterEntry[]): CharacterEntry[] =>
  characters.filter(character => character.questionnaireVisibility === 'hidden');

const ExistingCharacterQuestionnaireDialog: React.FC<Props> = ({
  isOpen,
  characters,
  onRestoreCharacter,
  onClose,
}) => {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const hiddenCharacters = useMemo(() => getHiddenQuestionnaireCharacters(characters), [characters]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedCharacterId(null);
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const openQuestionnaire = () => {
    if (!selectedCharacterId) return;
    onRestoreCharacter(selectedCharacterId);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      dir="rtl"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="existing-character-questionnaire-title"
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-[var(--theme-border)]/50 bg-[var(--theme-card)] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--theme-border)]/40 p-5 sm:p-6">
          <div>
            <h2 id="existing-character-questionnaire-title" className="text-xl font-bold text-[var(--theme-primary)]">
              פתיחת שאלון לדמות קיימת
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--theme-text)]/60">
              הדמויות הבאות כבר קיימות בספר, אך אינן מופיעות כרגע בשאלון הדמויות.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירת חלון פתיחת שאלון לדמות קיימת"
            className="shrink-0 rounded-xl p-2 text-[var(--theme-primary)]/60 hover:bg-[var(--theme-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/20"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {hiddenCharacters.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-[var(--theme-border)]/40 p-8 text-center text-sm font-bold text-[var(--theme-text)]/50">
              אין כרגע דמויות קיימות ללא שאלון.
            </div>
          ) : (
            <div className="grid gap-3" role="radiogroup" aria-label="דמויות קיימות ללא שאלון">
              {hiddenCharacters.map(character => {
                const isSelected = selectedCharacterId === character.id;
                return (
                  <button
                    key={character.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedCharacterId(character.id)}
                    className={`flex min-h-16 items-center gap-4 rounded-2xl border-2 p-3 text-right transition-all ${isSelected ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/5' : 'border-[var(--theme-border)]/40 hover:bg-[var(--theme-secondary)]'}`}
                  >
                    {character.imageUrl ? (
                      <img src={character.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--theme-secondary)] text-[var(--theme-primary)]/50">
                        <UserRound size={22} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate font-bold text-[var(--theme-primary)]">{character.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <footer className="flex gap-3 border-t border-[var(--theme-border)]/40 bg-[var(--theme-secondary)]/20 p-5 sm:p-6">
          <button
            type="button"
            onClick={openQuestionnaire}
            disabled={!selectedCharacterId}
            className="flex-1 rounded-2xl bg-[var(--theme-primary)] px-4 py-3 font-bold text-[var(--theme-card)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            פתיחת שאלון
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-6 py-3 font-bold text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]"
          >
            ביטול
          </button>
        </footer>
      </section>
    </div>
  );
};

export default ExistingCharacterQuestionnaireDialog;
