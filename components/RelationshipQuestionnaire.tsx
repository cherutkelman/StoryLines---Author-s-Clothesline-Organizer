import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { CharacterGender, RelationshipQuestionnaireData } from '../types';
import {
  RelationshipQuestionTextContext,
  relationshipQuestionSections,
} from './relationshipQuestions';

interface RelationshipQuestionnaireProps {
  rel: any;
  relationships: any[];
  onUpdateRelationships: (rels: any[]) => void;
  characters: any[];
}

const emptyQuestionnaire = {
  sharedAnswers: {},
  personalAnswers: {},
  participantGenders: {},
};

interface NormalizedQuestionnaire {
  sharedAnswers: Record<string, string>;
  personalAnswers: Record<string, Record<string, string>>;
  participantGenders: Record<string, CharacterGender>;
}

const getCharacterName = (characters: any[], characterId: string, fallback: string) => {
  const character = characters.find((char) => char.id === characterId);
  const name = typeof character?.name === 'string' ? character.name.trim() : '';
  return name || fallback;
};

const mergeQuestionnaire = (questionnaire?: RelationshipQuestionnaireData): NormalizedQuestionnaire => ({
  sharedAnswers: { ...emptyQuestionnaire.sharedAnswers, ...(questionnaire?.sharedAnswers || {}) },
  personalAnswers: { ...emptyQuestionnaire.personalAnswers, ...(questionnaire?.personalAnswers || {}) },
  participantGenders: { ...emptyQuestionnaire.participantGenders, ...(questionnaire?.participantGenders || {}) },
});

