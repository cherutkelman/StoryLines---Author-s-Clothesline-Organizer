type ElectronIpcRenderer = {
  on: (channel: string, listener: (...args: any[]) => void) => void;
  removeListener: (channel: string, listener: (...args: any[]) => void) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  send: (channel: string, ...args: any[]) => void;
};

const target = String(import.meta.env.VITE_APP_TARGET || '').toLowerCase();
const isTargetWeb = target === 'web';
const isTargetDesktop = target === 'desktop';

const getElectronIpcRenderer = (): ElectronIpcRenderer | null => {
  if (isTargetWeb || typeof window === 'undefined') return null;

  try {
    const requireElectron = (window as any).require;
    if (!requireElectron) return null;
    return requireElectron('electron')?.ipcRenderer || null;
  } catch {
    return null;
  }
};

export const isElectron = isTargetDesktop || (!isTargetWeb && Boolean(getElectronIpcRenderer()));
export const isWeb = isTargetWeb || !isElectron;

export const subscribeToDesktopUpdates = (
  onUpdateAvailable: () => void,
  onUpdateDownloaded: () => void
) => {
  if (!isElectron) return () => {};

  const ipcRenderer = getElectronIpcRenderer();
  if (!ipcRenderer) return () => {};

  ipcRenderer.on('update_available', onUpdateAvailable);
  ipcRenderer.on('update_downloaded', onUpdateDownloaded);

  return () => {
    ipcRenderer.removeListener('update_available', onUpdateAvailable);
    ipcRenderer.removeListener('update_downloaded', onUpdateDownloaded);
  };
};

export const restartDesktopApp = () => {
  if (!isElectron) return;
  getElectronIpcRenderer()?.send('restart_app');
};

export const openDesktopImageDialog = async (): Promise<string | null> => {
  if (!isElectron) return null;
  return getElectronIpcRenderer()?.invoke('open-image-dialog') || null;
};

export const openDesktopOAuthUrl = async (url: string): Promise<string | null> => {
  if (!isElectron) return null;
  return getElectronIpcRenderer()?.invoke('open-external-url', url) || null;
};
