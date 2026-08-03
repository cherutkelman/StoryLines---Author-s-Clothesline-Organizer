import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('questionnaire architecture', () => {
  it('keeps static questionnaire definitions outside the coordinator', () => {
    const coordinator = read('components/Questionnaires.tsx');
    const definitions = read('components/questionnaires/questionnaireDefinitions.ts');

    expect(coordinator).not.toContain('const FEMALE_QUESTIONS_CONFIG');
    expect(coordinator).not.toContain('const PERIOD_QUESTIONS');
    expect(coordinator).not.toContain('const FANTASY_WORLD_QUESTIONS');
    expect(definitions).toContain('export const FEMALE_QUESTIONS_CONFIG');
    expect(definitions).toContain('export const PERIOD_QUESTIONS');
    expect(definitions).toContain('export const FANTASY_WORLD_QUESTIONS');
  });

  it('routes every questionnaire type through its dedicated component', () => {
    const coordinator = read('components/Questionnaires.tsx');

    [
      'CharacterQuestionnaire',
      'PlaceQuestionnaire',
      'PeriodQuestionnaire',
      'TwistQuestionnaire',
      'FantasyWorldQuestionnaire',
      'BackgroundQuestionnaire',
      'RelationshipQuestionnaire',
    ].forEach(component => expect(coordinator).toContain(component));
  });

  it('keeps accordion markup in the shared questionnaire infrastructure', () => {
    const sharedContainer = read('components/questionnaires/QuestionnaireAccordionContainer.tsx');
    const standardQuestionnaire = read('components/questionnaires/StandardAccordionQuestionnaire.tsx');
    const background = read('components/questionnaires/BackgroundQuestionnaire.tsx');

    expect(sharedContainer).toContain('QuestionnaireAccordion');
    expect(standardQuestionnaire).toContain('QuestionnaireAccordion');
    expect(background).not.toContain('QuestionnaireAccordion');
  });
});