const GenderSelector: React.FC<{
  label: string;
  characterId: string;
  gender?: CharacterGender;
  onChange: (gender: CharacterGender) => void;
}> = ({ label, characterId, gender, onChange }) => {
  if (!characterId) return null;

  return (
    <div className="flex min-w-[160px] flex-col gap-2 rounded-2xl border border-[var(--theme-border)]/50 bg-white/60 p-3 shadow-sm">
      <span className="text-[11px] font-bold text-[var(--theme-primary)]/60">{label}</span>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--theme-secondary)]/40 p-1">
        {([
          ['male', 'זכר'],
          ['female', 'נקבה'],
        ] as const).map(([value, text]) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition-all ${
              gender === value
                ? 'bg-[var(--theme-primary)] text-white shadow-sm'
                : 'text-[var(--theme-primary)]/60 hover:bg-white/60 hover:text-[var(--theme-primary)]'
            }`}
            aria-pressed={gender === value}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
};

const RelationshipQuestionnaire: React.FC<RelationshipQuestionnaireProps> = ({
  rel,
  relationships,
  onUpdateRelationships,
  characters,
}) => {
  const [openSectionIds, setOpenSectionIds] = useState<string[]>([relationshipQuestionSections[0]?.id || '']);
  const questionnaire = mergeQuestionnaire(rel.questionnaire);
  const char1Name = getCharacterName(characters, rel.char1Id, 'דמות ראשונה');
  const char2Name = getCharacterName(characters, rel.char2Id, 'דמות שנייה');
  const genderForChar1 = rel.char1Id ? questionnaire.participantGenders[rel.char1Id] : undefined;
  const genderForChar2 = rel.char2Id ? questionnaire.participantGenders[rel.char2Id] : undefined;
  const canShowQuestions = Boolean(rel.char1Id && rel.char2Id && genderForChar1 && genderForChar2);
  const resolvedGenderForChar1 = (genderForChar1 || 'male') as CharacterGender;
  const resolvedGenderForChar2 = (genderForChar2 || 'male') as CharacterGender;

  const updateQuestionnaire = (relationshipId: string, updater: (questionnaire: NormalizedQuestionnaire) => NormalizedQuestionnaire) => {
    const newRelationships = relationships.map((relationship) => {
      if (relationship.id !== relationshipId) return relationship;

      return {
        ...relationship,
        questionnaire: updater(mergeQuestionnaire(relationship.questionnaire)),
      };
    });

    onUpdateRelationships(newRelationships);
  };

  const updateParticipantGender = (relationshipId: string, characterId: string, gender: CharacterGender) => {
    updateQuestionnaire(relationshipId, (current) => ({
      ...current,
      participantGenders: {
        ...current.participantGenders,
        [characterId]: gender,
      },
    }));
  };

  const updateSharedAnswer = (relationshipId: string, questionId: string, value: string) => {
    updateQuestionnaire(relationshipId, (current) => ({
      ...current,
      sharedAnswers: {
        ...current.sharedAnswers,
        [questionId]: value,
      },
    }));
  };

  const updatePersonalAnswer = (relationshipId: string, characterId: string, questionId: string, value: string) => {
    updateQuestionnaire(relationshipId, (current) => ({
      ...current,
      personalAnswers: {
        ...current.personalAnswers,
        [characterId]: {
          ...(current.personalAnswers[characterId] || {}),
          [questionId]: value,
        },
      },
    }));
  };

  const toggleSection = (sectionId: string) => {
    setOpenSectionIds((current) =>
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId]
    );
  };

  const contextFor = (
    characterA: string,
    characterB: string,
    genderA: CharacterGender,
    genderB: CharacterGender
  ): RelationshipQuestionTextContext => ({
    characterA,
    characterB,
    genderA,
    genderB,
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="rounded-2xl border border-[var(--theme-border)]/40 bg-[var(--theme-secondary)]/20 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h4 className="handwritten text-3xl font-bold text-[var(--theme-primary)]">שאלון עומק למערכת היחסים</h4>
            <p className="mt-1 text-sm leading-relaxed text-[var(--theme-primary)]/60">
              בחרו מגדר לכל דמות כדי להתאים את ניסוח השאלות. התשובות נשמרות לפי מזהי השאלות והדמויות.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <GenderSelector
              label={char1Name}
              characterId={rel.char1Id}
              gender={genderForChar1}
              onChange={(gender) => updateParticipantGender(rel.id, rel.char1Id, gender)}
            />
            <GenderSelector
              label={char2Name}
              characterId={rel.char2Id}
              gender={genderForChar2}
              onChange={(gender) => updateParticipantGender(rel.id, rel.char2Id, gender)}
            />
          </div>
        </div>
      </div>

      {!canShowQuestions ? (
        <div className="rounded-2xl border-2 border-dashed border-[var(--theme-border)]/40 bg-white/40 p-6 text-center text-sm font-bold text-[var(--theme-primary)]/50">
          בחרו שתי דמויות וסמנו את המגדר של כל אחת כדי לפתוח את שאלון מערכת היחסים.
        </div>
      ) : (
        <div className="space-y-4">
          {relationshipQuestionSections.map((section) => {
            const isOpen = openSectionIds.includes(section.id);

            return (
              <section
                key={section.id}
                className="overflow-hidden rounded-2xl border border-[var(--theme-border)]/40 bg-white/50"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-right transition-colors hover:bg-[var(--theme-secondary)]/30"
                >
                  <span className="text-base font-bold text-[var(--theme-primary)]">{section.title}</span>
                  <ChevronRight
                    size={18}
                    className={`shrink-0 text-[var(--theme-accent)] transition-transform ${isOpen ? '-rotate-90' : 'rotate-180'}`}
                  />
                </button>

                {isOpen && (
                  <div className="space-y-8 border-t border-[var(--theme-border)]/30 p-5">
                    {section.blocks.map((block, blockIndex) => (
                      <div key={`${section.id}-${block.type}-${blockIndex}`} className="space-y-4">
                        {block.label && (
                          <h5 className="text-sm font-bold text-[var(--theme-primary)]/70">{block.label}</h5>
                        )}

                        {block.type === 'shared' ? (
                          <div className="space-y-4">
                            {block.questions.map((question) => (
                              <label key={question.id} className="block space-y-2">
                                <span className="block text-sm font-bold leading-relaxed text-[var(--theme-primary)]">
                                  {question.getText(contextFor(char1Name, char2Name, resolvedGenderForChar1, resolvedGenderForChar2))}
                                </span>
                                <textarea
                                  dir="rtl"
                                  value={questionnaire.sharedAnswers[question.id] || ''}
                                  onChange={(event) => updateSharedAnswer(rel.id, question.id, event.target.value)}
                                  className="min-h-[88px] w-full resize-y rounded-xl border border-[var(--theme-border)]/40 bg-white/80 px-4 py-3 text-sm leading-relaxed text-[var(--theme-primary)] outline-none transition-all focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)]/20"
                                />
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {[
                              {
                                characterId: rel.char1Id,
                                characterA: char1Name,
                                characterB: char2Name,
                                genderA: resolvedGenderForChar1,
                                genderB: resolvedGenderForChar2,
                              },
                              {
                                characterId: rel.char2Id,
                                characterA: char2Name,
                                characterB: char1Name,
                                genderA: resolvedGenderForChar2,
                                genderB: resolvedGenderForChar1,
                              },
                            ].map((column) => (
                              <div key={column.characterId} className="space-y-4 rounded-2xl bg-[var(--theme-secondary)]/20 p-4">
                                <h5 className="sticky top-0 rounded-xl bg-[var(--theme-card)]/95 px-3 py-2 text-sm font-bold text-[var(--theme-primary)] shadow-sm">
                                  {column.characterA}
                                </h5>
                                {block.questions.map((question) => (
                                  <label key={`${column.characterId}-${question.id}`} className="block space-y-2">
                                    <span className="block text-sm font-bold leading-relaxed text-[var(--theme-primary)]">
                                      {question.getText(contextFor(column.characterA, column.characterB, column.genderA, column.genderB))}
                                    </span>
                                    <textarea
                                      dir="rtl"
                                      value={questionnaire.personalAnswers[column.characterId]?.[question.id] || ''}
                                      onChange={(event) => updatePersonalAnswer(rel.id, column.characterId, question.id, event.target.value)}
                                      className="min-h-[88px] w-full resize-y rounded-xl border border-[var(--theme-border)]/40 bg-white/80 px-4 py-3 text-sm leading-relaxed text-[var(--theme-primary)] outline-none transition-all focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)]/20"
                                    />
                                  </label>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RelationshipQuestionnaire;
