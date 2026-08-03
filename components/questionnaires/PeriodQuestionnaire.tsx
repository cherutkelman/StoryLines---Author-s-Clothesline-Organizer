import React from 'react';
import StandardAccordionQuestionnaire, { type StandardAccordionQuestionnaireProps } from './StandardAccordionQuestionnaire';

type PeriodQuestionnaireProps = Omit<StandardAccordionQuestionnaireProps, 'idPrefix'>;

const PeriodQuestionnaire: React.FC<PeriodQuestionnaireProps> = (props) => (
  <StandardAccordionQuestionnaire idPrefix="period" {...props} />
);

export default PeriodQuestionnaire;
