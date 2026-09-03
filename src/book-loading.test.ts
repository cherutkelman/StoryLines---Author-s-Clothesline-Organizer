import { describe, expect, it } from 'vitest';
import type { Book } from '../types';
import { mergeSeparatedBookStructure, normalizeLoadedBookCollections } from './book-loading';

const partialBook = (fields: Partial<Book> = {}): Book => ({
  id: 'book-1',
  ownerId: 'owner-1',
  title: 'Partial book',
  createdAt: 1,
  updatedAt: 1,
  ...fields,
} as Book);

describe('loaded book collection normalization', () => {
  it('hydrates structure moved out of a newer Firestore book document', () => {
    const merged = mergeSeparatedBookStructure(
      partialBook(),
      [{ id: 's1', title: 'Scene', content: '', plotlineId: 'p1', position: 0 }],
      {
        plotlines: [{ id: 'p1', name: 'Main', color: '#123456' }],
        chapterMarkers: [{ id: 'c1', title: 'Chapter', position: 0 }],
        bookSequence: [{ id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' }],
      }
    );

    expect(merged.scenes?.map(scene => scene.id)).toEqual(['s1']);
    expect(merged.plotlines?.map(plotline => plotline.id)).toEqual(['p1']);
    expect(merged.chapterMarkers?.map(marker => marker.id)).toEqual(['c1']);
    expect(merged.bookSequence?.map(item => item.id)).toEqual(['chapter:c1']);
  });

  it('does not replace legacy arrays that are still present on the book document', () => {
    const legacyScenes = [{ id: 'legacy', title: 'Legacy', content: '', plotlineId: 'p1', position: 0 }];
    const merged = mergeSeparatedBookStructure(
      partialBook({ scenes: legacyScenes, plotlines: [] }),
      [{ id: 'split', title: 'Split', content: '', plotlineId: 'p1', position: 0 }],
      { plotlines: [{ id: 'p1', name: 'Split', color: '#123456' }] }
    );

    expect(merged.scenes).toBe(legacyScenes);
    expect(merged.plotlines).toEqual([]);
  });

  it('hydrates a partial Firestore book with missing required arrays', () => {
    expect(normalizeLoadedBookCollections(partialBook())).toMatchObject({
      scenes: [],
      plotlines: [],
      chapterMarkers: [],
    });
  });

  it('loads an empty book without creating a bookSequence', () => {
    const normalized = normalizeLoadedBookCollections(partialBook({ scenes: [], plotlines: [] }));

    expect(normalized.scenes).toEqual([]);
    expect(normalized.bookSequence).toBeUndefined();
  });

  it('loads a book with missing chapterMarkers and bookSequence', () => {
    const normalized = normalizeLoadedBookCollections(partialBook({
      scenes: [],
      plotlines: [{ id: 'p1', name: 'Main', color: '#123456' }],
    }));

    expect(normalized.chapterMarkers).toEqual([]);
    expect(normalized.bookSequence).toBeUndefined();
  });

  it('rejects malformed non-array data instead of hiding structural corruption', () => {
    expect(() => normalizeLoadedBookCollections(partialBook({ scenes: 'broken' } as unknown as Partial<Book>)))
      .toThrow('scenes must be an array');
  });
});
