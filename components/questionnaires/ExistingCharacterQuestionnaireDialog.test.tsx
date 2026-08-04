import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { CharacterEntry } from '../../types';
import ExistingCharacterQuestionnaireDialog, {
  getHiddenQuestionnaireCharacters,
} from './ExistingCharacterQuestionnaireDialog';

const character = (id: string, questionnaireVisibility?: 'visible' | 'hidden'): CharacterEntry => ({
  id,
  name: id,
  questionnaireVisibility,
  data: {},
  customFields: [],
});

const renderDialog = (characters: CharacterEntry[]) => renderToStaticMarkup(
  <ExistingCharacterQuestionnaireDialog
    isOpen
    characters={characters}
    onRestoreCharacter={vi.fn()}
    onClose={vi.fn()}
  />
);

describe('ExistingCharacterQuestionnaireDialog', () => {
  it('selects only explicitly hidden characters', () => {
    const hidden = character('Hidden', 'hidden');
    expect(getHiddenQuestionnaireCharacters([
      character('Legacy'),
      character('Visible', 'visible'),
      hidden,
    ])).toEqual([hidden]);
  });

  it('renders an accessible dialog with hidden characters only', () => {
    const html = renderDialog([
      character('Legacy'),
      character('Visible', 'visible'),
      character('Hidden', 'hidden'),
    ]);

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="existing-character-questionnaire-title"');
    expect(html).toContain('פתיחת שאלון לדמות קיימת');
    expect(html).toContain('Hidden');
    expect(html).not.toContain('>Legacy<');
    expect(html).not.toContain('>Visible<');
  });

  it('shows the empty state and disables the action without hidden characters', () => {
    const html = renderDialog([character('Legacy')]);

    expect(html).toContain('אין כרגע דמויות קיימות ללא שאלון.');
    expect(html).toContain('disabled=""');
  });
});
