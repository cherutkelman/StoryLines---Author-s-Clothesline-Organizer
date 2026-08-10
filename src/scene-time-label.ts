export const normalizeSceneTimeLabel = (value: string): string | undefined => {
  const trimmedValue = value.trim();
  return trimmedValue || undefined;
};
