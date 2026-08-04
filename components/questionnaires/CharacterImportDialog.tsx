import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Search, UserRound, X } from 'lucide-react';
import type { Book, CharacterEntry } from '../../types';
import { getCharacterImportAvailability, importLinkedCharacterIntoBook } from '../../src/characters/characterImport';

export type CharacterImportSourceBook = Pick<Book, 'id' | 'title' | 'characters'>;

interface Props {
  isOpen: boolean;
  sourceBooks: CharacterImportSourceBook[];
  activeBookId: string;
  targetCharacters: CharacterEntry[];
  onUpdateCharacters: (characters: CharacterEntry[]) => void;
  onSelectCharacter: (characterId: string) => void;
  onClose: () => void;
}

export const filterCharacterImportSources = (books: CharacterImportSourceBook[], activeBookId: string) =>
  books.filter(book => book.id !== activeBookId);

export const filterCharactersByName = (characters: CharacterEntry[], query: string) => {
  const normalized = query.trim().toLocaleLowerCase();
  return normalized
    ? characters.filter(character => character.name.toLocaleLowerCase().includes(normalized))
    : characters;
};

const CharacterImportDialog: React.FC<Props> = ({
  isOpen, sourceBooks, activeBookId, targetCharacters,
  onUpdateCharacters, onSelectCharacter, onClose,
}) => {
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const availableBooks = useMemo(
    () => filterCharacterImportSources(sourceBooks, activeBookId),
    [sourceBooks, activeBookId]
  );
  const selectedBook = availableBooks.find(book => book.id === selectedBookId);
  const sourceCharacters = (selectedBook?.characters || []) as CharacterEntry[];
  const visibleCharacters = filterCharactersByName(sourceCharacters, searchQuery);
  const allAlreadyExist = sourceCharacters.length > 0 && sourceCharacters.every(character =>
    getCharacterImportAvailability(targetCharacters, character).status === 'already_exists'
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) return;
    setSelectedBookId(null);
    setSearchQuery('');
    setErrorMessage('');
  }, [isOpen]);

  if (!isOpen) return null;

  const closeAndSelect = (id: string) => {
    onClose();
    onSelectCharacter(id);
  };

  const importCharacter = (source: CharacterEntry) => {
    setErrorMessage('');
    const result = importLinkedCharacterIntoBook(targetCharacters, source);
    if (result.status === 'imported') {
      onUpdateCharacters(result.characters);
      closeAndSelect(result.importedCharacter.id);
    } else if (result.status === 'already_exists') {
      setErrorMessage('הדמות כבר קיימת בספר הזה.');
    } else {
      setErrorMessage('לא ניתן לייבא את הדמות משום שזהותה אינה תקינה.');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6" dir="rtl"
      onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="character-import-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[var(--theme-border)]/50 bg-[var(--theme-card)] shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-[var(--theme-border)]/40 p-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <UserRound className="shrink-0 text-[var(--theme-primary)]" size={26} />
            <div className="min-w-0">
              <h2 id="character-import-title" className="truncate text-xl font-bold text-[var(--theme-primary)] sm:text-2xl">ייבוא דמות מספר אחר</h2>
              <p className="mt-1 truncate text-xs text-[var(--theme-text)]/50">
                {selectedBook ? `בחירת דמות מתוך ${selectedBook.title}` : 'בחירת ספר מקור'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="סגירת חלון ייבוא דמות"
            className="rounded-xl p-3 text-[var(--theme-primary)]/60 hover:bg-[var(--theme-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/20">
            <X size={22} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {!selectedBook ? (
            availableBooks.length === 0 ? (
              <EmptyState>אין ספרים אחרים שמהם אפשר לייבא דמות.</EmptyState>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2" aria-label="ספרי מקור">
                {availableBooks.map(book => {
                  const count = book.characters?.length || 0;
                  return (
                    <button key={book.id} type="button" onClick={() => setSelectedBookId(book.id)}
                      className="flex min-h-20 items-center gap-3 rounded-2xl border border-[var(--theme-border)]/50 p-4 text-right hover:bg-[var(--theme-secondary)]/40 focus:outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/20">
                      <BookOpen className="shrink-0 text-[var(--theme-primary)]/60" size={22} />
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-[var(--theme-primary)]">{book.title}</span>
                        <span className="mt-1 block text-xs text-[var(--theme-text)]/50">{count ? `${count} דמויות` : 'אין דמויות בספר הזה'}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div className="space-y-4">
              <button type="button" onClick={() => { setSelectedBookId(null); setSearchQuery(''); setErrorMessage(''); }}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/20">
                <ArrowRight size={18} /> חזרה לרשימת הספרים
              </button>
              {sourceCharacters.length === 0 ? <EmptyState>אין דמויות בספר הזה.</EmptyState> : (
                <>
                  <label className="relative block">
                    <span className="sr-only">חיפוש דמות לפי שם</span>
                    <Search className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--theme-primary)]/40" size={18} />
                    <input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)}
                      placeholder="חיפוש לפי שם הדמות"
                      className="w-full rounded-2xl border border-[var(--theme-border)]/50 bg-[var(--theme-secondary)]/30 py-3.5 pr-11 pl-4 text-sm outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/20" />
                  </label>
                  {allAlreadyExist && <p className="rounded-2xl bg-[var(--theme-secondary)]/50 p-4 text-center text-sm font-bold">כל הדמויות בספר הזה כבר קיימות בספר הנוכחי.</p>}
                  {errorMessage && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{errorMessage}</p>}
                  <div className="max-h-[52vh] space-y-3 overflow-y-auto" aria-label="דמויות לייבוא">
                    {visibleCharacters.map(character => {
                      const availability = getCharacterImportAvailability(targetCharacters, character);
                      return (
                        <article key={character.id} className="flex flex-col gap-3 rounded-2xl border border-[var(--theme-border)]/40 p-4 sm:flex-row sm:items-center">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            {character.imageUrl
                              ? <img src={character.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                              : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--theme-secondary)]"><UserRound size={22} /></span>}
                            <div className="min-w-0">
                              <h3 className="truncate font-bold text-[var(--theme-primary)]">{character.name}</h3>
                              {availability.status === 'already_exists' && <p className="mt-1 text-xs text-[var(--theme-text)]/60">הדמות כבר קיימת בספר הזה.</p>}
                              {availability.status === 'invalid_source_identity' && <p className="mt-1 text-xs text-red-600">לא ניתן לייבא את הדמות משום שזהותה אינה תקינה.</p>}
                            </div>
                          </div>
                          {availability.status === 'available' ? (
                            <button type="button" onClick={() => importCharacter(character)} className="min-h-11 rounded-xl bg-[var(--theme-primary)] px-5 text-sm font-bold text-[var(--theme-card)] focus:outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/25">ייבוא הדמות</button>
                          ) : availability.status === 'already_exists' ? (
                            <button type="button" onClick={() => closeAndSelect(availability.existingCharacter.id)} className="min-h-11 rounded-xl border border-[var(--theme-border)] px-5 text-sm font-bold text-[var(--theme-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/20">פתחי את הדמות הקיימת</button>
                          ) : null}
                        </article>
                      );
                    })}
                    {visibleCharacters.length === 0 && <p className="p-6 text-center text-sm text-[var(--theme-text)]/50">לא נמצאו דמויות בשם הזה.</p>}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const EmptyState: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="rounded-2xl border-2 border-dashed border-[var(--theme-border)]/40 p-8 text-center text-sm font-bold text-[var(--theme-text)]/50">{children}</div>
);

export default CharacterImportDialog;
