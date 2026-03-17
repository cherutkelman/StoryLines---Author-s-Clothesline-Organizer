
import React, { useRef, useState, useEffect } from 'react';
import { Scene, Project, ChapterMarker } from '../types';
import { Plus, CheckCircle2, CopyPlus, ZoomIn, ZoomOut, Maximize, MessageSquareQuote, Download, Trash2, Flag, X, LayoutGrid, Rows, Pin, ChevronUp, ChevronDown } from 'lucide-react';

interface BoardProps {
  project: Project;
  title: string;
  visiblePlotlines: string[];
  onAddScene: (plotlineId: string, position: number) => void;
  onMoveScene: (id: string, targetGlobalIndex: number, targetPlotlineId: string) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  onBulkAdd: (plotlineId: string) => void;
  onDeleteScene: (id: string) => void;
  initialZoom?: number;
  onZoomChange?: (zoom: number) => void;
  onSceneDoubleClick?: (sceneId: string) => void;
  onUpdateSummary: (summary: string) => void;
  onUpdateChapterTitle: (position: number, title: string) => void;
  onAddChapterMarker: (position: number) => void;
  onUpdateChapterMarker: (id: string, updates: Partial<ChapterMarker>) => void;
  onDeleteChapterMarker: (id: string) => void;
}

