import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquareQuote } from 'lucide-react';

interface BoardSummaryProps {
  summary: string;
  readOnly: boolean;
  onUpdateSummary: (summary: string) => void;
}

const BoardSummary: React.FC<BoardSummaryProps> = ({ summary, readOnly, onUpdateSummary }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  return (
    <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] lg:bottom-6 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6 z-30">
      <div className={`bg-[var(--theme-card)]/90 backdrop-blur-md border border-[var(--theme-border)] rounded-3xl shadow-2xl p-4 flex flex-col gap-2 transition-all duration-300 ${isCollapsed ? 'h-14 overflow-hidden' : ''}`}>
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black text-[var(--theme-primary)] uppercase tracking-widest flex items-center gap-2"><MessageSquareQuote size={14} />תקציר העלילה</h3>
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 hover:bg-[var(--theme-secondary)] rounded-lg transition-colors text-[var(--theme-primary)]/40 hover:text-[var(--theme-primary)]" title={isCollapsed ? 'הגדל תקציר' : 'מזער תקציר'}>{isCollapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
        </div>
        {!isCollapsed && <textarea value={summary} readOnly={readOnly} onChange={event => { if (!readOnly) onUpdateSummary(event.target.value); }} placeholder="כתוב כאן את תקציר העלילה הכללי של הספר..." className="w-full h-24 bg-[var(--theme-secondary)]/50 border border-[var(--theme-border)]/50 rounded-2xl p-4 text-sm text-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/20 outline-none resize-none text-lg leading-relaxed animate-in fade-in slide-in-from-bottom-2" />}
      </div>
    </div>
  );
};

export default BoardSummary;
