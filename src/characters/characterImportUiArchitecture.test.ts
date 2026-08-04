import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('linked character import UI wiring', () => {
  it('offers two character actions while keeping other questionnaire additions direct', () => {
    const questionnaires = read('components/Questionnaires.tsx');

    expect(questionnaires).toContain("if (activeTab === 'characters')");
    expect(questionnaires).toContain('setIsCharacterAddMenuOpen(true)');
    expect(questionnaires).toContain('יצירת דמות חדשה');
    expect(questionnaires).toContain('ייבוא דמות מספר אחר');
    expect(questionnaires).toContain('const newEntry = createCharacterEntry();');
    expect(questionnaires).toContain('const newEntry: QuestionnaireEntry = {');
  });

  it('uses the domain operation once and selects imported or existing local records', () => {
    const dialog = read('components/questionnaires/CharacterImportDialog.tsx');

    expect(dialog).toContain('getCharacterImportAvailability(targetCharacters, character)');
    expect(dialog).toContain('importLinkedCharacterIntoBook(targetCharacters, source)');
    expect(dialog).toContain('onUpdateCharacters(result.characters)');
    expect(dialog).toContain('closeAndSelect(result.importedCharacter.id)');
    expect(dialog).toContain('closeAndSelect(availability.existingCharacter.id)');
    expect(dialog).not.toMatch(/\.name\s*===/);
  });

  it('uses already-loaded books and leaves map importing independent', () => {
    const app = read('App.tsx');
    const questionnaires = read('components/Questionnaires.tsx');
    const mapImporter = read('components/maps/MapsImportDialog.tsx');

    expect(app).toContain('allBooks={books}');
    expect(app).toContain('activeBookId={activeBookId}');
    expect(questionnaires).toContain('sourceBooks={allBooks}');
    expect(mapImporter).toContain('prepareCharactersForImportedMaps(');
    expect(mapImporter).not.toContain('createLinkedCharacterImport');
  });

  it('does not add imported characters to a character map', () => {
    const dialog = read('components/questionnaires/CharacterImportDialog.tsx');

    expect(dialog).not.toContain('onUpdateCharacterMaps');
    expect(dialog).not.toContain('characterIds');
    expect(dialog).not.toContain('positions');
  });
});
