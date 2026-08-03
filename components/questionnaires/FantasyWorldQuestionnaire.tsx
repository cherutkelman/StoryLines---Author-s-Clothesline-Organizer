import React from 'react';
import QuestionnaireAccordionContainer, { type QuestionnaireAccordionContainerProps } from './QuestionnaireAccordionContainer';

const FantasyWorldQuestionnaire: React.FC<QuestionnaireAccordionContainerProps> = (props) => (
  <QuestionnaireAccordionContainer idPrefix="fantasy-world" {...props} />
);

export default FantasyWorldQuestionnaire;
