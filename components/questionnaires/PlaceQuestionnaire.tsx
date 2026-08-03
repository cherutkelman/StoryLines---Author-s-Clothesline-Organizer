import React from 'react';
import QuestionnaireAccordionContainer, { type QuestionnaireAccordionContainerProps } from './QuestionnaireAccordionContainer';

const PlaceQuestionnaire: React.FC<QuestionnaireAccordionContainerProps> = (props) => (
  <QuestionnaireAccordionContainer idPrefix="place" {...props} />
);

export default PlaceQuestionnaire;
