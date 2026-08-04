import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import type { Book, CharacterEntry } from '../../types';
import { buildCharacterSyncPlan } from '../../src/characters/characterSync';
import CharacterSyncDialog, {
  buildCombinedCharacterSyncValue,
  buildCharacterSyncResolutionsFromChoices,
  createInitialCharacterSyncChoices,
  getActionableCharacterSyncFields,
  getCharacterSyncFieldLabel,
  selectManualCharacterSyncChoice,
} from './CharacterSyncDialog';

const entityId = uuidv4();
const character = (overrides: Partial<CharacterEntry> = {}): CharacterEntry => ({
  id: uuidv4(),
  characterEntityId: entityId,
  name: 'Character',
  data: {},
  ...overrides,
});
const book = (id: string, characters: CharacterEntry[]): Book => ({
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
});

const renderDialog = (books: Book[], source = books[0].characters![0]) => renderToStaticMarkup(
  <CharacterSyncDialog
    isOpen
    books={books}
    activeBookId={books[0].id}
    character={source}
    onClose={vi.fn()}
    onApplyBooks={vi.fn()}
  />
);

describe('CharacterSyncDialog states', () => {
  it('renders an accessible RTL dialog and a single-appearance state', () => {
    const html = renderDialog([book('a', [character()])]);

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('הדמות קיימת כרגע רק בספר הזה');
    expect(html).toContain('aria-label="סגירת חלון סנכרון מידע"');
  });

  it('shows the synchronized state and hides unchanged fields', () => {
    const books = [
      book('a', [character({ data: { age: '30' } })]),
      book('b', [character({ data: { age: '30' } })]),
    ];
    const result = buildCharacterSyncPlan(books, entityId);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;

    expect(getActionableCharacterSyncFields(result.plan)).toHaveLength(0);
    expect(renderDialog(books)).toContain('כל המידע הכללי של הדמות כבר מסונכרן.');
  });

  it('shows fillable and conflict fields but not unchanged fields', () => {
    const books = [
      book('a', [character({ data: { age: '30', traits: 'Curious', residence: 'A' } })]),
      book('b', [character({ data: { age: '', traits: 'Brave', residence: 'A' } })]),
    ];
    const result = buildCharacterSyncPlan(books, entityId);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    const actionable = getActionableCharacterSyncFields(result.plan);

    expect(actionable.map(field => field.field)).toEqual(['data.age', 'data.traits']);
    const html = renderDialog(books);
    expect(html).toContain('מידע להשלמה');
    expect(html).toContain('ערכים סותרים');
    expect(html).toContain('Book b');
    expect(html).toContain('Curious');
    expect(html).toContain('Brave');
  });

  it('shows name and data.name separately without a mismatch warning and blocks duplicate records', () => {
    const first = character({ id: 'one', name: 'Top', data: { name: 'Questionnaire' } });
    const duplicate = character({ id: 'two' });
    const html = renderDialog([
      book('a', [first, duplicate]),
      book('b', [character()]),
    ], first);

    expect(getCharacterSyncFieldLabel('name')).toBe('שם הדמות בספר');
    expect(getCharacterSyncFieldLabel('data.name')).toBe('השם המלא');
    expect(html).not.toContain('שם הדמות ושדה השם בתוך השאלון אינם זהים.');
    expect(html).toContain('יש לפתור את הכפילות לפני הסנכרון.');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>סנכרון מידע<\/button>/);
  });

  it('renders independent conflicts for name and data.name', () => {
    const books = [
      book('a', [character({ name: 'Display A', data: { name: 'Full A' } })]),
      book('b', [character({ name: 'Display B', data: { name: 'Full B' } })]),
    ];
    const result = buildCharacterSyncPlan(books, entityId);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;

    expect(getActionableCharacterSyncFields(result.plan).map(field => field.field)).toEqual([
      'name',
      'data.name',
    ]);
    const html = renderDialog(books);
    expect(html).toContain('שם הדמות בספר');
    expect(html).toContain('השם המלא');
    expect(html).toContain('Display A');
    expect(html).toContain('Display B');
    expect(html).toContain('Full A');
    expect(html).toContain('Full B');
  });

  it('renders distinct image options without exposing them as primary text', () => {
    const html = renderDialog([
      book('a', [character({ imageUrl: 'data:image/png;base64,one' })]),
      book('b', [character({ imageUrl: 'data:image/png;base64,two' })]),
    ]);

    expect(html.match(/alt="אפשרות לתמונת הדמות"/g)).toHaveLength(2);
  });
});

