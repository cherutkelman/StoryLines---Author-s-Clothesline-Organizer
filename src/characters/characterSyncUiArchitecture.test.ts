import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('character sync UI wiring', () => {
  it('shows the sync action only for a selected character', () => {
    const questionnaires = read('components/Questionnaires.tsx');

    expect(questionnaires).toContain("activeTab === 'characters' && selectedCharacter");
    expect(questionnaires).toContain('<span>סנכרון מידע</span>');
    expect(questionnaires).toContain('setIsCharacterSyncOpen(true)');
  });

  it('delegates planning and applying exclusively to the domain engine', () => {
    const dialog = read('components/questionnaires/CharacterSyncDialog.tsx');

    expect(dialog).toContain('buildCharacterSyncPlan(books, character.characterEntityId');
    expect(dialog).toContain('applyCharacterSyncResolutions(');
    expect(dialog).toContain('onApplyBooks(result.books)');
    expect(dialog).not.toMatch(/character\.name\s*===/);
  });

  it('updates the whole books array once without shared-field propagation', () => {
    const app = read('App.tsx');
    const callbackStart = app.indexOf('const applyCharacterSyncBooks');
    const callbackEnd = app.indexOf('\n  };', callbackStart);
    const callback = app.slice(callbackStart, callbackEnd);

    expect(callback).toContain('setBooks(nextBooks)');
    expect(callback).not.toContain('updateEntries');
    expect(callback).not.toContain('updateBookAndSharedFields');
    expect(app).toContain('onApplyCharacterSyncBooks={applyCharacterSyncBooks}');
  });

  it('does not switch active book or selected character during sync', () => {
    const dialog = read('components/questionnaires/CharacterSyncDialog.tsx');
    const questionnaires = read('components/Questionnaires.tsx');

    expect(dialog).not.toContain('setActiveBookId');
    expect(dialog).not.toContain('onUpdateCharacters');
    expect(questionnaires).not.toContain('onApplyCharacterSyncBooks={books =>');
  });

  it('keeps character and map imports unchanged', () => {
    const characterImport = read('components/questionnaires/CharacterImportDialog.tsx');
    const mapImport = read('components/maps/MapsImportDialog.tsx');

    expect(characterImport).toContain('importLinkedCharacterIntoBook');
    expect(mapImport).toContain('prepareCharactersForImportedMaps(');
  });
});
