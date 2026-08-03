import React, { type ReactNode } from 'react';
import QuestionnaireAccordion from './QuestionnaireAccordion';

export interface QuestionnaireAccordionContainerProps {
  categories: string[];
  activeCategoryIndex: number;
  onSelectCategory: (index: number) => void;
  onRegisterCategoryAnchor: (category: string, element: HTMLButtonElement | null) => void;
  children: ReactNode;
}

interface Props extends QuestionnaireAccordionContainerProps {
  idPrefix: string;
}

const QuestionnaireAccordionContainer: React.FC<Props> = ({
  idPrefix,
  categories,
  activeCategoryIndex,
  onSelectCategory,
  onRegisterCategoryAnchor,
  children,
}) => (
  <QuestionnaireAccordion
    enabled
    idPrefix={idPrefix}
    categories={categories}
    activeCategoryIndex={activeCategoryIndex}
    onSelectCategory={onSelectCategory}
    registerCategoryAnchor={onRegisterCategoryAnchor}
  >
    {children}
  </QuestionnaireAccordion>
);

export default QuestionnaireAccordionContainer;
