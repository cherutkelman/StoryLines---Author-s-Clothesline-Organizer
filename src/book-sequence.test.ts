import { describe, expect, it } from 'vitest';
import type { BookSequenceItem, ChapterMarker, Project, Scene } from '../types';
import {
  BOOK_SEQUENCE_CHAPTER_DIVIDER_WIDTH,
  BOOK_SEQUENCE_SCENE_COLUMN_WIDTH,
  addChapterDividerToBookSequence,
  addSceneToBookSequence,
  createBookSequenceFromLegacyBook,
  deleteChapterDividerFromBookSequence,
  getBoardSequenceColumns,
  getBookSequenceDisplayItems,
  getChapterDividerLocation,
  getOrderedSceneIds,
  getOrderedScenes,
  moveSceneInBookSequence,
  moveChapterDividerInBookSequence,
  normalizeBookSequence,
  renameChapterInBookSequence,
} from './book-sequence';

const scene = (id: string, position: number, plotlineId = 'p1'): Scene => ({
  id,
  title: `Scene ${id}`,
  content: `Content ${id}`,
  plotlineId,
  position,
});

const chapter = (id: string, position: number): ChapterMarker => ({
  id,
  title: `Chapter ${id}`,
  position,
});

const project = (
  scenes: Scene[],
  chapterMarkers: ChapterMarker[] = [],
  bookSequence?: BookSequenceItem[]
): Project => ({
  plotlines: [{ id: 'p1', name: 'Plotline', color: '#123456' }],
  scenes,
  chapterMarkers,
  bookSequence,
});

