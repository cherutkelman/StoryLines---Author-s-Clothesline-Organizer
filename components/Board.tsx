
import React, { useRef, useState } from 'react';
import { Scene, Project } from '../types';
import { Plus, CheckCircle2, CopyPlus, ZoomIn, ZoomOut, Maximize, MessageSquareQuote, Download } from 'lucide-react';

interface BoardProps {
  project: Project;
  title: string;
  visiblePlotlines: string[];
  onAddScene: (plotlineId: string, position: number) => void;
  onMoveScene: (id: string, targetGlobalIndex: number, targetPlotlineId: string) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  onBulkAdd: (plotlineId: string) => void;
  initialZoom?: number;
  onZoomChange?: (zoom: number) => void;
  onSceneDoubleClick?: (sceneId: string) => void;
  onUpdateSummary: (summary: string) => void;
  onUpdateChapterTitle: (position: number, title: string) => void;
}

const Board: React.FC<BoardProps> = ({ project, title, visiblePlotlines, onAddScene, onMoveScene, updateScene, onBulkAdd, initialZoom, onZoomChange, onSceneDoubleClick, onUpdateSummary, onUpdateChapterTitle }) => {
  const dragItem = useRef<{ sceneId: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(initialZoom || 1);
  const boardRef = useRef<HTMLDivElement>(null);

  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(newZoom);
    onZoomChange?.(newZoom);
  };

  const handleDragStart = (sceneId: string) => {
    dragItem.current = { sceneId };
  };

  const handleDrop = (e: React.DragEvent, targetGlobalIndex: number, targetPlotlineId: string) => {
    e.preventDefault();
    if (dragItem.current) {
      onMoveScene(dragItem.current.sceneId, targetGlobalIndex, targetPlotlineId);
    }
    dragItem.current = null;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleResetZoom = () => setZoomLevel(1);

  const exportBoard = () => {
    let text = `ייצוא לוח עלילה - ${title}\n`;
    text += `תאריך: ${new Date().toLocaleDateString('he-IL')}\n`;
    text += `-----------------------------------\n\n`;

    // Export all plotlines that have scenes
    project.plotlines.forEach(plotline => {
      const plotlineScenes = project.scenes
        .filter(s => s.plotlineId === plotline.id)
        .sort((a, b) => a.position - b.position);

      if (plotlineScenes.length > 0) {
        text += `קו עלילה: ${plotline.name}\n`;
        text += `===================================\n\n`;
        
        plotlineScenes.forEach((scene, index) => {
          text += `פתק ${index + 1}: ${scene.title || 'ללא כותרת'}\n`;
          text += `תוכן:\n${scene.content || 'סצנה ריקה...'}\n`;
          text += `-----------------------------------\n\n`;
        });
        
        text += `\n`;
      }
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `board-export-${title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // The number of columns is the number of scenes plus one for adding at the end
  const columnCount = Math.max(project.scenes.length + 1, 10); 

  const activePlotlines = project.plotlines.filter(p => visiblePlotlines.includes(p.id));

  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col">
      {/* Zoom Controls Overlay */}
      <div className="absolute top-6 left-6 z-40 flex items-center gap-3 bg-[var(--bg-card)]/80 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-[var(--color-border)]">
        <button 
          onClick={() => handleZoomChange(Math.max(0.2, zoomLevel - 0.1))}
          className="p-2 text-[var(--color-primary)] hover:bg-[var(--color-secondary)] rounded-xl transition-colors"
          title="הקטנה"
        >
          <ZoomOut size={20} />
        </button>
        
        <input 
          type="range" 
          min="0.2" 
          max="1.5" 
          step="0.05" 
          value={zoomLevel} 
          onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
          className="w-32 accent-[var(--color-primary)]"
        />

        <button 
          onClick={() => handleZoomChange(Math.min(1.5, zoomLevel + 0.1))}
          className="p-2 text-[var(--color-primary)] hover:bg-[var(--color-secondary)] rounded-xl transition-colors"
          title="הגדלה"
        >
          <ZoomIn size={20} />
        </button>

        <div className="w-px h-6 bg-[var(--color-border)] mx-1" />

        <button 
          onClick={() => handleZoomChange(1)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-[var(--text-accent)] hover:bg-[var(--color-secondary)] rounded-lg transition-colors"
        >
          <Maximize size={16} />
          <span>{Math.round(zoomLevel * 100)}%</span>
        </button>
      </div>

      {/* Top Right Actions */}
      <div className="absolute top-6 right-6 z-40 flex items-center gap-3">
        <button 
          onClick={() => onBulkAdd(project.plotlines[0]?.id || '')}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white border border-[var(--color-primary)] rounded-xl shadow-lg hover:opacity-90 transition-all font-bold text-sm"
          title="הוספה מהירה של סצנות"
        >
          <CopyPlus size={18} />
          <span>הוספה מהירה</span>
        </button>
        <button 
          onClick={exportBoard}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)]/80 backdrop-blur-md text-[var(--color-primary)] border border-[var(--color-border)] rounded-xl shadow-lg hover:bg-[var(--color-secondary)] transition-all font-bold text-sm"
          title="ייצוא לוח עלילה"
        >
          <Download size={18} />
          <span>ייצוא לוח</span>
        </button>
      </div>

      {/* Board Scrollable Area */}
      <div className="flex-1 overflow-auto bg-[var(--bg-page)] cursor-grab active:cursor-grabbing scrollbar-hide">
        <div 
          ref={boardRef}
          className="p-32 pb-64 transition-transform duration-200 origin-top-right"
          style={{ 
            transform: `scale(${zoomLevel})`,
            width: `${100 / zoomLevel}%`,
            minWidth: 'max-content'
          }}
        >
          <div className="relative">
            {/* Plotline Ropes */}
            {activePlotlines.map((plotline) => (
              <div key={plotline.id} className="relative h-48 flex items-center mb-12">
                <div 
                  className="absolute inset-x-0 h-0.5 opacity-40 shadow-sm"
                  style={{ 
                    backgroundColor: plotline.color, 
                    top: '50%',
                    backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.1) 50%, transparent 50%)',
                    backgroundSize: '10px 100%'
                  }}
                />
                
                <div className="sticky right-0 z-30 flex items-center h-full pr-12 pl-16 bg-gradient-to-l from-[var(--bg-page)] via-[var(--bg-page)]/95 to-transparent -mr-32 group/label pointer-events-none">
                  <div className="flex flex-col gap-1 min-w-[160px] pointer-events-auto">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xl font-black uppercase tracking-tighter text-[var(--text-accent)] block truncate handwritten text-3xl drop-shadow-sm">
                        {plotline.name}
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full shadow-md border border-white/50" style={{ backgroundColor: plotline.color }} />
                  </div>
                </div>

                <div className="flex items-center gap-12 px-8 w-full">
                  {Array.from({ length: columnCount }).map((_, colIdx) => {
                    const sceneInThisSlot = project.scenes.find(s => s.position === colIdx && s.plotlineId === plotline.id);
                    
                    return (
                      <div 
                        key={`${plotline.id}-${colIdx}`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, colIdx, plotline.id)}
                        className="w-44 h-44 flex-shrink-0 flex items-center justify-center relative group"
                      >
                        {sceneInThisSlot ? (
                          <div
                            draggable
                            onDragStart={() => handleDragStart(sceneInThisSlot.id)}
                            onDoubleClick={() => onSceneDoubleClick?.(sceneInThisSlot.id)}
                            className={`w-40 h-40 bg-[var(--bg-card)] shadow-xl border-t-8 p-4 rounded-sm cursor-grab active:cursor-grabbing transition-all hover:-translate-y-2 hover:shadow-2xl relative z-10 flex flex-col ${sceneInThisSlot.isCompleted ? 'opacity-90 grayscale-[0.3]' : ''}`}
                            style={{ borderTopColor: plotline.color }}
                          >
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-4 h-10 bg-[var(--color-secondary)] border border-[var(--color-border)] rounded-full shadow-md z-20 flex flex-col items-center py-1 gap-1">
                               <div className="w-1 h-1 bg-[var(--text-accent)]/20 rounded-full" />
                               <div className="w-2 h-4 bg-[var(--text-accent)]/5 rounded-full" />
                            </div>
                            
                            {sceneInThisSlot.isCompleted && (
                              <div className="absolute -top-2 -right-2 text-green-500 bg-[var(--bg-card)] rounded-full shadow-md p-0.5 z-30">
                                <CheckCircle2 size={18} />
                              </div>
                            )}

                            <input 
                              className="text-sm font-bold w-full text-center bg-transparent border-none focus:ring-0 p-0 text-[var(--text-accent)] handwritten"
                              value={sceneInThisSlot.title}
                              onChange={(e) => updateScene(sceneInThisSlot.id, { title: e.target.value })}
                            />
                            <div className="h-px bg-[var(--color-border)] my-3" />
                            <textarea 
                              className="text-[11px] text-[var(--text-main)]/60 leading-relaxed text-center w-full bg-transparent border-none focus:ring-0 p-0 resize-none h-16 overflow-hidden mb-2"
                              value={sceneInThisSlot.content}
                              placeholder="סצנה ריקה..."
                              onChange={(e) => updateScene(sceneInThisSlot.id, { content: e.target.value })}
                            />
                            <div className="mt-auto pt-1 border-t border-[var(--color-border)]/50 flex justify-center">
                              <span className="text-[9px] font-black uppercase tracking-tighter opacity-40 px-2 py-0.5 rounded-full" style={{ backgroundColor: `${plotline.color}20`, color: plotline.color }}>
                                {plotline.name}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => onAddScene(plotline.id, colIdx)}
                            className="w-10 h-10 rounded-full border-2 border-dashed border-[var(--color-border)] text-[var(--color-border)] opacity-0 group-hover:opacity-100 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all flex items-center justify-center bg-[var(--bg-card)]/50"
                          >
                            <Plus size={20} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {activePlotlines.length === 0 && (
              <div className="h-96 flex flex-col items-center justify-center text-[var(--text-main)]/20">
                <p className="text-xl font-bold">כל קווי העלילה מוסתרים</p>
                <p className="text-sm">השתמש בתפריט הצדדי כדי להציג אותם</p>
              </div>
            )}
          </div>
          
          <div className="mt-16 flex gap-12 px-8 ml-[176px]">
             {Array.from({ length: columnCount }).map((_, i) => {
               const chapterTitle = project.scenes.find(s => s.position === i)?.chapterTitle;
               return (
                 <div key={i} className="w-44 text-center group/chapter-label">
                   <input 
                     className="w-full bg-transparent border-none focus:ring-0 text-xs font-black text-[var(--text-main)]/20 uppercase tracking-widest italic text-center hover:text-[var(--text-main)]/40 focus:text-[var(--text-main)] transition-colors"
                     value={chapterTitle || `פרק ${i + 1}`}
                     onChange={(e) => onUpdateChapterTitle(i, e.target.value)}
                   />
                 </div>
               );
             })}
          </div>
        </div>
      </div>

      {/* Plot Summary Box - Sticky at bottom */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6 z-30">
        <div className="bg-[var(--bg-card)]/90 backdrop-blur-md border border-[var(--color-border)] rounded-3xl shadow-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-[var(--text-accent)] uppercase tracking-widest flex items-center gap-2">
              <MessageSquareQuote size={14} />
              תקציר העלילה
            </h3>
          </div>
          <textarea 
            value={project.summary || ''}
            onChange={(e) => onUpdateSummary(e.target.value)}
            placeholder="כתוב כאן את תקציר העלילה הכללי של הספר..."
            className="w-full h-24 bg-[var(--color-secondary)]/50 border border-[var(--color-border)] rounded-2xl p-4 text-sm text-[var(--text-main)] focus:ring-4 focus:ring-[var(--color-primary)]/20 outline-none resize-none handwritten text-lg leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
};

export default Board;
