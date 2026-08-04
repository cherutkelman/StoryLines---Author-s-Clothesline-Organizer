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

    expect(questionnaires).toContain('const newEntry = createCharacterEntry();');
    expect(characterMap).toContain("const newNode = createCharacterEntry({ questionnaireVisibility: 'hidden' });");
    expect(relationshipDynamics).toContain('createCharacterEntry({ name })');
    expect(relationshipArc).toContain('createPlanningCharacter(newName)');
    expect(mapImporter).toContain('prepareCharactersForImportedMaps(');

    const characterCreationSources = [
      questionnaires,
      characterMap,
      relationshipDynamics,
      relationshipArc,
      mapImporter,
    ].join('\n');
    expect(characterCreationSources).not.toMatch(/`char-\$\{Date\.now\(\)/);
  });

  it('keeps map creation and rename connected to the book list while removal changes only membership', () => {
    const characterMap = read('components/CharacterMap.tsx');
    const workspace = read('components/maps/CharacterMapsWorkspace.tsx');

    expect(characterMap).toContain('onUpdateCharacters([...characters, newNode])');
    expect(characterMap).toContain('onRemoveCharacterFromMap(id)');
    expect(characterMap).not.toContain('onUpdateCharacters(characters.filter(n => n.id !== id))');
    expect(characterMap).toContain("updateNode(node.id, { name: e.target.value })");
    expect(workspace).toContain('if (!updated) return character;');
    expect(workspace).toContain('onUpdateCharacters([');
  });

  it('keeps map imports as map copies while reusing linked character identities', () => {
    const importer = read('components/maps/MapsImportDialog.tsx');

    expect(importer).toContain('getSourceCharacterIdsForImportedMaps(itemsToImport as CharacterDiagram[])');
    expect(importer).toContain('prepareCharactersForImportedMaps(');
    expect(importer).toContain('remapImportedCharacterMap(item, characterIdMap, newId)');
    expect(importer).toContain('if (prepared.addedCharacters.length > 0) onUpdateCharacters(prepared.characters)');
    expect(importer).not.toContain('(sourceBook.characters || []).map');
  });

  it('normalizes identities in the shared load path and backup import path', () => {
    const app = read('App.tsx');

    expect(app).toContain('const normalizeLoadedBooks = async');
    expect(app).toContain('normalizeBookCharacterIdentities(sceneNormalizedBook, now).book');
    expect(app).toContain('normalizeLoadedBooks(await loadBooks())');
    expect(app).toContain('normalizeLoadedBooks(syncResult.updatedBooks)');
    expect(app).toContain('normalizeBookCharacterIdentities(parsed as Book).book');
  });

  it('keeps existing map and relationship references on book-local character ids', () => {
    const types = read('types.ts');

    expect(types).toContain('characterIds?: string[]');
    expect(types).toContain('fromId: string');
    expect(types).toContain('toId: string');
    expect(types).toContain('char1Id: string');
    expect(types).toContain('char2Id: string');
    expect(types).not.toContain('characterEntityIds?: string[]');
  });
});
