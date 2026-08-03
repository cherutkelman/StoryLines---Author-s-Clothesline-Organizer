import React, { type ReactNode } from 'react';

interface BackgroundQuestionnaireProps {
  children: ReactNode;
}

const BackgroundQuestionnaire: React.FC<BackgroundQuestionnaireProps> = ({ children }) => <>{children}</>;

export default BackgroundQuestionnaire;
