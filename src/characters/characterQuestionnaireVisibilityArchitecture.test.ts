import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('character questionnaire visibility architecture', () => {
  it('limits questionnaire filtering to the questionnaire coordinator', () => {
    const questionnaires = read('components/Questionnaires.tsx');
    const characterMap = read('components/CharacterMap.tsx');

    expect(questionnaires).toContain('characters.filter(isCharacterVisibleInQuestionnaire)');
    expect(questionnaires).toContain("activeTab === 'characters' ? questionnaireCharacters");
    expect(characterMap).not.toContain('isCharacterVisibleInQuestionnaire');
  });

  it('creates map characters hidden and direct questionnaire imports visible', () => {
    const characterMap = read('components/CharacterMap.tsx');
    const mapImport = read('components/maps/MapsImportDialog.tsx');
    const directImport = read('src/characters/characterImport.ts');

    expect(characterMap).toContain("createCharacterEntry({ questionnaireVisibility: 'hidden' })");
    expect(mapImport).toContain('getSourceCharacterIdsForImportedMaps(itemsToImport as CharacterDiagram[])');
    expect(mapImport).toContain('prepareCharactersForImportedMaps(');
    expect(directImport).toContain("questionnaireVisibility: 'hidden'");
    expect(directImport).toContain("questionnaireVisibility: 'visible'");
  });

  it('restores one local record through an active-book-only handler', () => {
    const app = read('App.tsx');
    const questionnaires = read('components/Questionnaires.tsx');

    expect(app).toContain('if (book.id !== activeBookId) return book;');
    expect(app).toContain('restoreCharacterInListToQuestionnaire(book.characters || [], characterId)');
    expect(app).toContain('onRestoreCharacterToQuestionnaire={restoreCharacterToActiveQuestionnaire}');
    expect(questionnaires).toContain('onRestoreCharacterToQuestionnaire(characterId)');
    expect(questionnaires).toContain("setMode('edit')");
  });

  it('does not add questionnaire visibility to shared synchronization fields', () => {
    const shared = read('src/characters/characterSharedData.ts');
    expect(shared).not.toContain('questionnaireVisibility');
  });
});
