
import React, { useRef } from 'react';
import { Scene, Project } from '../types';
import { Plus, CheckCircle2 } from 'lucide-react';

interface BoardProps {
  project: Project;
  onAddScene: (plotlineId: string, position: number) => void;
  onMoveScene: (id: string, targetGlobalIndex: number, targetPlotlineId: string) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
}

const Board: React.FC<BoardProps> = ({ project, onAddScene, onMoveScene, updateScene }) => {
  const dragItem = useRef<{ sceneId: string } | null>(null);

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

  // The number of columns is the number of scenes plus one for adding at the end
  const columnCount = project.scenes.length + 1;

  return (
    <div className="p-8 min-w-max h-full flex flex-col justify-center">
      <div className="relative">
        {/* Plotline Ropes */}
        {project.plotlines.map((plotline) => (
          <div key={plotline.id} className="relative h-48 flex items-center">
            {/* The actual rope */}
            <div 
              className="absolute inset-x-0 h-0.5 opacity-40 shadow-sm"
              style={{ 
                backgroundColor: plotline.color, 
                top: '50%',
                backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.1) 50%, transparent 50%)',
                backgroundSize: '10px 100%'
              }}
            />
            
            {/* Plotline Label */}
            <div className="absolute -right-32 w-28 text-left pr-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-900/40 block">
                {plotline.name}
              </span>
              <div className="h-1 w-full mt-1 rounded-full" style={{ backgroundColor: plotline.color }} />
            </div>

            {/* Grid for scenes */}
            <div className="flex items-center gap-8 px-4 w-full">
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
                        className={`w-40 h-40 bg-white shadow-xl border-t-8 p-3 rounded-sm cursor-grab active:cursor-grabbing transition-transform hover:-translate-y-1 relative z-10 ${sceneInThisSlot.isCompleted ? 'opacity-90' : ''}`}
                        style={{ borderTopColor: plotline.color }}
                      >
                        {/* Clothespin */}
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-3 h-8 bg-amber-100 border border-amber-200 rounded-full shadow-sm z-20" />
                        
                        {/* Completion Checkmark */}
                        {sceneInThisSlot.isCompleted && (
                          <div className="absolute top-1 right-1 text-green-500 bg-white rounded-full shadow-sm">
                            <CheckCircle2 size={16} />
                          </div>
                        )}

                        <input 
                          className="text-xs font-bold w-full text-center bg-transparent border-none focus:ring-0 p-0 text-amber-900"
                          value={sceneInThisSlot.title}
                          onChange={(e) => updateScene(sceneInThisSlot.id, { title: e.target.value })}
                        />
                        <div className="h-px bg-amber-50 my-2" />
                        <p className="text-[10px] text-amber-700/60 line-clamp-5 leading-tight text-center">
                          {sceneInThisSlot.content || 'סצנה ריקה...'}
                        </p>
                      </div>
                    ) : (
                      <button 
                        onClick={() => onAddScene(plotline.id, colIdx)}
                        className="w-8 h-8 rounded-full border-2 border-dashed border-amber-200 text-amber-200 opacity-0 group-hover:opacity-100 hover:border-amber-400 hover:text-amber-400 transition-all flex items-center justify-center"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* Visual Marker for "Chronological Order" */}
      <div className="mt-8 flex gap-8 px-4 ml-[120px]">
         {Array.from({ length: columnCount }).map((_, i) => (
           <div key={i} className="w-44 text-center text-[10px] font-bold text-amber-900/20 italic">
             {i + 1}
           </div>
         ))}
      </div>
    </div>
  );
};

export default Board;
