import type { Project } from '../../types';
import { normalizeBookSequence } from '../../src/book-sequence';

/** Use the same sequence slot and App action as the board; do not change editor focus or expansion. */
export function addChapterFromEditor(
  project: Project,
  workingSceneIds: readonly (string | null | undefined)[],
  onAddChapterDivider?: (sequenceIndex: number) => void,
): void {
  if (!onAddChapterDivider) return;
  const sequence = normalizeBookSequence(project);
  for (const sceneId of workingSceneIds) {
    if (!sceneId) continue;
    const index = sequence.findIndex(item => item.type === 'scene' && item.sceneId === sceneId);
    if (index !== -1) {
      onAddChapterDivider(index);
      return;
    }
  }
  onAddChapterDivider(sequence.length);
}