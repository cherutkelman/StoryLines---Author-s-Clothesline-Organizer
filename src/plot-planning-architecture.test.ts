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

  it('uses the extracted navigation and complex shared editors', () => {
    const coordinator = read('components/PlotStructure.tsx');

    expect(coordinator).toContain('<PlotPlanningNavigation');
    expect(coordinator).toContain('<MultiScenePicker');
    expect(coordinator).toContain('<RelationshipArcEditor');
    expect(coordinator).not.toContain('const MultiScenePicker');
    expect(coordinator).not.toContain('const RelationshipDynamicsTable');

    const relationshipEditor = read('components/plot-planning/RelationshipArcEditor.tsx');
    expect(relationshipEditor).toContain('<RelationshipDynamicsTable');
  });

  it('keeps one coordinator-owned callback path to the book state', () => {
    const app = read('App.tsx');
    const extractedFiles = [
      'components/plot-planning/PlotPlanningNavigation.tsx',
      'components/plot-planning/MultiScenePicker.tsx',
      'components/plot-planning/RelationshipDynamicsTable.tsx',
      'components/plot-planning/plotPlanningDefinitions.ts',
    ].map(read).join('\n');

    expect(app).toContain('onUpdatePoint=');
    expect(app).toContain('onUpdateArcs=');
    expect(app).toContain('onUpdateRelationships=');
    expect(app).toContain('onUpdateConflicts=');
    expect(extractedFiles).not.toContain('updateActiveBook');
  });
});
