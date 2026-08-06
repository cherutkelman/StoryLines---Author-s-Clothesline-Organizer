import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { CharacterEntry } from '../../types';
import CharacterLinkSelect from './CharacterLinkSelect';

const characters: CharacterEntry[] = [
  { id: 'first', name: 'דמות ראשונה', data: {}, customFields: [] },
  { id: 'second', name: 'דמות שנייה', data: {}, customFields: [] },
];

const renderSelect = (row: { characterId?: string; characterName?: string }) => renderToStaticMarkup(
  <CharacterLinkSelect row={row} characters={characters} onChange={vi.fn()} />
);

describe('CharacterLinkSelect', () => {
  it('renders book characters and an unassigned option in one RTL select', () => {
    const html = renderSelect({});
    expect(html).toContain('<select');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('ללא דמות משויכת');
    expect(html).toContain('דמות ראשונה');
    expect(html).toContain('דמות שנייה');
    expect(html).not.toContain('<input');
  });

  it('shows unmatched legacy text without discarding it', () => {
    const html = renderSelect({ characterName: 'שם ישן שלא נמצא' });
    expect(html).toContain('שם ישן: שם ישן שלא נמצא — לא משויך');
  });

  it('shows a deleted marker while keeping replacement options available', () => {
    const html = renderSelect({ characterId: 'missing' });
    expect(html).toContain('דמות שנמחקה');
    expect(html).toContain('דמות ראשונה');
  });
});
