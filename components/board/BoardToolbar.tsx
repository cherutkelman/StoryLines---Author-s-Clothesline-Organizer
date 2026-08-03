import React from 'react';
import { CopyPlus, Download, History, LayoutGrid, Maximize, Rows, ZoomIn, ZoomOut } from 'lucide-react';
import { BoardViewMode } from '../../types';

interface BoardToolbarProps {
  zoomLevel: number;
  viewMode: BoardViewMode;
  isPreviewMode: boolean;
  canOpenHistory: boolean;
  onZoomChange: (zoom: number) => void;
  onViewModeChange: (mode: BoardViewMode) => void;
  onBulkAdd: () => void;
  onExport: () => void;
  onOpenHistory: () => void;
}

const BoardToolbar: React.FC<BoardToolbarProps> = props => (
  <>
    <div className="absolute top-6 left-6 z-40 hidden items-center gap-3 bg-[var(--theme-card)]/80 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-[var(--theme-border)] lg:flex">
      <button onClick={() => props.onZoomChange(Math.max(0.2, props.zoomLevel - 0.1))} className="p-2 text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-xl transition-colors" title="הקטנה"><ZoomOut size={20} /></button>
      <input type="range" min="0.2" max="1.5" step="0.05" value={props.zoomLevel} onChange={event => props.onZoomChange(parseFloat(event.target.value))} className="w-32 accent-[var(--theme-primary)]" />
      <button onClick={() => props.onZoomChange(Math.min(1.5, props.zoomLevel + 0.1))} className="p-2 text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-xl transition-colors" title="הגדלה"><ZoomIn size={20} /></button>
      <div className="w-px h-6 bg-[var(--theme-border)] mx-1" />
      <button onClick={() => props.onZoomChange(1)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-lg transition-colors"><Maximize size={16} /><span>{Math.round(props.zoomLevel * 100)}%</span></button>
      <div className="w-px h-6 bg-[var(--theme-border)] mx-1" />
      <div className="flex bg-[var(--theme-secondary)]/50 p-1 rounded-xl border border-[var(--theme-border)]/50">
        <button onClick={() => props.onViewModeChange('plotlines')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${props.viewMode === 'plotlines' ? 'bg-[var(--theme-card)] text-[var(--theme-primary)] shadow-sm' : 'text-[var(--theme-primary)]/40 hover:text-[var(--theme-primary)]'}`} title="תצוגת קווי עלילה"><LayoutGrid size={16} /><span>קווים</span></button>
        <button onClick={() => props.onViewModeChange('chapters')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${props.viewMode === 'chapters' ? 'bg-[var(--theme-card)] text-[var(--theme-primary)] shadow-sm' : 'text-[var(--theme-primary)]/40 hover:text-[var(--theme-primary)]'}`} title="תצוגת פרקים"><Rows size={16} /><span>פרקים</span></button>
      </div>
    </div>
    <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+9.25rem)] left-6 z-40 flex items-center gap-3 lg:bottom-auto lg:left-auto lg:right-6 lg:top-6">
      <button onClick={props.onBulkAdd} disabled={props.isPreviewMode} className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-card)] border border-[var(--theme-primary)] rounded-xl shadow-lg hover:opacity-90 transition-all font-bold text-sm disabled:cursor-not-allowed disabled:opacity-40" title="הוספה מהירה של סצנות"><CopyPlus size={18} /><span>הוספה מהירה</span></button>
      <button onClick={props.onExport} className="hidden items-center gap-2 px-4 py-2 bg-[var(--theme-card)]/80 backdrop-blur-md text-[var(--theme-primary)] border border-[var(--theme-border)] rounded-xl shadow-lg hover:bg-[var(--theme-secondary)] transition-all font-bold text-sm lg:flex" title="ייצוא לוח עלילה"><Download size={18} /><span>ייצוא לוח</span></button>
      <button onClick={props.onOpenHistory} disabled={!props.canOpenHistory} className="hidden items-center gap-2 px-4 py-2 bg-[var(--theme-card)]/80 backdrop-blur-md text-[var(--theme-primary)] border border-[var(--theme-border)] rounded-xl shadow-lg hover:bg-[var(--theme-secondary)] transition-all font-bold text-sm disabled:cursor-not-allowed disabled:opacity-40 lg:flex" title="היסטוריית גרסאות"><History size={18} /><span>היסטוריית גרסאות</span></button>
    </div>
  </>
);

export default BoardToolbar;
