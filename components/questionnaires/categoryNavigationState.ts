export type QuestionnaireMode = 'edit' | 'view';

export const usesAccordionNavigation = (questionnaireType: string) =>
  questionnaireType === 'characters'
  || questionnaireType === 'places'
  || questionnaireType === 'periods'
  || questionnaireType === 'twists'
  || questionnaireType === 'fantasyWorlds';

interface CategoryChangeInput {
  mode: QuestionnaireMode;
  categories: string[];
  currentCategoryIndex: number;
  activeCategory: string | null;
  nextIndex: number;
}

export const isQuestionnaireCategoryChange = ({
  mode,
  categories,
  currentCategoryIndex,
  activeCategory,
  nextIndex,
}: CategoryChangeInput) => {
  if (nextIndex < 0 || nextIndex >= categories.length) return false;
  return mode === 'edit'
    ? nextIndex !== currentCategoryIndex
    : categories[nextIndex] !== activeCategory;
};
