import type { QuestionnaireTabId } from '../questionnaireNavigation';

export const getQuestionnaireFallbackName = (tab: QuestionnaireTabId) =>
  tab === 'characters' ? 'דמות ללא שם' : 'פריט ללא שם';

export const getEditableQuestionnaireName = (name?: string | null) => name ?? '';

export const getQuestionnaireDisplayName = (
  name: string | null | undefined,
  tab: QuestionnaireTabId,
) => name?.trim() || getQuestionnaireFallbackName(tab);

export const resolveQuestionnaireNameOnBlur = (
  name: string,
  tab: QuestionnaireTabId,
) => name.trim() ? name : getQuestionnaireFallbackName(tab);
