import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('plot planning architecture', () => {
  it('keeps template definitions and public props outside the coordinator', () => {
    const coordinator = read('components/PlotStructure.tsx');
    const definitions = read('components/plot-planning/plotPlanningDefinitions.ts');
    const types = read('components/plot-planning/plotPlanningTypes.ts');

    expect(coordinator).not.toContain('const STRUCTURES');
    expect(coordinator).not.toContain('const THREE_ACT_POINTS');
    expect(coordinator).not.toContain('interface PlotStructureProps');
    expect(definitions).toContain('export const STRUCTURES');
    expect(definitions).toContain('export const THREE_ACT_POINTS');
    expect(types).toContain('export interface PlotStructureProps');
  });

  it('routes every planning mode through an independent editor', () => {
    const coordinator = read('components/PlotStructure.tsx');

    expect(coordinator).toContain('<PlotPlanningNavigation');
    expect(coordinator).toContain('<PlotStructureEditor');
    expect(coordinator).toContain('<CharacterArcEditor');
    expect(coordinator).toContain('<RelationshipArcEditor');
    expect(coordinator).toContain('<ConflictEditor');
    expect(coordinator).toContain('<TwistPlanningEditor');
    expect(coordinator).not.toContain('const MultiScenePicker');
    expect(coordinator).not.toContain('const RelationshipDynamicsTable');
    expect(coordinator).not.toContain('מבנה שלוש המערכות');
    expect(coordinator).not.toContain('מטרות, בעיות והישגים');
    expect(coordinator).not.toContain('קשת ההתפתחות של הדמות');

    const relationshipEditor = read('components/plot-planning/RelationshipArcEditor.tsx');
    expect(relationshipEditor).toContain('<RelationshipDynamicsTable');

    const structureEditor = read('components/plot-planning/PlotStructureEditor.tsx');
    const characterArcEditor = read('components/plot-planning/CharacterArcEditor.tsx');
    const conflictEditor = read('components/plot-planning/ConflictEditor.tsx');
    const twistEditor = read('components/plot-planning/TwistPlanningEditor.tsx');
    expect(structureEditor).toContain('STRUCTURES.map');
    expect(characterArcEditor).toContain('<MultiScenePicker');
    expect(conflictEditor).toContain('<MultiScenePicker');
    expect(twistEditor).toContain('<TwistQuestionnaire');
    expect(read('components/questionnaires/TwistQuestionnaire.tsx')).toContain('<MultiScenePicker');
  });

  it('keeps one coordinator-owned callback path to the book state', () => {
    const app = read('App.tsx');
    const extractedFiles = [
      'components/plot-planning/PlotPlanningNavigation.tsx',
      'components/plot-planning/MultiScenePicker.tsx',
      'components/plot-planning/CharacterLinkSelect.tsx',
      'components/plot-planning/characterLinkedRow.ts',
      'components/plot-planning/RelationshipDynamicsTable.tsx',
      'components/plot-planning/RelationshipArcEditor.tsx',
      'components/plot-planning/PlotStructureEditor.tsx',
      'components/plot-planning/CharacterArcEditor.tsx',
      'components/plot-planning/ConflictEditor.tsx',
      'components/plot-planning/TwistPlanningEditor.tsx',
      'components/plot-planning/plotPlanningDefinitions.ts',
    ].map(read).join('\n');

    expect(app).toContain('onUpdatePoint=');
    expect(app).toContain('onUpdateArcs=');
    expect(app).toContain('onUpdateRelationships=');
    expect(app).toContain('onUpdateConflicts=');
    expect(app).toContain('onUpdateTwists=');
    expect(extractedFiles).not.toContain('updateActiveBook');
  });
});
