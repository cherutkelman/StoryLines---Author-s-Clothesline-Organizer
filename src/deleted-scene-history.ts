import type { Project, SceneVersion } from '../types';

type SceneInventoryFields = Pick<Project, 'scenes' | 'plotlines' | 'bookSequence'>;

export function readSceneInventory(book?: Partial<SceneInventoryFields>) {
  const scenes = Array.isArray(book?.scenes) ? book.scenes : [];
  const ids = new Set(scenes.flatMap(scene => typeof scene?.id === 'string' && scene.id ? [scene.id] : []));
  const referencedIds = new Set(
    (Array.isArray(book?.bookSequence) ? book.bookSequence : [])
      .flatMap(item => item?.type === 'scene' ? [item.sceneId] : []),
  );
  return {
    ids,
    referencedIds,
    complete: Array.isArray(book?.scenes) && ids.size === scenes.length && Array.isArray(book.plotlines)
      && (book.bookSequence == null || Array.isArray(book.bookSequence)),
  };
}

export type SceneInventory = ReturnType<typeof readSceneInventory>;

export function groupMissingSceneVersions(
  bookId: string,
  project: SceneInventoryFields,
  stored: SceneInventory,
  versions: SceneVersion[],
) {
  const current = readSceneInventory(project);
  const groups = new Map<string, SceneVersion[]>();
  const seen = new Set<string>();
  const sortedVersions = [...versions].sort((left, right) => right.createdAt - left.createdAt);

  for (const version of sortedVersions) {
    if (version.bookId !== bookId || !version.sceneId || seen.has(version.id)) continue;
    if (current.ids.has(version.sceneId) || stored.ids.has(version.sceneId)) continue;

    seen.add(version.id);
    const group = groups.get(version.sceneId) ?? [];
    group.push(version);
    groups.set(version.sceneId, group);
  }

  return Array.from(groups, ([sceneId, sceneVersions]) => ({
    sceneId,
    title: sceneVersions.find(version => version.sceneTitle?.trim())?.sceneTitle,
    versions: sceneVersions,
    verified: current.complete && stored.complete
      && !current.referencedIds.has(sceneId) && !stored.referencedIds.has(sceneId),
  }));
}