describe('book sequence', () => {
  it('normalizes a permitted legacy or partial book with no scenes', () => {
    const partialBook = { plotlines: [] } as Partial<Project> as Project;

    expect(normalizeBookSequence(partialBook)).toEqual([]);
    expect(getBookSequenceDisplayItems(partialBook)).toEqual([]);
  });

  it('returns no display items for an empty book without chapter markers or bookSequence', () => {
    expect(getBookSequenceDisplayItems(project([]))).toEqual([]);
  });

  it('creates a sequence for a legacy book with scenes only', () => {
    expect(createBookSequenceFromLegacyBook(project([
      scene('s2', 1),
      scene('s1', 0),
    ]))).toEqual([
      { id: 'scene:s1', type: 'scene', sceneId: 's1' },
      { id: 'scene:s2', type: 'scene', sceneId: 's2' },
    ]);
  });

  it('creates a sequence for a legacy book with scenes and multiple chapters', () => {
    expect(createBookSequenceFromLegacyBook(project(
      [scene('s1', 0), scene('s2', 1), scene('s3', 2)],
      [chapter('c1', 0), chapter('c2', 2)]
    ))).toEqual([
      { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
      { id: 'scene:s1', type: 'scene', sceneId: 's1' },
      { id: 'scene:s2', type: 'scene', sceneId: 's2' },
      { id: 'chapter:c2', type: 'chapter-divider', chapterId: 'c2' },
      { id: 'scene:s3', type: 'scene', sceneId: 's3' },
    ]);
  });

  it('places a chapter at the same position before that scene', () => {
    expect(createBookSequenceFromLegacyBook(project(
      [scene('s1', 0)],
      [chapter('c1', 0)]
    ))[0]).toEqual({ id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' });
  });

  it('keeps stable array order for scenes with the same position', () => {
    expect(getOrderedSceneIds(project([
      scene('s1', 0),
      scene('s2', 0),
      scene('s3', 1),
    ]))).toEqual(['s1', 's2', 's3']);
  });

  it('keeps a scene with an invalid position at the end', () => {
    const invalidScene = { ...scene('invalid', 0), position: Number.NaN };

    expect(getOrderedSceneIds(project([
      invalidScene,
      scene('s1', 0),
    ]))).toEqual(['s1', 'invalid']);
  });

  it('keeps a chapter with an invalid position at the end', () => {
    const invalidChapter = { ...chapter('invalid', 0), position: Number.NaN };

    expect(normalizeBookSequence(project(
      [scene('s1', 0)],
      [invalidChapter, chapter('c1', 0)]
    ))).toEqual([
      { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
      { id: 'scene:s1', type: 'scene', sceneId: 's1' },
      { id: 'chapter:invalid', type: 'chapter-divider', chapterId: 'invalid' },
    ]);
  });

  it('keeps an existing bookSequence order when all references are valid', () => {
    const existing: BookSequenceItem[] = [
      { id: 'custom-scene-id', type: 'scene', sceneId: 's2' },
      { id: 'custom-chapter-id', type: 'chapter-divider', chapterId: 'c1' },
      { id: 'scene:s1', type: 'scene', sceneId: 's1' },
    ];

    expect(normalizeBookSequence(project(
      [scene('s1', 0), scene('s2', 1)],
      [chapter('c1', 0)],
      existing
    ))).toEqual([
      { id: 'scene:s2', type: 'scene', sceneId: 's2' },
      { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
      { id: 'scene:s1', type: 'scene', sceneId: 's1' },
    ]);
  });

  it('removes duplicate references to the same scene', () => {
    expect(normalizeBookSequence(project(
      [scene('s1', 0)],
      [],
      [
        { id: 'first', type: 'scene', sceneId: 's1' },
        { id: 'second', type: 'scene', sceneId: 's1' },
      ]
    ))).toEqual([{ id: 'scene:s1', type: 'scene', sceneId: 's1' }]);
  });

  it('removes references to a scene that does not exist', () => {
    expect(normalizeBookSequence(project(
      [scene('s1', 0)],
      [],
      [
        { id: 'missing', type: 'scene', sceneId: 'missing' },
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
      ]
    ))).toEqual([{ id: 'scene:s1', type: 'scene', sceneId: 's1' }]);
  });

  it('adds an existing scene that is missing from the sequence at the end', () => {
    expect(normalizeBookSequence(project(
      [scene('s1', 0), scene('s2', 1)],
      [],
      [{ id: 'scene:s1', type: 'scene', sceneId: 's1' }]
    ))).toEqual([
      { id: 'scene:s1', type: 'scene', sceneId: 's1' },
      { id: 'scene:s2', type: 'scene', sceneId: 's2' },
    ]);
  });

  it('adds an existing chapter that is missing from the sequence at the end', () => {
    expect(normalizeBookSequence(project(
      [scene('s1', 0)],
      [chapter('c1', 0)],
      [{ id: 'scene:s1', type: 'scene', sceneId: 's1' }]
    ))).toEqual([
      { id: 'scene:s1', type: 'scene', sceneId: 's1' },
      { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
    ]);
  });

  it('is idempotent when normalization runs twice', () => {
    const source = project(
      [scene('s1', 0), scene('s2', 1)],
      [chapter('c1', 0)],
      [
        { id: 'duplicate', type: 'scene', sceneId: 's1' },
        { id: 'missing', type: 'scene', sceneId: 'missing' },
        { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
      ]
    );
    const once = normalizeBookSequence(source);
    const twice = normalizeBookSequence({ ...source, bookSequence: once });

    expect(twice).toEqual(once);
  });

  it('does not mutate scene content, ids, titles, or plotline assignments', () => {
    const scenes = [
      scene('s1', 1, 'p2'),
      scene('s2', 0, 'p1'),
    ];
    const before = JSON.parse(JSON.stringify(scenes));

    normalizeBookSequence(project(scenes, [chapter('c1', 0)]));

    expect(scenes).toEqual(before);
  });

  it('returns ordered scenes from the normalized sequence', () => {
    const source = project(
      [scene('s1', 0), scene('s2', 1)],
      [],
      [
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
      ]
    );

    expect(getOrderedScenes(source).map(item => item.id)).toEqual(['s2', 's1']);
  });

  it('returns a chapter divider location from the normalized sequence', () => {
    expect(getChapterDividerLocation(project(
      [scene('s1', 0)],
      [chapter('c1', 0)]
    ), 'c1')).toEqual({
      index: 0,
      item: { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
    });
  });

  it('returns display items in bookSequence order even when scene positions disagree', () => {
    const source = project(
      [scene('s1', 0), scene('s2', 1), scene('s3', 2)],
      [chapter('c1', 0)],
      [
        { id: 'scene:s3', type: 'scene', sceneId: 's3' },
        { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
      ]
    );

    expect(getBookSequenceDisplayItems(source).map(item => item.id)).toEqual([
      'scene:s3',
      'chapter:c1',
      'scene:s1',
      'scene:s2',
    ]);
  });

  it('keeps the same scene object references in display items', () => {
    const s1 = scene('s1', 0);
    const [displayItem] = getBookSequenceDisplayItems(project([s1]));

    expect(displayItem.type).toBe('scene');
    if (displayItem.type === 'scene') {
      expect(displayItem.scene).toBe(s1);
      expect(displayItem.scene.content).toBe('Content s1');
    }
  });

  it('places a chapter divider display item before the next scene in the sequence', () => {
    expect(getBookSequenceDisplayItems(project(
      [scene('s1', 0)],
      [chapter('c1', 0)]
    )).map(item => item.id)).toEqual(['chapter:c1', 'scene:s1']);
  });

  it('preserves consecutive chapter dividers in display order', () => {
    expect(getBookSequenceDisplayItems(project(
      [scene('s1', 0)],
      [chapter('c1', 0), chapter('c2', 0)]
    )).map(item => item.id)).toEqual(['chapter:c1', 'chapter:c2', 'scene:s1']);
  });

  it('keeps a chapter divider at the end without creating a fake scene', () => {
    const items = getBookSequenceDisplayItems(project(
      [scene('s1', 0)],
      [chapter('c1', Number.NaN)]
    ));

    expect(items.map(item => item.id)).toEqual(['scene:s1', 'chapter:c1']);
    expect(items.filter(item => item.type === 'scene')).toHaveLength(1);
  });

  it('does not mutate the project when creating display items', () => {
    const source = project(
      [scene('s1', 1), scene('s2', 0)],
      [chapter('c1', 0)],
      [{ id: 'scene:s2', type: 'scene', sceneId: 's2' }]
    );
    const before = JSON.parse(JSON.stringify(source));

    getBookSequenceDisplayItems(source);

    expect(source).toEqual(before);
  });

  it('returns board columns in bookSequence order', () => {
    const source = project(
      [scene('s1', 0), scene('s2', 1)],
      [chapter('c1', 0)],
      [
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
        { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
      ]
    );

    expect(getBoardSequenceColumns(source).map(column => column.id)).toEqual([
      'scene:s2',
      'chapter:c1',
      'scene:s1',
    ]);
  });

  it('uses bookSequence order for board columns even when scene positions disagree', () => {
    const source = project(
      [scene('s1', 0), scene('s2', 1)],
      [],
      [
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
      ]
    );

    expect(getBoardSequenceColumns(source).map(column => column.type === 'scene' ? column.scene.id : column.id)).toEqual(['s2', 's1']);
  });

  it('represents a chapter divider as its own narrow board column without a plotline', () => {
    const columns = getBoardSequenceColumns(project(
      [scene('s1', 0)],
      [chapter('c1', 0)]
    ));
    const divider = columns.find(column => column.type === 'chapter-divider');

    expect(divider).toMatchObject({
      id: 'chapter:c1',
      type: 'chapter-divider',
      width: BOOK_SEQUENCE_CHAPTER_DIVIDER_WIDTH,
    });
    expect(divider && 'plotlineId' in divider).toBe(false);
    expect(BOOK_SEQUENCE_CHAPTER_DIVIDER_WIDTH).toBeLessThan(BOOK_SEQUENCE_SCENE_COLUMN_WIDTH);
  });

  it('preserves consecutive chapter dividers as separate board columns', () => {
    expect(getBoardSequenceColumns(project(
      [scene('s1', 0)],
      [chapter('c1', 0), chapter('c2', 0)]
    )).map(column => column.id)).toEqual(['chapter:c1', 'chapter:c2', 'scene:s1']);
  });

  it('preserves a chapter divider at the beginning and at the end of board columns', () => {
    expect(getBoardSequenceColumns(project(
      [scene('s1', 0)],
      [chapter('start', 0), chapter('end', Number.NaN)]
    )).map(column => column.id)).toEqual(['chapter:start', 'scene:s1', 'chapter:end']);
  });

  it('returns each scene once in board columns', () => {
    const columns = getBoardSequenceColumns(project(
      [scene('s1', 0), scene('s2', 1)],
      [],
      [
        { id: 'first', type: 'scene', sceneId: 's1' },
        { id: 'duplicate', type: 'scene', sceneId: 's1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
      ]
    ));

    expect(columns.filter(column => column.type === 'scene').map(column => column.scene.id)).toEqual(['s1', 's2']);
  });

  it('uses the same scene ids for editor items and board columns', () => {
    const source = project(
      [scene('s1', 0), scene('s2', 1)],
      [],
      [
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
      ]
    );
    const editorSceneIds = getBookSequenceDisplayItems(source)
      .filter(item => item.type === 'scene')
      .map(item => item.scene.id);
    const boardSceneIds = getBoardSequenceColumns(source)
      .filter(column => column.type === 'scene')
      .map(column => column.scene.id);

    expect(boardSceneIds).toEqual(editorSceneIds);
  });

  it('adds a chapter at the beginning of the sequence', () => {
    const result = addChapterDividerToBookSequence(project([scene('s1', 0)]), 0, 'c1', 'Chapter 1');

    expect(result.bookSequence.map(item => item.id)).toEqual(['chapter:c1', 'scene:s1']);
    expect(result.chapterMarkers).toEqual([{ id: 'c1', title: 'Chapter 1', position: 0 }]);
  });

  it('adds a chapter between two scenes', () => {
    const result = addChapterDividerToBookSequence(project([scene('s1', 0), scene('s2', 1)]), 1, 'c1', 'Middle');

    expect(result.bookSequence.map(item => item.id)).toEqual(['scene:s1', 'chapter:c1', 'scene:s2']);
    expect(result.chapterMarkers[0]).toMatchObject({ id: 'c1', position: 1 });
  });

  it('adds a chapter at the end of the sequence', () => {
    const result = addChapterDividerToBookSequence(project([scene('s1', 0), scene('s2', 1)]), 2, 'c1', 'End');

    expect(result.bookSequence.map(item => item.id)).toEqual(['scene:s1', 'scene:s2', 'chapter:c1']);
    expect(result.chapterMarkers[0]).toMatchObject({ id: 'c1', position: 2 });
  });

  it('adds a chapter to a legacy book without an existing bookSequence', () => {
    const result = addChapterDividerToBookSequence(project([scene('s2', 1), scene('s1', 0)]), 1, 'c1', 'Legacy');

    expect(result.bookSequence.map(item => item.id)).toEqual(['scene:s1', 'chapter:c1', 'scene:s2']);
  });

  it('renames a chapter without changing its location', () => {
    const source = project(
      [scene('s1', 0)],
      [chapter('c1', 0)],
      [{ id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' }, { id: 'scene:s1', type: 'scene', sceneId: 's1' }]
    );
    const result = renameChapterInBookSequence(source, 'c1', 'Renamed');

    expect(result.bookSequence).toEqual(source.bookSequence);
    expect(result.chapterMarkers[0]).toMatchObject({ id: 'c1', title: 'Renamed', position: 0 });
  });

  it('deletes a chapter without deleting scenes', () => {
    const source = project(
      [scene('s1', 0), scene('s2', 1)],
      [chapter('c1', 1)],
      [
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
      ]
    );
    const result = deleteChapterDividerFromBookSequence(source, 'c1');

    expect(result.bookSequence.map(item => item.id)).toEqual(['scene:s1', 'scene:s2']);
    expect(result.chapterMarkers).toEqual([]);
    expect(source.scenes.map(item => item.id)).toEqual(['s1', 's2']);
  });

  it('moves only the chapter divider order', () => {
    const source = project(
      [scene('s1', 0), scene('s2', 1)],
      [chapter('c1', 0)],
      [
        { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
      ]
    );
    const result = moveChapterDividerInBookSequence(source, 'c1', 3);

    expect(result.bookSequence.map(item => item.id)).toEqual(['scene:s1', 'scene:s2', 'chapter:c1']);
    expect(result.chapterMarkers[0]).toMatchObject({ id: 'c1', position: 2 });
    expect(source.scenes.map(item => `${item.id}:${item.plotlineId}:${item.content}`)).toEqual(['s1:p1:Content s1', 's2:p1:Content s2']);
  });

  it('moves a chapter before a scene', () => {
    const source = project(
      [scene('s1', 0), scene('s2', 1)],
      [chapter('c1', 2)],
      [
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
        { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
      ]
    );

    expect(moveChapterDividerInBookSequence(source, 'c1', 1).bookSequence.map(item => item.id)).toEqual([
      'scene:s1',
      'chapter:c1',
      'scene:s2',
    ]);
  });

  it('keeps consecutive chapter dividers after moving', () => {
    const source = project(
      [scene('s1', 0)],
      [chapter('c1', 0), chapter('c2', 1)],
      [
        { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'chapter:c2', type: 'chapter-divider', chapterId: 'c2' },
      ]
    );

    expect(moveChapterDividerInBookSequence(source, 'c2', 1).bookSequence.map(item => item.id)).toEqual([
      'chapter:c1',
      'chapter:c2',
      'scene:s1',
    ]);
  });

  it('keeps the same chapter id in the marker and sequence when adding', () => {
    const result = addChapterDividerToBookSequence(project([scene('s1', 0)]), 1, 'stable-chapter', 'Stable');

    expect(result.bookSequence).toContainEqual({ id: 'chapter:stable-chapter', type: 'chapter-divider', chapterId: 'stable-chapter' });
    expect(result.chapterMarkers).toContainEqual({ id: 'stable-chapter', title: 'Stable', position: 1 });
  });

  it('does not change scene ids, content, or plotline ids during chapter operations', () => {
    const source = project([scene('s1', 0, 'p2'), scene('s2', 1, 'p1')], [chapter('c1', 0)]);
    const before = JSON.parse(JSON.stringify(source.scenes));

    addChapterDividerToBookSequence(source, 1, 'c2');
    renameChapterInBookSequence(source, 'c1', 'Name');
    deleteChapterDividerFromBookSequence(source, 'c1');
    moveChapterDividerInBookSequence(source, 'c1', 2);

    expect(source.scenes).toEqual(before);
  });

  it('moves a scene forward in the sequence', () => {
    const source = project(
      [scene('s1', 0), scene('s2', 1), scene('s3', 2)],
      [],
      [
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
        { id: 'scene:s3', type: 'scene', sceneId: 's3' },
      ]
    );

    expect(moveSceneInBookSequence(source, 's1', 3, 'p1')?.bookSequence.map(item => item.id)).toEqual([
      'scene:s2',
      'scene:s3',
      'scene:s1',
    ]);
  });

  it('moves a scene backward in the sequence', () => {
    const source = project(
      [scene('s1', 0), scene('s2', 1), scene('s3', 2)],
      [],
      [
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
        { id: 'scene:s3', type: 'scene', sceneId: 's3' },
      ]
    );

    expect(moveSceneInBookSequence(source, 's3', 0, 'p1')?.bookSequence.map(item => item.id)).toEqual([
      'scene:s3',
      'scene:s1',
      'scene:s2',
    ]);
  });

  it('moves a scene before a chapter divider', () => {
    const source = project(
      [scene('s1', 0), scene('s2', 1)],
      [chapter('c1', 1)],
      [
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
      ]
    );

    expect(moveSceneInBookSequence(source, 's2', 1, 'p1')?.bookSequence.map(item => item.id)).toEqual([
      'scene:s1',
      'scene:s2',
      'chapter:c1',
    ]);
  });

  it('moves a scene after a chapter divider', () => {
    const source = project(
      [scene('s1', 0), scene('s2', 1)],
      [chapter('c1', 1)],
      [
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
        { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
      ]
    );

    expect(moveSceneInBookSequence(source, 's1', 3, 'p1')?.bookSequence.map(item => item.id)).toEqual([
      'scene:s2',
      'chapter:c1',
      'scene:s1',
    ]);
  });

  it('moves a scene between two chapter dividers', () => {
    const source = project(
      [scene('s1', 0), scene('s2', 1)],
      [chapter('c1', 0), chapter('c2', 1)],
      [
        { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
        { id: 'chapter:c2', type: 'chapter-divider', chapterId: 'c2' },
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
      ]
    );

    expect(moveSceneInBookSequence(source, 's2', 1, 'p1')?.bookSequence.map(item => item.id)).toEqual([
      'chapter:c1',
      'scene:s2',
      'chapter:c2',
      'scene:s1',
    ]);
  });

  it('moves a scene to the beginning and end of the book', () => {
    const source = project([scene('s1', 0), scene('s2', 1), scene('s3', 2)]);

    expect(moveSceneInBookSequence(source, 's3', 0, 'p1')?.bookSequence[0]).toEqual({ id: 'scene:s3', type: 'scene', sceneId: 's3' });
    expect(moveSceneInBookSequence(source, 's1', 3, 'p1')?.bookSequence.at(-1)).toEqual({ id: 'scene:s1', type: 'scene', sceneId: 's1' });
  });

  it('changes only plotlineId when dropping in the same sequence location on another row', () => {
    const source = project(
      [scene('s1', 0, 'p1'), scene('s2', 1, 'p1')],
      [],
      [
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
      ]
    );
    source.plotlines.push({ id: 'p2', name: 'Second', color: '#654321' });
    const result = moveSceneInBookSequence(source, 's1', 0, 'p2');

    expect(result?.bookSequence).toEqual(source.bookSequence);
    expect(result?.scenes.find(item => item.id === 's1')?.plotlineId).toBe('p2');
    expect(getOrderedSceneIds({ ...source, bookSequence: result?.bookSequence })).toEqual(['s1', 's2']);
  });

  it('changes sequence and plotlineId in one result', () => {
    const source = project([scene('s1', 0, 'p1'), scene('s2', 1, 'p1')]);
    source.plotlines.push({ id: 'p2', name: 'Second', color: '#654321' });
    const result = moveSceneInBookSequence(source, 's1', 2, 'p2');

    expect(result?.bookSequence.map(item => item.id)).toEqual(['scene:s2', 'scene:s1']);
    expect(result?.scenes.find(item => item.id === 's1')?.plotlineId).toBe('p2');
  });

  it('returns null for a no-op move', () => {
    const source = project(
      [scene('s1', 0, 'p1')],
      [],
      [{ id: 'scene:s1', type: 'scene', sceneId: 's1' }]
    );

    expect(moveSceneInBookSequence(source, 's1', 0, 'p1')).toBeNull();
  });

  it('creates bookSequence for a legacy book only when an explicit scene move changes it', () => {
    const source = project([scene('s1', 0), scene('s2', 1)]);
    const result = moveSceneInBookSequence(source, 's2', 0, 'p1');

    expect(source.bookSequence).toBeUndefined();
    expect(result?.bookSequence.map(item => item.id)).toEqual(['scene:s2', 'scene:s1']);
  });

  it('does not duplicate scene ids in the sequence after a move', () => {
    const result = moveSceneInBookSequence(project([scene('s1', 0), scene('s2', 1)]), 's1', 2, 'p1');

    expect(result?.bookSequence.filter(item => item.type === 'scene' && item.sceneId === 's1')).toHaveLength(1);
  });

  it('keeps scene content, title, and id while moving scenes', () => {
    const source = project([scene('s1', 0), scene('s2', 1)]);
    const result = moveSceneInBookSequence(source, 's1', 2, 'p1');

    expect(result?.scenes.find(item => item.id === 's1')).toMatchObject({
      id: 's1',
      title: 'Scene s1',
      content: 'Content s1',
    });
  });

  it('updates Scene.position by scene-only order and ChapterMarker.position by preceding scenes', () => {
    const source = project(
      [scene('s1', 0), scene('s2', 1), scene('s3', 2)],
      [chapter('c1', 1)],
      [
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
        { id: 'scene:s3', type: 'scene', sceneId: 's3' },
      ]
    );
    const result = moveSceneInBookSequence(source, 's3', 1, 'p1');

    expect(result?.scenes.map(item => `${item.id}:${item.position}`)).toEqual(['s1:0', 's3:1', 's2:2']);
    expect(result?.chapterMarkers[0]).toMatchObject({ id: 'c1', position: 2 });
  });

  it('keeps editor order aligned with moved sequence', () => {
    const source = project([scene('s1', 0), scene('s2', 1)]);
    const result = moveSceneInBookSequence(source, 's1', 2, 'p1');

    expect(result && getOrderedSceneIds({ ...source, bookSequence: result.bookSequence })).toEqual(['s2', 's1']);
  });

  it('does not change editor order when only plotline changes', () => {
    const source = project(
      [scene('s1', 0, 'p1'), scene('s2', 1, 'p1')],
      [],
      [
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
      ]
    );
    source.plotlines.push({ id: 'p2', name: 'Second', color: '#654321' });
    const result = moveSceneInBookSequence(source, 's1', 0, 'p2');

    expect(result && getOrderedScenes({ ...source, bookSequence: result.bookSequence }).map(item => item.id)).toEqual(['s1', 's2']);
  });

  it('does not change the book for invalid scene or plotline targets', () => {
    const source = project([scene('s1', 0)]);

    expect(moveSceneInBookSequence(source, 'missing', 0, 'p1')).toBeNull();
    expect(moveSceneInBookSequence(source, 's1', 0, 'missing')).toBeNull();
    expect(source.bookSequence).toBeUndefined();
  });

  it('adds a scene to an empty book', () => {
    const source = project([]);
    const result = addSceneToBookSequence(source, scene('s1', 0), 0);

    expect(result?.bookSequence).toEqual([{ id: 'scene:s1', type: 'scene', sceneId: 's1' }]);
    expect(result?.scenes.map(item => item.id)).toEqual(['s1']);
  });

  it('adds a scene when there is only one plotline and existing columns are occupied', () => {
    const source = project([scene('s1', 0), scene('s2', 1)]);
    const result = addSceneToBookSequence(source, scene('s3', 0), 1);

    expect(result?.bookSequence.map(item => item.id)).toEqual(['scene:s1', 'scene:s3', 'scene:s2']);
  });

  it('adds a scene at the beginning of the sequence', () => {
    const source = project([scene('s1', 0), scene('s2', 1)]);
    const result = addSceneToBookSequence(source, scene('s0', 0), 0);

    expect(result?.bookSequence.map(item => item.id)).toEqual(['scene:s0', 'scene:s1', 'scene:s2']);
    expect(result?.scenes.map(item => `${item.id}:${item.position}`)).toEqual(['s0:0', 's1:1', 's2:2']);
  });

  it('adds a scene in the middle of the sequence', () => {
    const source = project([scene('s1', 0), scene('s2', 1)]);
    const result = addSceneToBookSequence(source, scene('s-mid', 0), 1);

    expect(result?.bookSequence.map(item => item.id)).toEqual(['scene:s1', 'scene:s-mid', 'scene:s2']);
  });

  it('adds a scene at the end of the sequence', () => {
    const source = project([scene('s1', 0), scene('s2', 1)]);
    const result = addSceneToBookSequence(source, scene('s3', 0), 99);

    expect(result?.bookSequence.map(item => item.id)).toEqual(['scene:s1', 'scene:s2', 'scene:s3']);
  });

  it('adds a scene before a chapter divider', () => {
    const source = project(
      [scene('s1', 0), scene('s2', 1)],
      [chapter('c1', 1)],
      [
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
      ]
    );
    const result = addSceneToBookSequence(source, scene('s-new', 0), 1);

    expect(result?.bookSequence.map(item => item.id)).toEqual(['scene:s1', 'scene:s-new', 'chapter:c1', 'scene:s2']);
    expect(result?.chapterMarkers[0]).toMatchObject({ id: 'c1', position: 2 });
  });

  it('adds a scene after a chapter divider', () => {
    const source = project(
      [scene('s1', 0), scene('s2', 1)],
      [chapter('c1', 1)],
      [
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
      ]
    );
    const result = addSceneToBookSequence(source, scene('s-new', 0), 2);

    expect(result?.bookSequence.map(item => item.id)).toEqual(['scene:s1', 'chapter:c1', 'scene:s-new', 'scene:s2']);
    expect(result?.chapterMarkers[0]).toMatchObject({ id: 'c1', position: 1 });
  });

  it('adds a scene between two chapter dividers', () => {
    const source = project(
      [scene('s1', 0)],
      [chapter('c1', 1), chapter('c2', 1)],
      [
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
        { id: 'chapter:c2', type: 'chapter-divider', chapterId: 'c2' },
      ]
    );
    const result = addSceneToBookSequence(source, scene('s-new', 0), 2);

    expect(result?.bookSequence.map(item => item.id)).toEqual(['scene:s1', 'chapter:c1', 'scene:s-new', 'chapter:c2']);
    expect(result?.chapterMarkers.map(marker => `${marker.id}:${marker.position}`)).toEqual(['c1:1', 'c2:2']);
  });

  it('adds a scene to a different plotline', () => {
    const source = project([scene('s1', 0, 'p1')]);
    source.plotlines.push({ id: 'p2', name: 'Second', color: '#654321' });
    const result = addSceneToBookSequence(source, scene('s2', 0, 'p2'), 1);

    expect(result?.scenes.find(item => item.id === 's2')?.plotlineId).toBe('p2');
    expect(result?.bookSequence.map(item => item.id)).toEqual(['scene:s1', 'scene:s2']);
  });

  it('creates bookSequence for a legacy book only after an explicit scene add', () => {
    const source = project([scene('s1', 0)]);
    const result = addSceneToBookSequence(source, scene('s2', 0), 1);

    expect(source.bookSequence).toBeUndefined();
    expect(result?.bookSequence.map(item => item.id)).toEqual(['scene:s1', 'scene:s2']);
  });

  it('adds the scene only once to scenes and bookSequence', () => {
    const result = addSceneToBookSequence(project([scene('s1', 0)]), scene('s2', 0), 1);

    expect(result?.scenes.filter(item => item.id === 's2')).toHaveLength(1);
    expect(result?.bookSequence.filter(item => item.type === 'scene' && item.sceneId === 's2')).toHaveLength(1);
  });

  it('keeps editor order aligned after adding a scene', () => {
    const source = project([scene('s1', 0), scene('s2', 1)]);
    const result = addSceneToBookSequence(source, scene('s-new', 0), 1);

    expect(result && getOrderedSceneIds({ ...source, scenes: result.scenes, bookSequence: result.bookSequence })).toEqual(['s1', 's-new', 's2']);
  });

  it('updates Scene.position and ChapterMarker.position after adding a scene', () => {
    const source = project(
      [scene('s1', 0), scene('s2', 1)],
      [chapter('c1', 1)],
      [
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
      ]
    );
    const result = addSceneToBookSequence(source, scene('s-new', 0), 1);

    expect(result?.scenes.map(item => `${item.id}:${item.position}`)).toEqual(['s1:0', 's-new:1', 's2:2']);
    expect(result?.chapterMarkers[0]).toMatchObject({ id: 'c1', position: 2 });
  });

  it('supports bulk-style repeated scene adds while keeping sequence canonical', () => {
    const source = project([scene('s1', 0)]);
    const first = addSceneToBookSequence(source, scene('s2', 0), 1);
    expect(first).not.toBeNull();
    const second = first && addSceneToBookSequence({ ...source, ...first }, scene('s3', 0), first.bookSequence.length);

    expect(second?.bookSequence.map(item => item.id)).toEqual(['scene:s1', 'scene:s2', 'scene:s3']);
    expect(second?.scenes.map(item => `${item.id}:${item.position}`)).toEqual(['s1:0', 's2:1', 's3:2']);
  });
});
