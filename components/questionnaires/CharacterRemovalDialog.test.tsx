import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { CharacterEntry } from '../../types';
import CharacterRemovalDialog, { runCharacterRemovalAction } from './CharacterRemovalDialog';

const character: CharacterEntry = {
  id: 'local-id',
  characterEntityId: 'entity-id',
  name: 'דמות לבדיקה',
  imageUrl: 'data:image/png;base64,image',
  data: {},
  customFields: [],
};

describe('CharacterRemovalDialog', () => {
  it('renders the character and all three neutral, accessible choices', () => {
    const html = renderToStaticMarkup(
      <CharacterRemovalDialog
        isOpen
        character={character}
        onHideFromQuestionnaire={vi.fn()}
        onDeleteFromBook={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="character-removal-dialog-title"');
    expect(html).toContain('מה לעשות עם הדמות?');
    expect(html).toContain(character.name);
    expect(html).toContain('הסרה משאלון הדמויות');
    expect(html).toContain('מחיקה מהספר ומהמפות');
    expect(html).toContain('>ביטול</button>');
    expect(html).not.toContain('בחרי');
    expect(html).not.toContain('מחקי');
    expect(html).not.toContain('הסירי');
  });

  it('routes hide and full deletion to separate callbacks', () => {
    const hide = vi.fn();
    const remove = vi.fn();

    expect(runCharacterRemovalAction({
      action: 'hide', characterId: character.id, submitting: { current: false },
      onHideFromQuestionnaire: hide, onDeleteFromBook: remove,
    })).toBe(true);
    expect(hide).toHaveBeenCalledWith(character.id);
    expect(remove).not.toHaveBeenCalled();

    hide.mockClear();
    expect(runCharacterRemovalAction({
      action: 'delete', characterId: character.id, submitting: { current: false },
      onHideFromQuestionnaire: hide, onDeleteFromBook: remove,
    })).toBe(true);
    expect(remove).toHaveBeenCalledWith(character.id);
    expect(hide).not.toHaveBeenCalled();
  });

  it('prevents a second action while the first one is running', () => {
    const submitting = { current: false };
    const hide = vi.fn();
    const remove = vi.fn();
    const options = {
      characterId: character.id,
      submitting,
      onHideFromQuestionnaire: hide,
      onDeleteFromBook: remove,
    };

    expect(runCharacterRemovalAction({ ...options, action: 'hide' })).toBe(true);
    expect(runCharacterRemovalAction({ ...options, action: 'delete' })).toBe(false);
    expect(hide).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
  });
});
