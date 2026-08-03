import React from 'react';
import QuestionnaireAccordionContainer, { type QuestionnaireAccordionContainerProps } from './QuestionnaireAccordionContainer';

const CharacterQuestionnaire: React.FC<QuestionnaireAccordionContainerProps> = (props) => (
  <QuestionnaireAccordionContainer idPrefix="character" {...props} />
);

export default CharacterQuestionnaire;
