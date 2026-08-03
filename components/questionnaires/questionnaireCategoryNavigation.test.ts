import { describe, expect, it, vi } from 'vitest';
import { isQuestionnaireCategoryChange, usesAccordionNavigation } from './categoryNavigationState';
import { scheduleQuestionnaireCategoryTopScroll } from './useScrollToQuestionnaireCategoryTop';

describe('questionnaire category navigation', () => {
  const categories = ['ראשונה', 'שנייה'];

  it('uses accordion navigation for all approved questionnaire types', () => {
    expect(usesAccordionNavigation('characters')).toBe(true);
    expect(usesAccordionNavigation('places')).toBe(true);
    expect(usesAccordionNavigation('periods')).toBe(true);
    expect(usesAccordionNavigation('twists')).toBe(true);
    expect(usesAccordionNavigation('fantasyWorlds')).toBe(true);
    expect(usesAccordionNavigation('backgrounds')).toBe(false);
    expect(usesAccordionNavigation('relationships')).toBe(false);
  });

  it('recognizes an actual category change', () => {
    expect(isQuestionnaireCategoryChange({
      mode: 'edit',
      categories,
      currentCategoryIndex: 0,
      activeCategory: null,
      nextIndex: 1,
    })).toBe(true);
  });

  it('does not treat selecting the active category as a change', () => {
    expect(isQuestionnaireCategoryChange({
      mode: 'edit',
      categories,
      currentCategoryIndex: 0,
      activeCategory: null,
      nextIndex: 0,
    })).toBe(false);
  });

  it('does not close the active category in accordion-style navigation', () => {
    expect(isQuestionnaireCategoryChange({
      mode: 'view',
      categories,
      currentCategoryIndex: 0,
      activeCategory: 'ראשונה',
      nextIndex: 0,
    })).toBe(false);
  });

  it('scrolls the category anchor once after the new content renders', () => {
    const callbacks: FrameRequestCallback[] = [];
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    const scrollIntoView = vi.fn();

    scheduleQuestionnaireCategoryTopScroll(
      () => ({ scrollIntoView } as unknown as HTMLElement),
      requestFrame,
    );

    callbacks.shift()?.(0);
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });
});
