export type AuthDebugEntry = {
  id: number;
  timestamp: number;
  event: string;
  details?: Record<string, string | number | boolean | null | undefined>;
};

type AuthDebugListener = (entries: AuthDebugEntry[]) => void;

const entries: AuthDebugEntry[] = [];
const listeners = new Set<AuthDebugListener>();
let nextId = 1;

export const isAuthDebugEnabled = () => {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('debugAuth') === '1';
};

export const shortUid = (uid?: string | null) => uid ? uid.slice(0, 6) : undefined;

export const getAuthDebugEntries = () => entries;

export const formatAuthDebugEntries = (items: AuthDebugEntry[]) =>
  items.map(entry => {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    const details = entry.details
      ? Object.entries(entry.details)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(' ')
      : '';

    return `[${time}] ${entry.event}${details ? ` ${details}` : ''}`;
  }).join('\n');

export const logAuthDebugEvent = (
  event: string,
  details?: Record<string, string | number | boolean | null | undefined>
) => {
  if (!isAuthDebugEnabled()) return;

  entries.push({
    id: nextId++,
    timestamp: Date.now(),
    event,
    details,
  });

  if (entries.length > 200) entries.shift();
  listeners.forEach(listener => listener([...entries]));
};

export const clearAuthDebugEvents = () => {
  entries.length = 0;
  listeners.forEach(listener => listener([]));
};

export const subscribeAuthDebugEvents = (listener: AuthDebugListener) => {
  listeners.add(listener);
  listener([...entries]);
  return () => {
    listeners.delete(listener);
  };
};
