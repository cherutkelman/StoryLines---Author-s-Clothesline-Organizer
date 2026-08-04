import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('character questionnaire removal architecture', () => {
  it('opens a dedicated dialog instead of deleting or confirming immediately', () => {
    const questionnaires = read('components/Questionnaires.tsx');

    expect(questionnaires).toContain("if (activeTab === 'characters') {");
    expect(questionnaires).toContain('setCharacterRemovalCandidateId(entryId);');
    expect(questionnaires).toContain('<CharacterRemovalDialog');
    expect(questionnaires).toContain('character={characterRemovalCandidate}');
    expect(questionnaires).not.toContain("confirm('למחוק את הדמות מהספר");
  });

  it('cleans the selected character UI after either explicit action', () => {
    const questionnaires = read('components/Questionnaires.tsx');

    expect(questionnaires).toContain('const finishCharacterRemoval = (characterId: string) =>');
    expect(questionnaires).toContain('setCharacterRemovalCandidateId(null)');
    expect(questionnaires).toContain('setIsCharacterSyncOpen(false)');
    expect(questionnaires).toContain("setCharacterSyncFeedback('')");
    expect(questionnaires).toContain("setMode('view')");
    expect(questionnaires).toContain('if (selectedEntryId === characterId) {');
    expect(questionnaires).toContain('handleEntrySelect(null)');
  });

  it('keeps generic questionnaire deletion on its existing confirmation path', () => {
    const questionnaires = read('components/Questionnaires.tsx');

    expect(questionnaires).toContain('if (!confirm(genericConfirmation))');
    expect(questionnaires).toContain('updateFn(entries.filter(entry => entry.id !== entryId))');
  });

  it('keeps cancellation and escape as no-op dialog closures', () => {
    const dialog = read('components/questionnaires/CharacterRemovalDialog.tsx');

    expect(dialog).toContain("if (event.key === 'Escape' && !submittingRef.current) onClose()");
    expect(dialog).toContain('if (event.target === event.currentTarget && !submittingRef.current) onClose()');
    expect(dialog).toContain('onClick={onClose}');
    expect(dialog).not.toContain('localStorage');
    expect(dialog).not.toContain('questionnaireVisibility');
  });

  it('keeps visibility out of cross-book shared fields and full deletion separate', () => {
    const shared = read('src/characters/characterSharedData.ts');
    const app = read('App.tsx');

    expect(shared).not.toContain('questionnaireVisibility');
    expect(app).toContain('hideCharacterInBookFromQuestionnaire(book, characterId)');
    expect(app).toContain('deleteCharacterFromBook(book, characterId)');
    expect(app).toContain('if (book.id !== activeBookId) return book;');
  });
});
