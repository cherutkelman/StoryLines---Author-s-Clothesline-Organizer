import type { Project } from '../../types';
import { normalizeBookSequence } from '../../src/book-sequence';
import { getEditorSceneTargetId } from './EditorSceneList';

export function getEditorSceneInsertionAfter(project: Project, sceneId: string) {
  const scene = project.scenes.find(candidate => candidate.id === sceneId);
  if (!scene || !project.plotlines.some(plotline => plotline.id === scene.plotlineId)) return undefined;
  const index = normalizeBookSequence(project).findIndex(item => item.type === 'scene' && item.sceneId === sceneId);
  if (index === -1) return undefined;
  return { plotlineId: scene.plotlineId, sequenceIndex: index + 1 };
}

export function focusEditorSceneBody(sceneId: string, root: Pick<Document, 'getElementById'>) {
  root.getElementById(getEditorSceneTargetId(sceneId))
    ?.querySelector<HTMLTextAreaElement>('textarea[data-editor-scene-body]')?.focus();
}
