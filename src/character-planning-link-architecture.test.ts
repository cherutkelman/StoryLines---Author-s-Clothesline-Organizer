import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('character planning link architecture', () => {
  it('uses one shared character selector in both planning tables', () => {
    const arc = read('components/plot-planning/CharacterArcEditor.tsx');
    const goals = read('components/plot-planning/ConflictEditor.tsx');
    const coordinator = read('components/PlotStructure.tsx');

    expect(arc).toContain('<CharacterLinkSelect');
    expect(goals).toContain('<CharacterLinkSelect');
    expect(arc).not.toContain('next.characterName = event.target.value');
    expect(goals).not.toContain('next.characterName = event.target.value');
    expect(coordinator.match(/characters=\{characters\}/g)).toHaveLength(3);
  });

  it('stores characterId and resolves display names from current book characters', () => {
    const arc = read('components/plot-planning/CharacterArcEditor.tsx');
    const goals = read('components/plot-planning/ConflictEditor.tsx');
    const types = read('types.ts');

    expect(arc).toContain('next.characterId = characterId');
    expect(goals).toContain('next.characterId = characterId');
    expect(arc).toContain("next.characterName = ''");
    expect(goals).toContain("next.characterName = ''");
    expect(arc).toContain('getCharacterLinkedRowDisplayName(item.arc, characters)');
    expect(goals).toContain('getCharacterLinkedRowDisplayName(item.conflict, characters)');
    expect(types.match(/characterId\?: string;/g)).toHaveLength(2);
  });

  it('normalizes unique legacy names only while a planning record is edited', () => {
    const arc = read('components/plot-planning/CharacterArcEditor.tsx');
    const goals = read('components/plot-planning/ConflictEditor.tsx');
    const linking = read('components/plot-planning/characterLinkedRow.ts');

    expect(arc).toContain('normalizeCharacterLinkOnEdit(nextArcs[arcIndex], characters)');
    expect(goals).toContain('normalizeCharacterLinkOnEdit(next[conflictIndex], characters)');
    expect(linking).toContain("matches.length === 1");
    expect(linking).not.toContain('useEffect');
  });
});
