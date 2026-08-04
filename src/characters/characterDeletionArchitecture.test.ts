import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('character deletion wiring', () => {
  it('removes a map node through one explicit membership callback', () => {
    const characterMap = read('components/CharacterMap.tsx');
    const workspace = read('components/maps/CharacterMapsWorkspace.tsx');

    expect(characterMap).toContain('להסיר את הדמות מהמפה? הדמות תישאר ברשימת הדמויות של הספר.');
    expect(characterMap).toContain('onRemoveCharacterFromMap(id)');
    expect(characterMap).toContain('aria-label="הסרת דמות מהמפה"');
    expect(workspace).toContain('removeCharacterFromMap(currentMap, characterId)');
    expect(workspace).toContain('onRemoveCharacterFromMap={removeCharacter}');
  });

  it('routes questionnaire character deletion through an active-book-only App handler', () => {
    const questionnaires = read('components/Questionnaires.tsx');
    const app = read('App.tsx');

    expect(questionnaires).toContain('למחוק את הדמות מהספר? הדמות תוסר גם מכל מפות הדמויות בספר.');
    expect(questionnaires).toContain('onDeleteCharacter(entryId)');
    expect(questionnaires).toContain('handleEntrySelect(null)');
    expect(app).toContain('deleteCharacterFromBook(book, characterId)');
    expect(app).toContain('if (book.id !== activeBookId) return book;');
    expect(app).toContain('onDeleteCharacter={deleteCharacterFromActiveBook}');
    expect(app).not.toContain("updateActiveBook(deleteCharacterFromBook");
  });
});
