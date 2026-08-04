import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('twists in plot planning', () => {
  it('has one active rendering path in plot planning', () => {
    const questionnaires = readFileSync('components/Questionnaires.tsx', 'utf8');
    const planning = readFileSync('components/PlotStructure.tsx', 'utf8');
    const navigation = readFileSync('components/questionnaireNavigation.ts', 'utf8');
    expect(questionnaires).not.toContain('TwistQuestionnaire');
    expect(planning.match(/<TwistPlanningEditor\b/g)).toHaveLength(1);
    expect(navigation).not.toContain("id: 'twists'");
  });

  it('uses the existing picker and a backwards-compatible link map', () => {
    const twist = readFileSync('components/questionnaires/TwistQuestionnaire.tsx', 'utf8');
    const types = readFileSync('types.ts', 'utf8');
    expect(twist).toContain("../plot-planning/MultiScenePicker");
    expect(types).toContain('sceneIdsByQuestionId?: Record<string, string[]>');
    expect(twist).not.toContain('updateActiveBook');
  });
});
