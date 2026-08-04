import React from 'react';
import StandardAccordionQuestionnaire, { type StandardAccordionQuestionnaireProps } from './StandardAccordionQuestionnaire';
import type { Scene } from '../../types';
import MultiScenePicker from '../plot-planning/MultiScenePicker';

type TwistQuestionnaireProps = Omit<StandardAccordionQuestionnaireProps, 'idPrefix' | 'renderAfterQuestion'> & {
  scenes?: Scene[];
  onUpdateQuestionSceneIds?: (questionId: string, sceneIds: string[]) => void;
};

const TwistQuestionnaire: React.FC<TwistQuestionnaireProps> = ({ scenes = [], onUpdateQuestionSceneIds, ...props }) => (
  <StandardAccordionQuestionnaire
    idPrefix="twist"
    {...props}
    renderAfterQuestion={onUpdateQuestionSceneIds ? (question) => (
      <MultiScenePicker
        scenes={scenes}
        links={(props.entry.sceneIdsByQuestionId?.[question.id] || []).map(sceneId => ({ id: `${question.id}:${sceneId}`, sceneId }))}
        onUpdate={(links) => onUpdateQuestionSceneIds(question.id, links.flatMap(link => link.sceneId ? [link.sceneId] : []))}
        placeholder="בחרי סצנה לקישור..."
      />
    ) : undefined}
  />
);

export default TwistQuestionnaire;
