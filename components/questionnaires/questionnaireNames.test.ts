import { describe, expect, it } from 'vitest';
import {
  getEditableQuestionnaireName,
  getQuestionnaireDisplayName,
  resolveQuestionnaireNameOnBlur,
} from './questionnaireNames';

describe('questionnaire item names', () => {
  it('keeps an empty value empty while editing', () => {
    expect(getEditableQuestionnaireName('')).toBe('');
  });

  it('allows a new name to be typed after clearing the field', () => {
    expect(getEditableQuestionnaireName('שם חדש')).toBe('שם חדש');
  });

  it('keeps a non-empty name on blur without changing existing whitespace behavior', () => {
    expect(resolveQuestionnaireNameOnBlur('  שם חדש  ', 'characters')).toBe('  שם חדש  ');
  });

  it('applies the existing fallback only on blur when the name is blank', () => {
    expect(resolveQuestionnaireNameOnBlur('', 'characters')).toBe('דמות ללא שם');
    expect(resolveQuestionnaireNameOnBlur('   ', 'places')).toBe('פריט ללא שם');
    expect(resolveQuestionnaireNameOnBlur('', 'periods')).toBe('פריט ללא שם');
    expect(resolveQuestionnaireNameOnBlur('', 'twists')).toBe('פריט ללא שם');
    expect(resolveQuestionnaireNameOnBlur('', 'fantasyWorlds')).toBe('פריט ללא שם');
    expect(resolveQuestionnaireNameOnBlur('', 'backgrounds')).toBe('פריט ללא שם');
  });

  it('uses fallbacks for non-editing display without changing the editable value', () => {
    expect(getQuestionnaireDisplayName('', 'characters')).toBe('דמות ללא שם');
    expect(getQuestionnaireDisplayName('', 'places')).toBe('פריט ללא שם');
    expect(getEditableQuestionnaireName('')).toBe('');
  });
});
