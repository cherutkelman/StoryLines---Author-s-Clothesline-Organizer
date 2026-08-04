import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import type { CharacterEntry } from '../../types';
import CharacterImportDialog, {
  filterCharacterImportSources,
  filterCharactersByName,
  type CharacterImportSourceBook,
} from './CharacterImportDialog';

const character = (name: string): CharacterEntry => ({
  id: uuidv4(),
  characterEntityId: uuidv4(),
  name,
  data: {},
});

const book = (
  id: string,
  title: string,
  characters: CharacterEntry[] = []
): CharacterImportSourceBook => ({ id, title, characters });

const renderDialog = (sourceBooks: CharacterImportSourceBook[], activeBookId = 'target') =>
  renderToStaticMarkup(
    <CharacterImportDialog
      isOpen
      sourceBooks={sourceBooks}
      activeBookId={activeBookId}
      targetCharacters={[]}
      onUpdateCharacters={vi.fn()}
      onSelectCharacter={vi.fn()}
      onClose={vi.fn()}
    />
  );

describe('CharacterImportDialog', () => {
  it('does not render while closed', () => {
    const html = renderToStaticMarkup(
      <CharacterImportDialog
        isOpen={false}
        sourceBooks={[]}
        activeBookId="target"
        targetCharacters={[]}
        onUpdateCharacters={vi.fn()}
        onSelectCharacter={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(html).toBe('');
  });

  it('renders an accessible RTL dialog and the no-books state', () => {
    const html = renderDialog([book('target', 'Target book')]);

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('ייבוא דמות מספר אחר');
    expect(html).toContain('אין ספרים אחרים שמהם אפשר לייבא דמות.');
    expect(html).toContain('aria-label="סגירת חלון ייבוא דמות"');
  });

  it('excludes the target and displays source names and character counts', () => {
    const html = renderDialog([
      book('target', 'Target book', [character('Target character')]),
      book('source', 'Source book', [character('One'), character('Two')]),
      book('empty', 'Empty book'),
    ]);

    expect(html).not.toContain('Target book');
    expect(html).toContain('Source book');
    expect(html).toContain('2 דמויות');
    expect(html).toContain('Empty book');
    expect(html).toContain('אין דמויות בספר הזה');
  });
});

describe('character import presentation helpers', () => {
  it('filters out only the active target book', () => {
    const books = [book('target', 'Target'), book('source', 'Source')];
    expect(filterCharacterImportSources(books, 'target')).toEqual([books[1]]);
  });

  it('filters case-insensitively by name only without mutating the list', () => {
    const characters = [character('Alice'), character('BOB')];
    const snapshot = [...characters];

    expect(filterCharactersByName(characters, 'ali')).toEqual([characters[0]]);
    expect(filterCharactersByName(characters, 'bob')).toEqual([characters[1]]);
    expect(filterCharactersByName(characters, '')).toBe(characters);
    expect(characters).toEqual(snapshot);
  });
});
