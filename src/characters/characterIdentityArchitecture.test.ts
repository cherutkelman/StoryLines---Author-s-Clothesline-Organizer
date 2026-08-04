import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('character identity infrastructure wiring', () => {
  it('routes every current character creation path through the factory', () => {
    const questionnaires = read('components/Questionnaires.tsx');
    const characterMap = read('components/CharacterMap.tsx');
    const relationshipDynamics = read('components/plot-planning/RelationshipDynamicsTable.tsx');
    const relationshipArc = read('components/plot-planning/RelationshipArcEditor.tsx');
    const mapImporter = read('components/maps/MapsImportDialog.tsx');

    expect(questionnaires).toContain('? createCharacterEntry()');
    expect(characterMap).toContain('const newNode = createCharacterEntry();');
    expect(relationshipDynamics).toContain('createCharacterEntry({ name })');
    expect(relationshipArc).toContain('createPlanningCharacter(newName)');
    expect(mapImporter).toContain('createCharacterEntry({ ...character, x: undefined, y: undefined })');

    const characterCreationSources = [
      questionnaires,
      characterMap,
      relationshipDynamics,
      relationshipArc,
      mapImporter,
    ].join('\n');
    expect(characterCreationSources).not.toMatch(/`char-\$\{Date\.now\(\)/);
  });

  it('keeps map creation, removal, and rename connected to the book character list', () => {
    const characterMap = read('components/CharacterMap.tsx');
    const workspace = read('components/maps/CharacterMapsWorkspace.tsx');

    expect(characterMap).toContain('onUpdateCharacters([...characters, newNode])');
    expect(characterMap).toContain('onUpdateCharacters(characters.filter(n => n.id !== id))');
    expect(characterMap).toContain("updateNode(node.id, { name: e.target.value })");
    expect(workspace).toContain('if (!updated) return character;');
    expect(workspace).toContain('onUpdateCharacters([');
  });

  it('keeps map imports as copies while assigning factory identities', () => {
    const importer = read('components/maps/MapsImportDialog.tsx');

    expect(importer).toContain('(sourceBook.characters || []).map');
    expect(importer).toContain('characterIdMap[character.id] = importedCharacter.id');
    expect(importer).toContain('onUpdateCharacters([...characters, ...importedCharacters])');
  });
});
