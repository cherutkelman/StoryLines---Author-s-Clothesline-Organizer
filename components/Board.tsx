
import React, { useRef, useState } from 'react';
import { Scene, Project } from '../types';
import { Plus, CheckCircle2, CopyPlus, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface BoardProps {
  project: Project;
  onAddScene: (plotlineId: string, position: number) => void;
  onMoveScene: (id: string, targetGlobalIndex: number, targetPlotlineId: string) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  onBulkAdd: (plotlineId: string) => void;
}

const Board: React.FC<BoardProps> = ({ project, onAddScene, onMoveScene, updateScene, onBulkAdd }) => {
  const dragItem = useRef<{ sceneId: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const boardRef = useRef<HTMLDivElement>(null);

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

  // The number of columns is the number of scenes plus one for adding at the end
  const columnCount = Math.max(project.scenes.length + 1, 10); 

  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col">
      {/* Zoom Controls Overlay */}
      <div className="absolute top-6 left-6 z-40 flex items-center gap-3 bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-amber-200">
        <button 
          onClick={() => setZoomLevel(prev => Math.max(0.2, prev - 0.1))}
          className="p-2 text-amber-800 hover:bg-amber-100 rounded-xl transition-colors"
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
          onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
          className="w-32 accent-amber-800"
        />

        <button 
          onClick={() => setZoomLevel(prev => Math.min(1.5, prev + 0.1))}
          className="p-2 text-amber-800 hover:bg-amber-100 rounded-xl transition-colors"
          title="הגדלה"
        >
          <ZoomIn size={20} />
        </button>

        <div className="w-px h-6 bg-amber-200 mx-1" />

        <button 
          onClick={handleResetZoom}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 rounded-lg transition-colors"
        >
          <Maximize size={16} />
          <span>{Math.round(zoomLevel * 100)}%</span>
        </button>
      </div>

      {/* Floating Action Button for Bulk Add */}
      <div className="absolute bottom-10 right-10 z-40">
        <button 
          onClick={() => onBulkAdd(project.plotlines[0]?.id || '')}
          className="flex items-center gap-3 px-8 py-4 bg-amber-800 text-white rounded-2xl shadow-2xl hover:bg-amber-900 hover:scale-105 transition-all group"
        >
          <div className="bg-white/20 p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
            <CopyPlus size={20} />
          </div>
          <span className="font-bold">הוספה מהירה</span>
        </button>
      </div>

      {/* Board Scrollable Area */}
      <div className="flex-1 overflow-auto bg-[#fdf6e3] cursor-grab active:cursor-grabbing">
        <div 
          ref={boardRef}
          className="p-32 transition-transform duration-200 origin-top-right"
          style={{ 
            transform: `scale(${zoomLevel})`,
            width: `${100 / zoomLevel}%`,
            minWidth: 'max-content'
          }}
        >
          <div className="relative">
            {/* Plotline Ropes */}
            {project.plotlines.map((plotline) => (
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
                
                <div className="absolute -right-44 w-40 text-left pr-4 group/label">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-widest text-amber-900/60 block truncate">
                      {plotline.name}
                    </span>
                    <button 
                      onClick={() => onBulkAdd(plotline.id)}
                      className="opacity-0 group-hover/label:opacity-100 p-1 text-amber-400 hover:text-indigo-600 transition-all bg-white rounded-full shadow-sm"
                      title="הוספה מרובה"
                    >
                      <CopyPlus size={16} />
                    </button>
                  </div>
                  <div className="h-1.5 w-full mt-1 rounded-full shadow-inner" style={{ backgroundColor: plotline.color }} />
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
                            className={`w-40 h-40 bg-white shadow-xl border-t-8 p-4 rounded-sm cursor-grab active:cursor-grabbing transition-all hover:-translate-y-2 hover:shadow-2xl relative z-10 ${sceneInThisSlot.isCompleted ? 'opacity-90 grayscale-[0.3]' : ''}`}
                            style={{ borderTopColor: plotline.color }}
                          >
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-4 h-10 bg-[#e5dcc3] border border-amber-200/50 rounded-full shadow-md z-20 flex flex-col items-center py-1 gap-1">
                               <div className="w-1 h-1 bg-amber-900/20 rounded-full" />
                               <div className="w-2 h-4 bg-amber-900/5 rounded-full" />
                            </div>
                            
                            {sceneInThisSlot.isCompleted && (
                              <div className="absolute -top-2 -right-2 text-green-500 bg-white rounded-full shadow-md p-0.5 z-30">
                                <CheckCircle2 size={18} />
                              </div>
                            )}

                            <input 
                              className="text-sm font-bold w-full text-center bg-transparent border-none focus:ring-0 p-0 text-amber-900 handwritten"
                              value={sceneInThisSlot.title}
                              onChange={(e) => updateScene(sceneInThisSlot.id, { title: e.target.value })}
                            />
                            <div className="h-px bg-amber-50 my-3" />
                            <textarea 
                              className="text-[11px] text-amber-700/60 leading-relaxed text-center w-full bg-transparent border-none focus:ring-0 p-0 resize-none h-20 overflow-hidden"
                              value={sceneInThisSlot.content}
                              placeholder="סצנה ריקה..."
                              onChange={(e) => updateScene(sceneInThisSlot.id, { content: e.target.value })}
                            />
                          </div>
                        ) : (
                          <button 
                            onClick={() => onAddScene(plotline.id, colIdx)}
                            className="w-10 h-10 rounded-full border-2 border-dashed border-amber-200 text-amber-200 opacity-0 group-hover:opacity-100 hover:border-amber-400 hover:text-amber-400 transition-all flex items-center justify-center bg-white/50"
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
          </div>
          
          <div className="mt-16 flex gap-12 px-8 ml-[176px]">
             {Array.from({ length: columnCount }).map((_, i) => (
               <div key={i} className="w-44 text-center text-xs font-black text-amber-900/10 uppercase tracking-widest italic">
                 פרק {i + 1}
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Board;