describe('sync choice translation', () => {
  it('builds a manual conflict value with the active book first and the remaining books in order', () => {
    const result = buildCharacterSyncPlan([
      book('first', [character({ data: { traits: 'First value' } })]),
      book('active', [character({ data: { traits: 'Active value' } })]),
      book('third', [character({ data: { traits: 'Third value' } })]),
    ], entityId);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;

    const traits = result.plan.fields.find(field => field.field === 'data.traits');
    expect(traits).toBeDefined();
    expect(buildCombinedCharacterSyncValue(traits!, 'active')).toBe(
      'Active value\n\nFirst value\n\nThird value'
    );
  });

  it('deduplicates matching values with surrounding whitespace and keeps the active original', () => {
    const result = buildCharacterSyncPlan([
      book('empty', [character({ data: { traits: '' } })]),
      book('active', [character({ data: { traits: 'Shared value' } })]),
      book('duplicate', [character({ data: { traits: ' Shared value ' } })]),
      book('other', [character({ data: { traits: 'Other value' } })]),
    ], entityId);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;

    const traits = result.plan.fields.find(field => field.field === 'data.traits');
    expect(traits).toBeDefined();
    expect(buildCombinedCharacterSyncValue(traits!, 'active')).toBe('Shared value\n\nOther value');
  });

  it('deduplicates CRLF and LF variants while preserving the active original text', () => {
    const result = buildCharacterSyncPlan([
      book('first', [character({ data: { traits: 'Line one\nLine two' } })]),
      book('active', [character({ data: { traits: 'Line one\r\nLine two' } })]),
      book('other', [character({ data: { traits: 'Other' } })]),
    ], entityId);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;

    const traits = result.plan.fields.find(field => field.field === 'data.traits');
    expect(traits).toBeDefined();
    expect(buildCombinedCharacterSyncValue(traits!, 'active')).toBe('Line one\r\nLine two\n\nOther');
  });

  it('keeps the first original by book order when the active book value is empty', () => {
    const result = buildCharacterSyncPlan([
      book('active', [character({ data: { traits: '   ' } })]),
      book('first', [character({ data: { traits: ' First version ' } })]),
      book('duplicate', [character({ data: { traits: 'First version' } })]),
      book('other', [character({ data: { traits: 'Second version' } })]),
    ], entityId);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;

    const traits = result.plan.fields.find(field => field.field === 'data.traits');
    expect(traits).toBeDefined();
    expect(buildCombinedCharacterSyncValue(traits!, 'active')).toBe(' First version \n\nSecond version');
  });

  it('preserves an existing manual edit when switching away and back', () => {
    const result = buildCharacterSyncPlan([
      book('active', [character({ data: { traits: 'Active' } })]),
      book('other', [character({ data: { traits: 'Other' } })]),
    ], entityId);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;

    const traits = result.plan.fields.find(field => field.field === 'data.traits');
    expect(traits).toBeDefined();
    const choiceAfterSwitch = { mode: 'value', value: 'Other', manualValue: 'Edited draft' } as const;
    expect(selectManualCharacterSyncChoice(traits!, 'active', choiceAfterSwitch)).toEqual({
      mode: 'manual',
      value: 'Edited draft',
      manualValue: 'Edited draft',
    });
  });

  it('defaults fillable to its suggestion and conflict to skip', () => {
    const result = buildCharacterSyncPlan([
      book('a', [character({ data: { age: '30', traits: 'A' } })]),
      book('b', [character({ data: { age: '', traits: 'B' } })]),
    ], entityId);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    const fields = getActionableCharacterSyncFields(result.plan);
    const choices = createInitialCharacterSyncChoices(fields);

    expect(choices['data.age']).toEqual({ mode: 'value', value: '30' });
    expect(choices['data.traits']).toEqual({ mode: 'skip', value: '' });
  });

  it('creates one valid resolution per field and supports manual text', () => {
    const result = buildCharacterSyncPlan([
      book('a', [character({ data: { traits: 'A' } })]),
      book('b', [character({ data: { traits: 'B' } })]),
    ], entityId);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    const fields = getActionableCharacterSyncFields(result.plan);
    const translated = buildCharacterSyncResolutionsFromChoices(fields, {
      'data.traits': { mode: 'manual', value: 'Combined' },
    });

    expect(translated).toEqual({
      resolutions: [{ field: 'data.traits', action: 'use_value', value: 'Combined' }],
    });
  });

  it('rejects blank manual text before applying', () => {
    const result = buildCharacterSyncPlan([
      book('a', [character({ data: { traits: 'A' } })]),
      book('b', [character({ data: { traits: 'B' } })]),
    ], entityId);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    const fields = getActionableCharacterSyncFields(result.plan);

    expect(buildCharacterSyncResolutionsFromChoices(fields, {
      'data.traits': { mode: 'manual', value: '   ' },
    }).error).toBeTruthy();
  });
});
