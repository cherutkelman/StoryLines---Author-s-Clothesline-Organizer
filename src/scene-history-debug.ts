export const isSceneHistoryDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('debugSceneHistory') === '1';
};

export const logSceneHistoryDebug = (message: string, data?: Record<string, unknown>) => {
  if (!isSceneHistoryDebugEnabled()) return;
  console.log('[SceneHistoryDebug]', message, data || {});
};
