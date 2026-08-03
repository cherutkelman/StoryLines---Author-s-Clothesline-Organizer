import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import QuestionnaireAccordion from './QuestionnaireAccordion';

describe('QuestionnaireAccordion', () => {
  it.each([
    ['character', ['מידע בסיסי', 'מראה חיצוני', 'אופי ואישיות']],
    ['place', ['מיקום גיאוגרפי', 'מיקום ספציפי']],
    ['period', ['הגדרה בסיסית', 'טכנולוגיה ויכולת', 'חיי יום-יום']],
    ['twist', ['טוויסט']],
    ['fantasy-world', ['יום יום', 'מלחמות', 'כוחות ייחודיים', 'חפצים מיוחדים']],
  ])('renders one accessible expanded panel for %s questionnaires', (idPrefix, categories) => {
    const activeCategoryIndex = Math.min(1, categories.length - 1);
    const markup = renderToStaticMarkup(
      <QuestionnaireAccordion
        enabled
        idPrefix={idPrefix}
        categories={categories}
        activeCategoryIndex={activeCategoryIndex}
        onSelectCategory={vi.fn()}
        registerCategoryAnchor={vi.fn()}
      >
        <div>תוכן פעיל</div>
      </QuestionnaireAccordion>,
    );

    categories.forEach(category => expect(markup).toContain(category));
    expect(markup.match(/aria-expanded="true"/g) || []).toHaveLength(1);
    expect(markup.match(/aria-expanded="false"/g) || []).toHaveLength(categories.length - 1);
    expect(markup.match(/role="region"/g)).toHaveLength(1);
    expect(markup.match(/תוכן פעיל/g)).toHaveLength(1);
    expect(markup).toContain(`aria-controls="${idPrefix}-questionnaire-category-${activeCategoryIndex}-panel"`);
    expect(markup).toContain(`aria-labelledby="${idPrefix}-questionnaire-category-${activeCategoryIndex}"`);
  });

  it('leaves the legacy questionnaire renderer untouched when disabled', () => {
    const markup = renderToStaticMarkup(
      <QuestionnaireAccordion
        enabled={false}
        idPrefix="legacy"
        categories={['קטגוריה']}
        activeCategoryIndex={0}
        onSelectCategory={vi.fn()}
        registerCategoryAnchor={vi.fn()}
      >
        <div>תוכן קיים</div>
      </QuestionnaireAccordion>,
    );

    expect(markup).toBe('<div>תוכן קיים</div>');
  });
});
