export interface SearchRange {
  start: number;
  end: number;
}

export interface SceneSearchMatch extends SearchRange {
  sceneId: string;
}

export const normalizeSearchText = (text: string) => text.replace(/\r\n?/g, '\n');

export function findSceneSearchMatches(scenes: ReadonlyArray<{ id: string; content: string }>, query: string) {
  const matches: SceneSearchMatch[] = [];
  const byScene = new Map<string, SceneSearchMatch[]>();
  const terms = query.trim().split(/\s+/u);
  if (!terms[0]) return { matches, byScene };

  const pattern = new RegExp(terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+'), 'giu');
  for (const scene of scenes) {
    const sceneMatches: SceneSearchMatch[] = [];
    for (const match of normalizeSearchText(scene.content).matchAll(pattern)) {
      const result = { sceneId: scene.id, start: match.index, end: match.index + match[0].length };
      matches.push(result);
      sceneMatches.push(result);
    }
    if (sceneMatches.length) byScene.set(scene.id, sceneMatches);
  }
  return { matches, byScene };
}

export function nextSearchMatchIndex(currentIndex: number | undefined, count: number, step: -1 | 1) {
  if (!count) return undefined;
  if (currentIndex === undefined) return step === 1 ? 0 : count - 1;
  return (Math.min(currentIndex, count - 1) + step + count) % count;
}
