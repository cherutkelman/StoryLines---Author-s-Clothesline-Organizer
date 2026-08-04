import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import QuestionnaireFields, {
  hasQuestionnaireLineBreak,
  resolveQuestionnaireEditorType,
  type QuestionnaireQuestion,
} from './QuestionnaireFields';

const textQuestion: QuestionnaireQuestion = {
  id: 'residence',
  category: 'Identity',
  question: 'Residence',
  type: 'text',
};
const textareaQuestion: QuestionnaireQuestion = {
  ...textQuestion,
  id: 'description',
  type: 'textarea',
};

const renderFields = (
  questions: QuestionnaireQuestion[],
  data: Record<string, string>,
  onChange = vi.fn()
) => renderToStaticMarkup(
  <QuestionnaireFields
    questions={questions}
    data={data}
    onChange={onChange}
    promoteMultilineTextValues
  />
);

describe('QuestionnaireFields multiline editing', () => {
  it('keeps a regular text value in a single-line input', () => {
    const html = renderFields([textQuestion], { residence: 'Ramat Gan' });

    expect(html).toContain('<input');
    expect(html).not.toContain('<textarea');
  });

  it('renders a multiline text value in a textarea without changing blank lines or saving', () => {
    const value = 'First\n\nSecond';
    const onChange = vi.fn();
    const html = renderFields([textQuestion], { residence: value }, onChange);

    expect(html).toContain('<textarea');
    expect(html).toContain(`>${value}</textarea>`);
    expect(html).toContain('overflow-x-hidden');
    expect(html).toContain('whitespace-pre-wrap');
    expect(html).toContain('break-words');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('preserves every line in a three-part value', () => {
    const value = 'First\n\nSecond\n\nThird';

    expect(renderFields([textQuestion], { residence: value })).toContain(`>${value}</textarea>`);
  });

  it('detects LF, CRLF, and CR without normalizing the original value', () => {
    expect(hasQuestionnaireLineBreak('First\nSecond')).toBe(true);
    expect(hasQuestionnaireLineBreak('First\r\nSecond')).toBe(true);
    expect(hasQuestionnaireLineBreak('First\rSecond')).toBe(true);
    expect(hasQuestionnaireLineBreak('First Second')).toBe(false);
    expect(renderFields([textQuestion], { residence: 'First\r\nSecond' }))
      .toContain('>First\r\nSecond</textarea>');
  });

  it('keeps configured textarea questions as textareas', () => {
    const html = renderFields([textareaQuestion], { description: 'Single line' });

    expect(html).toContain('<textarea');
    expect(html).not.toContain('overflow-x-hidden');
  });

  it('keeps a promoted editor stable after line breaks are removed during the edit session', () => {
    const promotedTextFieldIds = new Set<string>();

    expect(resolveQuestionnaireEditorType(
      textQuestion,
      'First\n\nSecond',
      promotedTextFieldIds,
      true
    )).toBe('textarea');
    expect(resolveQuestionnaireEditorType(
      textQuestion,
      'First Second',
      promotedTextFieldIds,
      true
    )).toBe('textarea');
  });

  it('does not promote multiline text fields when the behavior is disabled', () => {
    expect(resolveQuestionnaireEditorType(
      textQuestion,
      'First\nSecond',
      new Set<string>(),
      false
    )).toBe('input');
  });
});
