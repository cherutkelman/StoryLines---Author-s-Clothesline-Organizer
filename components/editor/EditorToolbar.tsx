import React from 'react';
import { AlignJustify, BookOpen, Download, Focus, Hash, History, Info, Plus, Search, X } from 'lucide-react';
import type { EditorDisplayMode } from './editorTypes';

interface EditorToolbarProps {
  totalWords: number;
  displayMode: EditorDisplayMode;
  isSearchOpen: boolean;
  searchQuery: string;
  hasActiveScene: boolean;
  onDisplayModeChange: (mode: EditorDisplayMode) => void;
  onSearchOpenChange: (isOpen: boolean) => void;
  onSearchQueryChange: (query: string) => void;
  onOpenBulkAdd: () => void;
  onOpenQuestionnaireBridge: () => void;
  onExport?: () => void;
  onOpenHistory: () => void;
  onOpenTips: () => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ totalWords, displayMode, isSearchOpen, searchQuery, hasActiveScene, onDisplayModeChange, onSearchOpenChange, onSearchQueryChange, onOpenBulkAdd, onOpenQuestionnaireBridge, onExport, onOpenHistory, onOpenTips }) => (
  <div className="sticky top-4 z-40 mb-12 flex flex-col items-center gap-4">
    <div className="bg-[var(--theme-primary)]/90 backdrop-blur-md text-[var(--theme-bg)] px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-6 border border-[var(--theme-primary)]/50">
      <div className="flex items-center gap-2 px-4 py-1.5 bg-[var(--theme-bg)] text-[var(--theme-primary)] rounded-lg shadow-sm"><Hash size={16} className="opacity-70" /><span className="text-sm font-black tabular-nums">{totalWords.toLocaleString()} מילים</span></div>
      <div className="hidden sm:flex items-center gap-1 bg-black/10 p-1 rounded-lg">
        <button onClick={() => onDisplayModeChange('focus')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${displayMode === 'focus' ? 'bg-[var(--theme-bg)] text-[var(--theme-primary)] shadow-sm' : 'text-[var(--theme-bg)]/60 hover:text-[var(--theme-bg)]'}`}><Focus size={14} /><span>סגור הכל</span></button>
        <button onClick={() => onDisplayModeChange('full')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${displayMode === 'full' ? 'bg-[var(--theme-bg)] text-[var(--theme-primary)] shadow-sm' : 'text-[var(--theme-bg)]/60 hover:text-[var(--theme-bg)]'}`}><AlignJustify size={14} /><span>מלא</span></button>
      </div>
      <div className="hidden sm:block w-px h-6 bg-[var(--theme-bg)]/10 mx-1" />
      <div className="flex items-center gap-2">
        {isSearchOpen ? <div className="hidden sm:flex items-center bg-[var(--theme-bg)] text-[var(--theme-primary)] rounded-lg px-3 py-1.5 shadow-sm animate-in fade-in slide-in-from-right-2"><Search size={14} className="opacity-70 mr-2" /><input autoFocus value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} placeholder="חפש מילים..." className="bg-transparent border-none focus:ring-0 text-xs text-[var(--theme-primary)] placeholder:text-[var(--theme-primary)]/40 w-32" /><button onClick={() => { onSearchOpenChange(false); onSearchQueryChange(''); }} className="text-[var(--theme-primary)]/40 hover:text-[var(--theme-primary)] ml-2"><X size={14} /></button></div> : <button onClick={() => onSearchOpenChange(true)} className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-[var(--theme-bg)] text-[var(--theme-primary)] rounded-lg text-xs font-bold hover:opacity-80 transition-all shadow-sm" title="חיפוש"><Search size={14} /><span>חיפוש</span></button>}
        <button onClick={onOpenBulkAdd} className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-[var(--theme-bg)] text-[var(--theme-primary)] rounded-lg text-xs font-bold hover:opacity-80 transition-all shadow-sm" title="הוספת סצנות חדשות"><Plus size={14} /><span>סצנה חדשה</span></button>
        <button onClick={onOpenQuestionnaireBridge} className={`flex items-center gap-2 px-4 py-1.5 bg-[var(--theme-bg)] text-[var(--theme-primary)] rounded-lg text-xs font-bold transition-all shadow-sm ${hasActiveScene ? 'hover:opacity-80' : 'opacity-40 cursor-not-allowed'}`} title="שליפת מידע מהשאלונים"><BookOpen size={14} /><span>שלוף משאלון</span></button>
        <div className="hidden sm:block w-px h-6 bg-[var(--theme-bg)]/10 mx-1" />
        <button onClick={onExport} className={`flex items-center gap-2 px-4 py-1.5 bg-[var(--theme-bg)] text-[var(--theme-primary)] rounded-lg text-xs font-bold transition-all shadow-sm ${hasActiveScene ? 'hover:opacity-80' : 'opacity-40 cursor-not-allowed'}`} title="ייצוא כתב יד"><Download size={14} /><span>ייצוא</span></button>
        <button onClick={onOpenHistory} disabled={!hasActiveScene} className={`flex items-center gap-2 px-4 py-1.5 bg-[var(--theme-bg)] text-[var(--theme-primary)] rounded-lg text-xs font-bold transition-all shadow-sm ${hasActiveScene ? 'hover:opacity-80' : 'opacity-40 cursor-not-allowed'}`} title="היסטוריית גרסאות"><History size={14} /><span>היסטוריית גרסאות</span></button>
        <button onClick={onOpenTips} className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-[var(--theme-bg)] text-[var(--theme-primary)] rounded-lg text-xs font-bold hover:opacity-80 transition-all shadow-sm" title="מידע על כתיבה"><Info size={14} /><span>טיפים</span></button>
      </div>
    </div>
  </div>
);

export default EditorToolbar;
