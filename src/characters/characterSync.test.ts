import { describe, expect, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import type { Book, CharacterEntry } from '../../types';
import {
  SHARED_CHARACTER_DATA_KEYS,
  SHARED_CHARACTER_FIELD_PATHS,
} from './characterSharedData';
import {
  applyCharacterSyncResolutions,
  buildCharacterSyncPlan,
  getCharacterAppearances,
  getSharedCharacterFieldValue,
  setSharedCharacterFieldValue,
  validateCharacterSyncResolutions,
  type CharacterSyncFieldPlan,
  type CharacterSyncResolution,
} from './characterSync';

const entityId = uuidv4();

const character = (overrides: Partial<CharacterEntry> = {}): CharacterEntry => ({
  id: uuidv4(),
  characterEntityId: entityId,
  name: 'Shared name',
  role: 'main',
  x: 10,
  y: 20,
  data: { gender: 'female', unknown: 'book-only' },
  developmentStages: [{ id: 'stage-1', title: 'Arc', data: { note: 'keep' } }],
  sceneIdsByQuestionId: { goal: ['scene-1'] },
  ...overrides,
});

const book = (
  id: string,
  characters: CharacterEntry[],
  overrides: Partial<Book> = {}
): Book => ({
  id,
  ownerId: 'owner',
  title: `Book ${id}`,
  createdAt: 1,
  updatedAt: 2,
  syncStatus: 'synced',
  pendingSync: false,
  plotlines: [],
  scenes: [],
  characters,
  ...overrides,
});

const readyPlan = (books: Book[]) => {
  const result = buildCharacterSyncPlan(books, entityId);
  expect(result.status).toBe('ready');
  if (result.status !== 'ready') throw new Error('expected ready plan');
  return result.plan;
};

const field = (fields: CharacterSyncFieldPlan[], path: string) => {
  const result = fields.find(item => item.field === path);
  if (!result) throw new Error(`missing field ${path}`);
  return result;
};

describe('character appearances', () => {
  it('finds matching appearances in book order and preserves references', () => {
    const first = character({ id: 'first' });
    const second = character({ id: 'second' });
    const books = [book('a', [first]), book('b', [second])];

    const appearances = getCharacterAppearances(books, entityId);

    expect(appearances.map(item => [item.bookId, item.characterId])).toEqual([
      ['a', 'first'],
      ['b', 'second'],
    ]);
    expect(appearances[0].character).toBe(first);
    expect(appearances[1].character).toBe(second);
  });

  it('does not match by name or include a different entity identity', () => {
    const other = character({ characterEntityId: uuidv4(), name: 'Shared name' });
    expect(getCharacterAppearances([book('a', [other])], entityId)).toEqual([]);
  });

  it('returns explicit errors for invalid, missing, absent, and single identities', () => {
    expect(buildCharacterSyncPlan([], '')).toEqual({ status: 'invalid_character_entity_id' });
    expect(buildCharacterSyncPlan([], 'invalid')).toEqual({ status: 'invalid_character_entity_id' });
    expect(buildCharacterSyncPlan([], entityId)).toEqual({ status: 'not_found' });

    const only = character();
    const single = buildCharacterSyncPlan([book('a', [only])], entityId);
    expect(single.status).toBe('single_appearance');
    if (single.status === 'single_appearance') expect(single.appearance.character).toBe(only);
  });
});

describe('shared field access', () => {
  it('reads top-level and data paths independently', () => {
    const source = character({ name: 'Top', imageUrl: 'image', data: { name: 'Data' } });

    expect(getSharedCharacterFieldValue(source, 'name')).toBe('Top');
    expect(getSharedCharacterFieldValue(source, 'imageUrl')).toBe('image');
    expect(getSharedCharacterFieldValue(source, 'data.name')).toBe('Data');
  });

  it('returns the same reference for equal values and clones only what changes', () => {
    const source = character({ name: 'Top', data: { age: '30', unknown: 'keep' } });
    expect(setSharedCharacterFieldValue(source, 'name', 'Top')).toBe(source);
    expect(setSharedCharacterFieldValue(source, 'data.age', '30')).toBe(source);

    const renamed = setSharedCharacterFieldValue(source, 'name', 'New');
    expect(renamed).not.toBe(source);
    expect(renamed.data).toBe(source.data);

    const aged = setSharedCharacterFieldValue(source, 'data.age', '31');
    expect(aged).not.toBe(source);
    expect(aged.data).not.toBe(source.data);
    expect(aged.data).toEqual({ age: '31', unknown: 'keep' });
    expect(source.data.age).toBe('30');
  });

  it('does not expose or update unapproved runtime field paths', () => {
    const source = character({ role: 'main', data: { goal: 'book goal' } });
    const invalidField = 'data.goal' as 'data.age';

    expect(getSharedCharacterFieldValue(source, invalidField)).toBeUndefined();
    expect(setSharedCharacterFieldValue(source, invalidField, 'changed')).toBe(source);
    expect(source.data.goal).toBe('book goal');
  });
});

describe('character sync plan', () => {
  it('includes top-level fields and every approved shared data field only', () => {
    const plan = readyPlan([book('a', [character()]), book('b', [character()])]);

    expect(plan.fields.map(item => item.field)).toEqual(SHARED_CHARACTER_FIELD_PATHS);
    expect(plan.fields.map(item => item.field)).toContain('name');
    expect(plan.fields.map(item => item.field)).toContain('imageUrl');
    SHARED_CHARACTER_DATA_KEYS.forEach(key => {
      expect(plan.fields.map(item => item.field)).toContain(`data.${key}`);
    });
    expect(plan.fields.map(item => item.field)).not.toContain('role');
    expect(plan.fields.map(item => item.field)).not.toContain('data.goal');
    expect(plan.fields.map(item => item.field)).not.toContain('data.unknown');
  });

  it('classifies equal and all-empty fields as unchanged', () => {
    const plan = readyPlan([
      book('a', [character({ data: { age: '30' } })]),
      book('b', [character({ data: { age: '30' } })]),
    ]);

    expect(field(plan.fields, 'data.age').status).toBe('unchanged');
    expect(field(plan.fields, 'imageUrl').status).toBe('unchanged');
  });

  it('classifies one logical value plus blanks as fillable without applying it', () => {
    const first = character({ data: { traits: 'Curious' } });
    const second = character({ data: { traits: '   ' } });
    const books = [book('a', [first]), book('b', [second])];
    const snapshot = structuredClone(books);
    const plan = readyPlan(books);
    const traits = field(plan.fields, 'data.traits');

    expect(traits.status).toBe('fillable');
    expect(traits.suggestedValue).toBe('Curious');
    expect(books).toEqual(snapshot);
    expect(second.data.traits).toBe('   ');
  });

  it('classifies different values as conflict', () => {
    const plan = readyPlan([
      book('a', [character({ data: { traits: 'Curious' } })]),
      book('b', [character({ data: { traits: 'Brave' } })]),
    ]);
    expect(field(plan.fields, 'data.traits').status).toBe('conflict');
  });

  it('deduplicates the same normalized option across books', () => {
    const plan = readyPlan([
      book('a', [character({ data: { traits: ' Curious ' } })]),
      book('b', [character({ data: { traits: 'Curious' } })]),
      book('c', [character({ data: { traits: 'Curious' } })]),
    ]);
    const traits = field(plan.fields, 'data.traits');

    expect(traits.status).toBe('unchanged');
    expect(traits.options).toHaveLength(1);
    expect(traits.options[0].normalizedValue).toBe('Curious');
    expect(traits.options[0].appearances).toHaveLength(3);
  });

  it('normalizes surrounding whitespace and line endings for comparison only', () => {
    const first = character({ data: { traits: ' Line one\r\nLine two ' } });
    const second = character({ data: { traits: 'Line one\nLine two' } });
    const plan = readyPlan([book('a', [first]), book('b', [second])]);
    const traits = field(plan.fields, 'data.traits');

    expect(traits.status).toBe('unchanged');
    expect(traits.options).toHaveLength(1);
    expect(first.data.traits).toBe(' Line one\r\nLine two ');
    expect(traits.appearanceValues[0].value).toBe(' Line one\r\nLine two ');
  });

  it('allows name and data.name to differ within an appearance and reports only duplicate records', () => {
    const first = character({ id: 'first', name: 'Top', data: { name: 'Data' } });
    const duplicate = character({ id: 'second' });
    const plan = readyPlan([book('a', [first, duplicate]), book('b', [character()])]);

    expect(plan.diagnostics).toEqual([
      expect.objectContaining({
        code: 'duplicate_character_record_in_book',
        bookId: 'a',
        characterIds: ['first', 'second'],
      }),
    ]);
    expect(first.name).toBe('Top');
    expect(first.data.name).toBe('Data');
  });

  it('plans name and data.name independently across books without mismatch diagnostics', () => {
    const plan = readyPlan([
      book('a', [character({ name: 'Display A', data: { name: 'Full A' } })]),
      book('b', [character({ name: 'Display B', data: { name: 'Full B' } })]),
    ]);

    expect(plan.diagnostics).toEqual([]);
    expect(field(plan.fields, 'name')).toMatchObject({ status: 'conflict' });
    expect(field(plan.fields, 'data.name')).toMatchObject({ status: 'conflict' });
    expect(field(plan.fields, 'name').options.map(option => option.value)).toEqual(['Display A', 'Display B']);
    expect(field(plan.fields, 'data.name').options.map(option => option.value)).toEqual(['Full A', 'Full B']);
  });

  it('reports a legacy non-string shared value and does not coerce it', () => {
    const legacy = character({ data: { age: 42 as unknown as string } });
    const plan = readyPlan([book('a', [legacy]), book('b', [character()])]);

    expect(plan.diagnostics).toContainEqual(expect.objectContaining({
      code: 'non_string_shared_field',
      bookId: 'a',
      field: 'data.age',
    }));
    expect(legacy.data.age).toBe(42);
  });
});

describe('sync resolution validation', () => {
  it('rejects duplicate fields, unapproved paths, and blank values', () => {
    const resolutions = [
      { field: 'name', action: 'skip' },
      { field: 'name', action: 'use_value', value: 'New' },
      { field: 'role', action: 'use_value', value: 'main' },
      { field: 'data.age', action: 'use_value', value: '   ' },
    ] as CharacterSyncResolution[];

    expect(validateCharacterSyncResolutions(resolutions)).toEqual(expect.arrayContaining([
      { code: 'duplicate_resolution', field: 'name' },
      { code: 'invalid_field', field: 'role' },
      { code: 'invalid_value', field: 'data.age' },
    ]));
  });
});

describe('applying character sync resolutions', () => {
  it('can synchronize name and data.name independently', () => {
    const books = [
      book('a', [character({ name: 'Display A', data: { name: 'Full A' } })]),
      book('b', [character({ name: 'Display B', data: { name: 'Full B' } })]),
    ];

    const nameResult = applyCharacterSyncResolutions(books, entityId, [
      { field: 'name', action: 'use_value', value: 'Shared display' },
      { field: 'data.name', action: 'skip' },
    ], 100);
    expect(nameResult.status).toBe('updated');
    if (nameResult.status !== 'updated') return;
    expect(nameResult.books.map(item => item.characters![0].name)).toEqual(['Shared display', 'Shared display']);
    expect(nameResult.books.map(item => item.characters![0].data.name)).toEqual(['Full A', 'Full B']);

    const fullNameResult = applyCharacterSyncResolutions(nameResult.books, entityId, [
      { field: 'name', action: 'skip' },
      { field: 'data.name', action: 'use_value', value: 'Shared full name' },
    ], 200);
    expect(fullNameResult.status).toBe('updated');
    if (fullNameResult.status !== 'updated') return;
    expect(fullNameResult.books.map(item => item.characters![0].name)).toEqual(['Shared display', 'Shared display']);
    expect(fullNameResult.books.map(item => item.characters![0].data.name)).toEqual(['Shared full name', 'Shared full name']);
  });

  it('updates every appearance in old and current books and preserves local data', () => {
    const first = character({ id: 'first', name: 'Old A', role: 'main', questionnaireVisibility: 'visible', data: { traits: 'A', unknown: 'first' } });
    const other = character({ id: 'other', characterEntityId: uuidv4(), name: 'Other' });
    const second = character({ id: 'second', name: 'Old B', role: 'friend', questionnaireVisibility: 'hidden', data: { traits: 'B', unknown: 'second' } });
    const firstBook = book('old', [first, other]);
    const secondBook = book('current', [second]);
    const unrelatedBook = book('unrelated', [character({ characterEntityId: uuidv4() })]);
    const books = [firstBook, secondBook, unrelatedBook];
    const snapshot = structuredClone(books);

    const result = applyCharacterSyncResolutions(books, entityId, [
      { field: 'name', action: 'use_value', value: 'Unified' },
      { field: 'data.traits', action: 'use_value', value: 'Custom combined value' },
    ], 100);

    expect(result.status).toBe('updated');
    if (result.status !== 'updated') return;
    expect(result.updatedBookIds).toEqual(['old', 'current']);
    expect(result.updatedFields).toEqual(['name', 'data.traits']);
    expect(result.books).not.toBe(books);
    expect(result.books[0]).not.toBe(firstBook);
    expect(result.books[1]).not.toBe(secondBook);
    expect(result.books[2]).toBe(unrelatedBook);
    expect(result.books[0].characters![0]).toMatchObject({
      id: 'first', characterEntityId: entityId, name: 'Unified', role: 'main',
      data: { traits: 'Custom combined value', unknown: 'first' },
    });
    expect(result.books[1].characters![0]).toMatchObject({
      id: 'second', characterEntityId: entityId, name: 'Unified', role: 'friend',
      data: { traits: 'Custom combined value', unknown: 'second' },
    });
    expect(result.books[0].characters![0].questionnaireVisibility).toBe('visible');
    expect(result.books[1].characters![0].questionnaireVisibility).toBe('hidden');
    expect(result.books[0].characters![1]).toBe(other);
    expect(result.books[0].characters![0].developmentStages).toBe(first.developmentStages);
    expect(result.books[0].characters![0].sceneIdsByQuestionId).toBe(first.sceneIdsByQuestionId);
    expect(result.books[0].updatedAt).toBe(100);
    expect(result.books[0].pendingSync).toBe(true);
    expect(result.books[1].updatedAt).toBe(100);
    expect(result.books[1].pendingSync).toBe(true);
    expect(books).toEqual(snapshot);
  });

  it('keeps unchanged character and book references where possible', () => {
    const already = character({ name: 'Unified' });
    const needsUpdate = character({ name: 'Old' });
    const firstBook = book('same', [already]);
    const secondBook = book('change', [needsUpdate]);
    const result = applyCharacterSyncResolutions(
      [firstBook, secondBook], entityId,
      [{ field: 'name', action: 'use_value', value: 'Unified' }],
      100
    );

    expect(result.status).toBe('updated');
    if (result.status !== 'updated') return;
    expect(result.books[0]).toBe(firstBook);
    expect(result.books[0].characters![0]).toBe(already);
    expect(result.books[1]).not.toBe(secondBook);
  });

  it('returns the original array for repeated values and skip-only decisions', () => {
    const books = [book('a', [character({ name: 'Same' })]), book('b', [character({ name: 'Same' })])];
    const repeated = applyCharacterSyncResolutions(
      books, entityId, [{ field: 'name', action: 'use_value', value: 'Same' }]
    );
    const skipped = applyCharacterSyncResolutions(
      books, entityId, [{ field: 'name', action: 'skip' }]
    );

    expect(repeated).toEqual({ status: 'no_changes', books });
    expect(repeated.books).toBe(books);
    expect(skipped).toEqual({ status: 'no_changes', books });
    expect(skipped.books).toBe(books);
  });

  it('returns original books for invalid identity, missing entity, or invalid decisions', () => {
    const books = [book('a', [character()])];
    const invalidId = applyCharacterSyncResolutions(books, 'invalid', []);
    const missing = applyCharacterSyncResolutions(books, uuidv4(), []);
    const invalidDecision = applyCharacterSyncResolutions(books, entityId, [
      { field: 'role', action: 'use_value', value: 'main' },
    ] as unknown as CharacterSyncResolution[]);

    expect(invalidId).toEqual({ status: 'invalid_character_entity_id', books });
    expect(missing).toEqual({ status: 'not_found', books });
    expect(invalidDecision.status).toBe('invalid_resolutions');
    expect(invalidDecision.books).toBe(books);
  });
});
