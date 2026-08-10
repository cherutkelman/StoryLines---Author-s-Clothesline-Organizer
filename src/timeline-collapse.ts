export const toggleTimelineCollapsedGroupId = (
  collapsedGroupIds: readonly string[],
  groupId: string
): string[] => {
  const collapsedIds = new Set(collapsedGroupIds);
  if (collapsedIds.has(groupId)) {
    collapsedIds.delete(groupId);
  } else {
    collapsedIds.add(groupId);
  }
  return [...collapsedIds];
};
