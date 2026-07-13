import React, { useEffect, useState } from 'react';
import { clearAuthDebugEvents, formatAuthDebugEntries, getAuthDebugEntries, isAuthDebugEnabled, subscribeAuthDebugEvents, type AuthDebugEntry } from '../src/authDebug';

const AuthDebugPanel: React.FC = () => {
  const [isClosed, setIsClosed] = useState(false);
  const [entries, setEntries] = useState<AuthDebugEntry[]>(() => getAuthDebugEntries());

  useEffect(() => {
    if (!isAuthDebugEnabled()) return;
    return subscribeAuthDebugEvents(setEntries);
  }, []);

  if (!isAuthDebugEnabled() || isClosed) return null;

  const copyLogs = async () => {
    const text = formatAuthDebugEntries(entries);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      console.log('[AUTH DEBUG] Copy failed; logs:', text);
    }
  };

  return (
    <div className="fixed inset-x-2 bottom-2 z-[9999] max-h-[45vh] rounded-2xl border border-slate-700 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur-sm sm:inset-x-auto sm:left-4 sm:w-[420px]" dir="ltr">
      <div className="flex items-center justify-between gap-2 border-b border-slate-700 px-3 py-2">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-wider text-slate-200">Auth Debug</div>
          <div className="text-[10px] text-slate-400">{entries.length} events</div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={copyLogs} className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-100 hover:bg-slate-700">Copy logs</button>
          <button onClick={clearAuthDebugEvents} className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-100 hover:bg-slate-700">Clear</button>
          <button onClick={() => setIsClosed(true)} className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-100 hover:bg-slate-700">Close</button>
        </div>
      </div>
      <div className="max-h-[34vh] overflow-y-auto px-3 py-2 font-mono text-[11px] leading-relaxed">
        {entries.length === 0 ? (
          <div className="text-slate-500">No auth events yet.</div>
        ) : entries.map(entry => (
          <div key={entry.id} className="border-b border-slate-800 py-1 last:border-b-0">
            <span className="text-slate-500">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>{' '}
            <span className="font-bold text-cyan-200">{entry.event}</span>
            {entry.details && (
              <span className="text-slate-300">
                {' '}
                {Object.entries(entry.details)
                  .filter(([, value]) => value !== undefined)
                  .map(([key, value]) => `${key}=${String(value)}`)
                  .join(' ')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AuthDebugPanel;
