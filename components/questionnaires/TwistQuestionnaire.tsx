import React from 'react';
import StandardAccordionQuestionnaire, { type StandardAccordionQuestionnaireProps } from './StandardAccordionQuestionnaire';

type TwistQuestionnaireProps = Omit<StandardAccordionQuestionnaireProps, 'idPrefix'>;

const TwistQuestionnaire: React.FC<TwistQuestionnaireProps> = (props) => (
  <StandardAccordionQuestionnaire idPrefix="twist" {...props} />
);

export default TwistQuestionnaire;