const Board: React.FC<BoardProps> = ({ 
  project, 
  title, 
  visiblePlotlines, 
  onAddScene, 
  onMoveScene, 
  updateScene, 
  onBulkAdd, 
  onDeleteScene, 
  initialZoom, 
  onZoomChange, 
  onSceneDoubleClick, 
  onUpdateSummary, 
  onUpdateChapterTitle,
  onAddChapterMarker,
  onUpdateChapterMarker,
  onDeleteChapterMarker
}) => {
  const dragItem = useRef<{ sceneId: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(initialZoom || 1);
  const [viewMode, setViewMode] = useState<'plotlines' | 'chapters'>('plotlines');
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
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

  useEffect(() => {
    const boardContainer = boardRef.current?.parentElement;
    if (!boardContainer) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        const newZoom = Math.min(Math.max(0.2, zoomLevel + delta), 1.5);
        handleZoomChange(newZoom);
      }
    };

    boardContainer.addEventListener('wheel', handleWheel, { passive: false });
    return () => boardContainer.removeEventListener('wheel', handleWheel);
  }, [zoomLevel]);

  const exportBoard = () => {
    let text = `ייצוא לוח עלילה - ${title}\n`;
    text += `תאריך: ${new Date().toLocaleDateString('he-IL')}\n`;
    text += `-----------------------------------\n\n`;

    // Filter scenes to only include those from visible plotlines and sort by position (right to left)
    const exportedScenes = project.scenes
      .filter(s => visiblePlotlines.includes(s.plotlineId))
      .sort((a, b) => {
        if (a.position !== b.position) {
          return a.position - b.position;
        }
        // If same position, sort by plotline order
        const plotlineAIndex = project.plotlines.findIndex(p => p.id === a.plotlineId);
        const plotlineBIndex = project.plotlines.findIndex(p => p.id === b.plotlineId);
        return plotlineAIndex - plotlineBIndex;
      });

    if (exportedScenes.length === 0) {
      text += "אין סצנות להצגה בקווי העלילה הנבחרים.\n";
    } else {
      exportedScenes.forEach((scene, index) => {
        const chapterMarker = project.chapterMarkers?.find(m => m.position === scene.position);
        if (chapterMarker) {
          text += `\n=== ${chapterMarker.title} ===\n\n`;
        }
        const plotline = project.plotlines.find(p => p.id === scene.plotlineId);
        text += `סצנה ${index + 1} | קו עלילה: ${plotline?.name || 'ללא'} | מיקום: ${scene.position + 1}\n`;
        text += `כותרת: ${scene.title || 'ללא כותרת'}\n`;
        text += `תוכן:\n${scene.content || 'סצנה ריקה...'}\n`;
        text += `-----------------------------------\n\n`;
      });
    }

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

  const sortedMarkers = [...(project.chapterMarkers || [])].sort((a, b) => a.position - b.position);
  const chapters: { id: string; title: string; scenes: Scene[]; isEditable?: boolean }[] = [];
  const visibleScenes = project.scenes.filter(s => visiblePlotlines.includes(s.plotlineId));

  if (sortedMarkers.length === 0) {
    chapters.push({ id: 'default', title: 'כל הסצנות', scenes: visibleScenes });
  } else {
    if (sortedMarkers[0].position > 0) {
      chapters.push({
        id: 'prologue',
        title: 'פתיחה',
        scenes: visibleScenes.filter(s => s.position < sortedMarkers[0].position)
      });
    }

    sortedMarkers.forEach((marker, idx) => {
      const nextMarker = sortedMarkers[idx + 1];
      const chapterScenes = visibleScenes.filter(s => 
        s.position >= marker.position && 
        (!nextMarker || s.position < nextMarker.position)
      ).sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        const pA = project.plotlines.findIndex(p => p.id === a.plotlineId);
        const pB = project.plotlines.findIndex(p => p.id === b.plotlineId);
        return pA - pB;
      });
      chapters.push({
        id: marker.id,
        title: marker.title,
        scenes: chapterScenes,
        isEditable: true
      });
    });
  }

  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col">
      {/* Zoom Controls Overlay */}
      <div className="absolute top-6 left-6 z-40 flex items-center gap-3 bg-[var(--theme-card)]/80 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-[var(--theme-border)]">
        <button 
          onClick={() => handleZoomChange(Math.max(0.2, zoomLevel - 0.1))}
          className="p-2 text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-xl transition-colors"
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
          className="w-32 accent-[var(--theme-primary)]"
        />

        <button 
          onClick={() => handleZoomChange(Math.min(1.5, zoomLevel + 0.1))}
          className="p-2 text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-xl transition-colors"
          title="הגדלה"
        >
          <ZoomIn size={20} />
        </button>

        <div className="w-px h-6 bg-[var(--theme-border)] mx-1" />

        <button 
          onClick={() => handleZoomChange(1)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-lg transition-colors"
        >
          <Maximize size={16} />
          <span>{Math.round(zoomLevel * 100)}%</span>
        </button>

        <div className="w-px h-6 bg-[var(--theme-border)] mx-1" />

        <div className="flex bg-[var(--theme-secondary)]/50 p-1 rounded-xl border border-[var(--theme-border)]/50">
          <button 
            onClick={() => setViewMode('plotlines')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'plotlines' ? 'bg-[var(--theme-card)] text-[var(--theme-primary)] shadow-sm' : 'text-[var(--theme-primary)]/40 hover:text-[var(--theme-primary)]'}`}
            title="תצוגת קווי עלילה"
          >
            <LayoutGrid size={16} />
            <span>קווים</span>
          </button>
          <button 
            onClick={() => setViewMode('chapters')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'chapters' ? 'bg-[var(--theme-card)] text-[var(--theme-primary)] shadow-sm' : 'text-[var(--theme-primary)]/40 hover:text-[var(--theme-primary)]'}`}
            title="תצוגת פרקים"
          >
            <Rows size={16} />
            <span>פרקים</span>
          </button>
        </div>
      </div>

      {/* Top Right Actions */}
      <div className="absolute top-6 right-6 z-40 flex items-center gap-3">
        <button 
          onClick={() => onBulkAdd(project.plotlines[0]?.id || '')}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-card)] border border-[var(--theme-primary)] rounded-xl shadow-lg hover:opacity-90 transition-all font-bold text-sm"
          title="הוספה מהירה של סצנות"
        >
          <CopyPlus size={18} />
          <span>הוספה מהירה</span>
        </button>
        <button 
          onClick={exportBoard}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-card)]/80 backdrop-blur-md text-[var(--theme-primary)] border border-[var(--theme-border)] rounded-xl shadow-lg hover:bg-[var(--theme-secondary)] transition-all font-bold text-sm"
          title="ייצוא לוח עלילה"
        >
          <Download size={18} />
          <span>ייצוא לוח</span>
        </button>
      </div>

      {/* Board Scrollable Area */}
      <div className="flex-1 overflow-auto bg-[var(--theme-bg)] cursor-grab active:cursor-grabbing scrollbar-hide">
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
            {viewMode === 'plotlines' ? (
              <>
                {/* Chapter Markers Layer */}
                <div className="absolute inset-0 pointer-events-none z-20">
                  {project.chapterMarkers?.map(marker => (
                    <div 
                      key={marker.id}
                      className="absolute top-0 bottom-0 border-r-2 border-dashed border-[var(--theme-primary)]/30 pointer-events-auto"
                      style={{ 
                        right: `${marker.position * (176 + 48) + 32 + 88}px`, // 176 is w-44, 48 is gap-12, 32 is px-8, 88 is half of w-44
                        width: '2px'
                      }}
                    >
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[var(--theme-card)] border-2 border-[var(--theme-primary)]/20 rounded-2xl shadow-2xl p-3 flex items-center gap-3 min-w-[200px] backdrop-blur-md">
                        <div className="bg-[var(--theme-primary)]/10 p-2 rounded-xl">
                          <Flag size={18} className="text-[var(--theme-primary)]" />
                        </div>
                        <input 
                          className="flex-1 bg-transparent border-none focus:ring-0 text-base font-black text-[var(--theme-primary)] p-0 handwritten"
                          value={marker.title}
                          onChange={(e) => onUpdateChapterMarker(marker.id, { title: e.target.value })}
                        />
                        <button 
                          onClick={() => onDeleteChapterMarker(marker.id)}
                          className="p-1.5 text-[var(--theme-primary)]/20 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <X size={16} />
                        </button>
                        
                        {/* Decorative Pin */}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[var(--theme-card)] border-b-2 border-r-2 border-[var(--theme-primary)]/20 rotate-45" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Marker Row */}
                <div className="flex gap-12 px-8 mb-20">
                  {Array.from({ length: columnCount }).map((_, i) => {
                    const hasMarker = project.chapterMarkers?.some(m => m.position === i);
                    return (
                      <div key={i} className="w-44 flex justify-center group/marker-btn">
                        {!hasMarker && (
                          <button 
                            onClick={() => onAddChapterMarker(i)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--theme-secondary)]/50 text-[var(--theme-primary)]/20 hover:text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] transition-all opacity-0 group-hover/marker-btn:opacity-100 border border-dashed border-[var(--theme-border)]"
                          >
                            <Flag size={14} />
                            <span className="text-[10px] font-bold">הוסף פרק</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

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
                    
                    <div className="sticky right-0 z-30 flex items-center h-full pr-12 pl-16 bg-gradient-to-l from-[var(--theme-bg)] via-[var(--theme-bg)]/95 to-transparent -mr-32 group/label pointer-events-none">
                      <div className="flex flex-col gap-1 min-w-[160px] pointer-events-auto">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xl font-black uppercase tracking-tighter text-[var(--theme-primary)] block truncate handwritten text-3xl drop-shadow-sm">
                            {plotline.name}
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full shadow-md border border-white/50" style={{ backgroundColor: plotline.color }} />
                      </div>
                    </div>

                    <div className="flex items-center gap-12 px-8 w-full">
                      {Array.from({ length: columnCount }).map((_, colIdx) => {
                        const sceneInThisSlot = project.scenes.find(s => s.position === colIdx && s.plotlineId === plotline.id);
                        const isLinkedToPlotStructure = sceneInThisSlot && Object.values(project.plotStructurePoints || {}).some(point => point.sceneId === sceneInThisSlot.id);
                        
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
                                className={`w-40 h-40 bg-[var(--theme-card)] shadow-xl border-t-8 p-4 rounded-sm cursor-grab active:cursor-grabbing transition-all hover:-translate-y-2 hover:shadow-2xl relative z-10 flex flex-col ${sceneInThisSlot.isCompleted ? 'opacity-90 grayscale-[0.3]' : ''}`}
                                style={{ borderTopColor: plotline.color }}
                              >
                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-4 h-10 bg-[var(--theme-secondary)] border border-[var(--theme-border)]/50 rounded-full shadow-md z-20 flex flex-col items-center py-1 gap-1">
                                   <div className="w-1 h-1 bg-[var(--theme-primary)]/20 rounded-full" />
                                   <div className="w-2 h-4 bg-[var(--theme-primary)]/5 rounded-full" />
                                </div>
                                
                                {sceneInThisSlot.isCompleted && (
                                  <div className="absolute -top-2 -right-2 text-green-500 bg-[var(--theme-card)] rounded-full shadow-md p-0.5 z-30">
                                    <CheckCircle2 size={18} />
                                  </div>
                                )}

                                {isLinkedToPlotStructure && (
                                  <div className="absolute -top-2 right-6 text-[var(--theme-accent)] bg-[var(--theme-card)] rounded-full shadow-md p-1 z-30" title="מקושר למבנה העלילה">
                                    <Pin size={14} className="rotate-45" />
                                  </div>
                                )}

                                <button 
                                  onClick={(e) => { e.stopPropagation(); onDeleteScene(sceneInThisSlot.id); }}
                                  className="absolute -top-2 -left-2 text-red-400 hover:text-red-600 bg-[var(--theme-card)] rounded-full shadow-md p-1 z-30 opacity-40 group-hover:opacity-100 transition-all"
                                  title="מחק סצנה"
                                >
                                  <Trash2 size={14} />
                                </button>

                                <input 
                                  className="text-sm font-bold w-full text-center bg-transparent border-none focus:ring-0 p-0 text-[var(--theme-primary)] handwritten"
                                  value={sceneInThisSlot.title}
                                  onChange={(e) => updateScene(sceneInThisSlot.id, { title: e.target.value })}
                                />
                                <div className="h-px bg-[var(--theme-secondary)] my-3" />
                                <textarea 
                                  className="text-[11px] text-[var(--theme-primary)]/60 leading-relaxed text-center w-full bg-transparent border-none focus:ring-0 p-0 resize-none h-16 overflow-hidden mb-2"
                                  value={sceneInThisSlot.content}
                                  placeholder="סצנה ריקה..."
                                  onChange={(e) => updateScene(sceneInThisSlot.id, { content: e.target.value })}
                                />
                                <div className="mt-auto pt-1 border-t border-amber-50/50 flex justify-center">
                                  <span className="text-[9px] font-black uppercase tracking-tighter opacity-40 px-2 py-0.5 rounded-full" style={{ backgroundColor: `${plotline.color}20`, color: plotline.color }}>
                                    {plotline.name}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <button 
                                onClick={() => onAddScene(plotline.id, colIdx)}
                                className="w-10 h-10 rounded-full border-2 border-dashed border-[var(--theme-border)] text-[var(--theme-border)] opacity-0 group-hover:opacity-100 hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)] transition-all flex items-center justify-center bg-[var(--theme-card)]/50"
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
              </>
            ) : (
              <div className="space-y-24">
                {chapters.map((chapter) => (
                  <div key={chapter.id} className="relative">
                    <div className="flex items-center gap-6 mb-12 sticky right-0 z-30 bg-gradient-to-l from-[var(--theme-bg)] via-[var(--theme-bg)]/90 to-transparent pr-8 py-2">
                      <div className="bg-[var(--theme-primary)]/10 p-3 rounded-2xl">
                        <Flag size={24} className="text-[var(--theme-primary)]" />
                      </div>
                      {chapter.isEditable ? (
                        <input 
                          className="text-4xl font-black text-[var(--theme-primary)] handwritten tracking-widest uppercase bg-transparent border-none focus:ring-0 p-0 w-auto min-w-[300px]"
                          value={chapter.title}
                          onChange={(e) => onUpdateChapterMarker(chapter.id, { title: e.target.value })}
                        />
                      ) : (
                        <h2 className="text-4xl font-black text-[var(--theme-primary)] handwritten tracking-widest uppercase">
                          {chapter.title}
                        </h2>
                      )}
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--theme-border)] to-transparent" />
                      <span className="text-xs font-black text-[var(--theme-primary)]/30 uppercase tracking-widest bg-[var(--theme-secondary)]/50 px-4 py-1.5 rounded-full border border-[var(--theme-border)]/50">
                        {chapter.scenes.length} סצנות
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-12 px-8">
                      {chapter.scenes.map((scene) => {
                        const plotline = project.plotlines.find(p => p.id === scene.plotlineId);
                        const isLinkedToPlotStructure = Object.values(project.plotStructurePoints || {}).some(point => point.sceneId === scene.id);
                        return (
                          <div
                            key={scene.id}
                            onDoubleClick={() => onSceneDoubleClick?.(scene.id)}
                            className={`w-44 h-44 bg-[var(--theme-card)] shadow-xl border-t-8 p-4 rounded-sm transition-all hover:-translate-y-2 hover:shadow-2xl relative flex flex-col ${scene.isCompleted ? 'opacity-90 grayscale-[0.3]' : ''}`}
                            style={{ borderTopColor: plotline?.color }}
                          >
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-4 h-10 bg-[var(--theme-secondary)] border border-[var(--theme-border)]/50 rounded-full shadow-md z-20 flex flex-col items-center py-1 gap-1">
                               <div className="w-1 h-1 bg-[var(--theme-primary)]/20 rounded-full" />
                               <div className="w-2 h-4 bg-[var(--theme-primary)]/5 rounded-full" />
                            </div>

                            {scene.isCompleted && (
                              <div className="absolute -top-2 -right-2 text-green-500 bg-[var(--theme-card)] rounded-full shadow-md p-0.5 z-30">
                                <CheckCircle2 size={18} />
                              </div>
                            )}

                            {isLinkedToPlotStructure && (
                              <div className="absolute -top-2 right-6 text-[var(--theme-accent)] bg-[var(--theme-card)] rounded-full shadow-md p-1 z-30" title="מקושר למבנה העלילה">
                                <Pin size={14} className="rotate-45" />
                              </div>
                            )}

                            <input 
                              className="text-sm font-bold w-full text-center bg-transparent border-none focus:ring-0 p-0 text-[var(--theme-primary)] handwritten"
                              value={scene.title}
                              onChange={(e) => updateScene(scene.id, { title: e.target.value })}
                            />
                            <div className="h-px bg-[var(--theme-secondary)] my-3" />
                            <textarea 
                              className="text-[11px] text-[var(--theme-primary)]/60 leading-relaxed text-center w-full bg-transparent border-none focus:ring-0 p-0 resize-none h-16 overflow-hidden mb-2"
                              value={scene.content}
                              placeholder="סצנה ריקה..."
                              onChange={(e) => updateScene(scene.id, { content: e.target.value })}
                            />
                            <div className="mt-auto pt-1 border-t border-amber-50/50 flex justify-center">
                              <span className="text-[9px] font-black uppercase tracking-tighter opacity-40 px-2 py-0.5 rounded-full" style={{ backgroundColor: `${plotline?.color}20`, color: plotline?.color }}>
                                {plotline?.name}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {chapter.scenes.length === 0 && (
                        <div className="w-full h-32 flex items-center justify-center border-2 border-dashed border-[var(--theme-border)] rounded-3xl text-[var(--theme-primary)]/20 font-bold">
                          אין סצנות בפרק זה
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activePlotlines.length === 0 && (
              <div className="h-96 flex flex-col items-center justify-center text-[var(--theme-primary)]/20">
                <p className="text-xl font-bold">כל קווי העלילה מוסתרים</p>
                <p className="text-sm">השתמש בתפריט הצדדי כדי להציג אותם</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plot Summary Box - Sticky at bottom */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6 z-30">
        <div className={`bg-[var(--theme-card)]/90 backdrop-blur-md border border-[var(--theme-border)] rounded-3xl shadow-2xl p-4 flex flex-col gap-2 transition-all duration-300 ${isSummaryCollapsed ? 'h-14 overflow-hidden' : ''}`}>
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-[var(--theme-primary)] uppercase tracking-widest flex items-center gap-2">
              <MessageSquareQuote size={14} />
              תקציר העלילה
            </h3>
            <button 
              onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
              className="p-1 hover:bg-[var(--theme-secondary)] rounded-lg transition-colors text-[var(--theme-primary)]/40 hover:text-[var(--theme-primary)]"
              title={isSummaryCollapsed ? "הגדל תקציר" : "מזער תקציר"}
            >
              {isSummaryCollapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
          {!isSummaryCollapsed && (
            <textarea 
              value={project.summary || ''}
              onChange={(e) => onUpdateSummary(e.target.value)}
              placeholder="כתוב כאן את תקציר העלילה הכללי של הספר..."
              className="w-full h-24 bg-[var(--theme-secondary)]/50 border border-[var(--theme-border)]/50 rounded-2xl p-4 text-sm text-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/20 outline-none resize-none text-lg leading-relaxed animate-in fade-in slide-in-from-bottom-2"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Board;
