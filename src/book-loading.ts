import type { Book } from '../types';

type LoadableBook = Book & {
  scenes?: Book['scenes'];
  plotlines?: Book['plotlines'];
};

export type SeparatedBookStructure = Partial<Pick<
  Book,
  'plotlines' | 'chapterMarkers' | 'bookSequence'
>>;

export const mergeSeparatedBookStructure = (
  book: LoadableBook,
  separatedScenes?: Book['scenes'],
  separatedStructure?: SeparatedBookStructure
): LoadableBook => ({
  ...book,
  scenes: book.scenes ?? separatedScenes,
  plotlines: book.plotlines ?? separatedStructure?.plotlines,
  chapterMarkers: book.chapterMarkers ?? separatedStructure?.chapterMarkers,
  bookSequence: book.bookSequence ?? separatedStructure?.bookSequence,
});

const normalizeOptionalArray = <T>(
  bookId: string,
  field: string,
  value: T[] | null | undefined
): T[] => {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new TypeError(`Invalid book ${bookId}: ${field} must be an array.`);
  }
  return value;
};

/**
 * Firestore can return legacy or partially hydrated book documents. Keep the
 * in-memory Project contract stable while preserving missing bookSequence as
 * the signal that legacy position ordering should be used.
 */
export const normalizeLoadedBookCollections = (book: LoadableBook): Book => ({
  ...book,
  scenes: normalizeOptionalArray(book.id, 'scenes', book.scenes),
  plotlines: normalizeOptionalArray(book.id, 'plotlines', book.plotlines),
  chapterMarkers: normalizeOptionalArray(book.id, 'chapterMarkers', book.chapterMarkers),
  bookSequence: book.bookSequence == null
    ? undefined
    : normalizeOptionalArray(book.id, 'bookSequence', book.bookSequence),
});
