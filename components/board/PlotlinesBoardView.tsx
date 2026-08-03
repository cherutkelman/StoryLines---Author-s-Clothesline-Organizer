import React from 'react';
import { CheckCircle2, Flag, Pin, Plus, Trash2, X } from 'lucide-react';
import { ChapterMarker, Plotline, Project, Scene } from '../../types';
import { BoardSequenceColumn } from '../../src/book-sequence';
import SceneArcMarkers from './SceneArcMarkers';

const INSERTION_SLOT_WIDTH = 40;

interface PlotlinesBoardViewProps {
  boardColumns: BoardSequenceColumn[];
  activePlotlines: Plotline[];
  boardProject: Project;
  columnCount: number;
  isPreviewMode: boolean;
  currentSceneIds: Set<string>;
  missingPreviewSceneIds: Set<string>;
  restoredDeletedSceneIds: Set<string>;
  restoringDeletedSceneId: string | null;
  onAddScene: (plotlineId: string, position: number) => void;
  onAddSceneInSequence?: (plotlineId: string, targetSequenceIndex: number) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  onDeleteScene: (id: string) => void;
  onSceneDoubleClick?: (sceneId: string) => void;
  onAddChapterMarker: (position: number) => void;
  onUpdateChapterMarker: (id: string, updates: Partial<ChapterMarker>) => void;
  onDeleteChapterMarker: (id: string) => void;
  onAddChapterDivider?: (sequenceIndex: number) => void;
  onRenameChapter?: (chapterId: string, title: string) => void;
  onDeleteChapter?: (chapterId: string) => void;
  canRestoreDeletedScene: boolean;
  onRestoreDeletedScene: (sceneId: string) => void;
  onDragStart: (sceneId: string) => void;
  onChapterDragStart: (chapterId: string) => void;
  onDragOver: (event: React.DragEvent) => void;
  onChapterDividerDrop: (event: React.DragEvent, targetSequenceIndex: number) => void;
  onSceneSequenceDrop: (event: React.DragEvent, targetSequenceIndex: number, targetPlotlineId: string) => void;
  onSceneRowDrop: (event: React.DragEvent, targetPlotlineId: string) => void;
}

const PlotlinesBoardView: React.FC<PlotlinesBoardViewProps> = ({
  boardColumns, activePlotlines, boardProject, columnCount, isPreviewMode,
  currentSceneIds, missingPreviewSceneIds, restoredDeletedSceneIds, restoringDeletedSceneId,
  onAddScene, onAddSceneInSequence, updateScene, onDeleteScene, onSceneDoubleClick,
  onAddChapterMarker, onUpdateChapterMarker, onDeleteChapterMarker, onAddChapterDivider,
  onRenameChapter, onDeleteChapter, canRestoreDeletedScene, onRestoreDeletedScene,
  onDragStart: handleDragStart, onChapterDragStart: handleChapterDragStart, onDragOver: handleDragOver,
  onChapterDividerDrop: handleChapterDividerDrop, onSceneSequenceDrop: handleSceneSequenceDrop,
  onSceneRowDrop: handleSceneRowDrop,
}) => (
<>
  <div className="relative flex items-end px-8 mb-1 lg:mb-3 min-h-20">
    <div className="invisible pointer-events-none flex h-20 shrink-0 items-center pr-12 pl-16 -mr-32">
      <div className="min-w-[160px]" />
    </div>
    {boardColumns.map((column, index) => (
      <React.Fragment key={`chapter-title-fragment-${column.id}`}>
        <div
          className="group/add-chapter relative flex h-24 flex-shrink-0 items-end justify-center"
          style={{ width: `${INSERTION_SLOT_WIDTH}px` }}
          onDragOver={handleDragOver}
          onDrop={(e) => handleChapterDividerDrop(e, index)}
        >
          {!isPreviewMode && onAddChapterDivider && (
            <button
              onClick={() => onAddChapterDivider(index)}
              className="mb-4 rounded-full border border-dashed border-[var(--theme-primary)]/20 bg-[var(--theme-card)]/70 px-2 py-1 text-[10px] font-black text-[var(--theme-primary)]/30 opacity-0 shadow-sm transition-all group-hover/add-chapter:opacity-100 hover:border-[var(--theme-primary)]/50 hover:text-[var(--theme-primary)]"
            >
              + {'\u05e4\u05e8\u05e7'}
            </button>
          )}
        </div>
        <div
          className="relative flex h-20 flex-shrink-0 items-end justify-center"
          style={{ width: `${column.width}px` }}
        >
          {column.type === 'chapter-divider' && (
            <div
              draggable={!isPreviewMode}
              onDragStart={() => handleChapterDragStart(column.chapterMarker.id)}
              className={`absolute bottom-0 left-1/2 z-20 flex w-[112px] -translate-x-1/2 items-center gap-1.5 rounded-full border border-[var(--theme-primary)]/20 bg-[var(--theme-card)] px-2.5 py-2 text-[var(--theme-primary)] shadow-xl ${isPreviewMode ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
            >
              <div className="flex h-6 w-3 flex-shrink-0 items-center justify-center rounded-full text-[var(--theme-primary)]/35">
                <div className="h-4 w-1 rounded-full bg-current" />
              </div>
              <input
                className="min-w-0 flex-1 bg-transparent p-0 text-center text-xs font-black text-[var(--theme-primary)] handwritten border-none focus:ring-0"
                value={column.chapterMarker.title}
                readOnly={isPreviewMode}
                onChange={(e) => {
                  if (isPreviewMode) return;
                  onRenameChapter?.(column.chapterMarker.id, e.target.value);
                }}
              />
              <button
                disabled={isPreviewMode}
                onClick={() => {
                  if (isPreviewMode) return;
                  if (window.confirm('\u05dc\u05de\u05d7\u05d5\u05e7 \u05d0\u05ea \u05d4\u05e4\u05e8\u05e7? \u05d4\u05e1\u05e6\u05e0\u05d5\u05ea \u05dc\u05d0 \u05d9\u05d9\u05de\u05d7\u05e7\u05d5.')) {
                    onDeleteChapter?.(column.chapterMarker.id);
                  }
                }}
                className="rounded-full p-1 text-[var(--theme-primary)]/35 transition-all hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                title={'\u05de\u05d7\u05e7 \u05e4\u05e8\u05e7'}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </React.Fragment>
    ))}
    <div
      className="group/add-chapter relative flex h-24 flex-shrink-0 items-end justify-center"
      style={{ width: `${INSERTION_SLOT_WIDTH}px` }}
      onDragOver={handleDragOver}
      onDrop={(e) => handleChapterDividerDrop(e, boardColumns.length)}
    >
      {!isPreviewMode && onAddChapterDivider && (
        <button
          onClick={() => onAddChapterDivider(boardColumns.length)}
          className="mb-4 rounded-full border border-dashed border-[var(--theme-primary)]/20 bg-[var(--theme-card)]/70 px-2 py-1 text-[10px] font-black text-[var(--theme-primary)]/30 opacity-0 shadow-sm transition-all group-hover/add-chapter:opacity-100 hover:border-[var(--theme-primary)]/50 hover:text-[var(--theme-primary)]"
        >
          + {'\u05e4\u05e8\u05e7'}
        </button>
      )}
    </div>
  </div>
  {/* Chapter Markers Layer */}
  <div className="hidden">
    {boardProject.chapterMarkers?.map(marker => (
      <div 
        key={marker.id}
        className="absolute top-0 bottom-0 border-r-2 border-dashed border-[var(--theme-primary)]/30 pointer-events-auto"
        style={{ 
          right: `${marker.position * (176 + 48) + 32 + 88}px`, // 176 is w-44, 48 is gap-12, 32 is px-8, 88 is half of w-44
          width: '2px'
        }}
      >
        <div className="absolute top-0 lg:-top-12 left-1/2 -translate-x-1/2 bg-[var(--theme-card)] border-2 border-[var(--theme-primary)]/20 rounded-2xl shadow-2xl p-2 lg:p-3 flex items-center gap-2 lg:gap-3 w-[132px] lg:w-auto lg:min-w-[200px] backdrop-blur-md">
          <div className="bg-[var(--theme-primary)]/10 p-1.5 lg:p-2 rounded-xl">
            <Flag size={16} className="text-[var(--theme-primary)]" />
          </div>
          <input 
            className="min-w-0 flex-1 bg-transparent border-none focus:ring-0 text-xs lg:text-base font-black text-[var(--theme-primary)] p-0 handwritten"
            value={marker.title}
            readOnly={isPreviewMode}
            onChange={(e) => {
              if (isPreviewMode) return;
              onUpdateChapterMarker(marker.id, { title: e.target.value });
            }}
          />
          <button 
            disabled={isPreviewMode}
            onClick={() => {
              if (isPreviewMode) return;
              onDeleteChapterMarker(marker.id);
            }}
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
  <div className="hidden">
    <div className="absolute left-8 right-8 top-1/2 h-px -translate-y-1/2 bg-gray-300/80" />
    {Array.from({ length: columnCount }).map((_, i) => {
      const hasMarker = boardProject.chapterMarkers?.some(m => m.position === i);
      return (
        <div key={i} className="relative w-44 flex-shrink-0 flex justify-center group/marker-btn">
          {!hasMarker && !isPreviewMode && (
            <button 
              onClick={() => onAddChapterMarker(i)}
              className="relative z-10 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-transparent text-[var(--theme-primary)]/20 hover:text-[var(--theme-primary)] transition-all"
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
    <div key={plotline.id} className="relative h-48 flex items-center mb-12 group/plotline">
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

      <div className="flex items-center px-8 w-full">
        {boardColumns.map((column, index) => {
          const sceneInThisSlot = column.type === 'scene' && column.scene.plotlineId === plotline.id
            ? column.scene
            : null;
          const isLinkedToPlotStructure = sceneInThisSlot && Object.values(boardProject.plotStructurePoints || {}).some(point => point.sceneId === sceneInThisSlot.id);
          
          return (
            <React.Fragment key={`${plotline.id}-${column.id}-fragment`}>
            <div
              className="group/add-scene relative flex h-44 flex-shrink-0 items-center justify-center"
              style={{ width: `${INSERTION_SLOT_WIDTH}px` }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleSceneSequenceDrop(e, index, plotline.id)}
            >
              {!isPreviewMode && onAddSceneInSequence && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isPreviewMode) return;
                    onAddSceneInSequence(plotline.id, index);
                  }}
                  className="absolute z-20 flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-[var(--theme-border)] bg-[var(--theme-card)]/50 text-[var(--theme-border)] opacity-0 shadow-md transition-all hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)] group-hover/add-scene:opacity-100 group-hover/plotline:opacity-100"
                >
                  <Plus size={20} />
                </button>
              )}
            </div>
            <div
              key={`${plotline.id}-${column.id}`}
              onDragOver={column.type === 'scene' ? handleDragOver : undefined}
              onDrop={column.type === 'scene' ? (e) => handleSceneRowDrop(e, plotline.id) : undefined}
              className="h-44 flex-shrink-0 flex items-center justify-center relative group group/slot"
              style={{ width: `${column.width}px` }}
            >
              {column.type === 'chapter-divider' ? (
                <>
                  <div className="absolute inset-y-[-3rem] left-1/2 w-0 -translate-x-1/2 border-r-2 border-dashed border-[var(--theme-primary)]/30" />
                  <div className="relative z-10 h-16 w-8 rounded-full border border-[var(--theme-border)] bg-[var(--theme-card)] shadow-md" />
                </>
              ) : sceneInThisSlot ? (
                (() => {
                  const isDeletedFromCurrent = isPreviewMode && missingPreviewSceneIds.has(sceneInThisSlot.id);
                  const isRestoredToCurrent = isPreviewMode && restoredDeletedSceneIds.has(sceneInThisSlot.id) && currentSceneIds.has(sceneInThisSlot.id);
                  const isRestoringThisScene = restoringDeletedSceneId === sceneInThisSlot.id;

                  return (
                    <div
                      data-board-scene-id={sceneInThisSlot.id}
                      draggable={!isPreviewMode}
                      onDragStart={() => handleDragStart(sceneInThisSlot.id)}
                      onDoubleClick={() => {
                        if (isPreviewMode) return;
                        onSceneDoubleClick?.(sceneInThisSlot.id);
                      }}
                      className={`w-40 h-40 bg-[var(--theme-card)] shadow-xl border-t-8 p-4 rounded-sm transition-all hover:-translate-y-2 hover:shadow-2xl relative z-10 flex flex-col ${isPreviewMode ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'} ${sceneInThisSlot.isCompleted ? 'opacity-90 grayscale-[0.3]' : ''} ${isDeletedFromCurrent ? 'ring-2 ring-red-200' : ''} ${isRestoredToCurrent ? 'ring-2 ring-green-200' : ''}`}
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

                      {!isPreviewMode && (
                        <button
                          disabled={isPreviewMode}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isPreviewMode) return;
                            onDeleteScene(sceneInThisSlot.id);
                          }}
                          className="absolute -top-2 -left-2 text-red-400 hover:text-red-600 bg-[var(--theme-card)] rounded-full shadow-md p-1 z-30 opacity-40 group-hover/slot:opacity-100 transition-all"
                          title="מחק סצנה"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}

                      {isDeletedFromCurrent && (
                        <span className="absolute -top-3 -right-3 z-30 rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-600 shadow-sm">
                          נמחקה
                        </span>
                      )}

                      {isRestoredToCurrent && (
                        <span className="absolute -top-3 -right-3 z-30 rounded-full bg-green-50 px-2 py-1 text-[10px] font-black text-green-700 shadow-sm">
                          הוחזרה ללוח הנוכחי
                        </span>
                      )}

                      <input
                        className="text-sm font-bold w-full text-center bg-transparent border-none focus:ring-0 p-0 text-[var(--theme-primary)] handwritten"
                        value={sceneInThisSlot.title}
                        readOnly={isPreviewMode}
                        onChange={(e) => {
                          if (isPreviewMode) return;
                          updateScene(sceneInThisSlot.id, { title: e.target.value });
                        }}
                      />
                      <div className="h-px bg-[var(--theme-secondary)] my-3" />
                      <textarea
                        className="text-[11px] text-[var(--theme-primary)]/60 leading-relaxed text-center w-full bg-transparent border-none focus:ring-0 p-0 resize-none h-16 overflow-hidden mb-2"
                        value={sceneInThisSlot.summary || ''}
                        placeholder="תמצית ההתרחשות..."
                        readOnly={isPreviewMode}
                        onChange={(e) => {
                          if (isPreviewMode) return;
                          updateScene(sceneInThisSlot.id, { summary: e.target.value });
                        }}
                      />
                      <SceneArcMarkers project={boardProject} sceneId={sceneInThisSlot.id} />
                      <div className="mt-auto pt-1 border-t border-amber-50/50 flex flex-col items-center gap-1">
                        {isDeletedFromCurrent && canRestoreDeletedScene ? (
                          <button
                            type="button"
                            disabled={isRestoringThisScene}
                            onClick={(e) => {
                              e.stopPropagation();
                              onRestoreDeletedScene(sceneInThisSlot.id);
                            }}
                            className="rounded-full bg-red-50 px-2 py-1 text-[9px] font-black text-red-700 shadow-sm transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
                          >
                            {isRestoringThisScene ? 'מחזירה...' : 'החזר סצנה ללוח הנוכחי'}
                          </button>
                        ) : (
                          <span className="text-[9px] font-black uppercase tracking-tighter opacity-40 px-2 py-0.5 rounded-full" style={{ backgroundColor: `${plotline.color}20`, color: plotline.color }}>
                            {plotline.name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : !isPreviewMode && !onAddSceneInSequence ? (
                <button 
                  onClick={() => {
                    if (isPreviewMode) return;
                    onAddScene(plotline.id, column.sceneOrderIndex);
                  }}
                  className="w-10 h-10 rounded-full border-2 border-dashed border-[var(--theme-border)] text-[var(--theme-border)] opacity-0 group-hover/slot:opacity-100 group-hover/plotline:opacity-100 hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)] transition-all flex items-center justify-center bg-[var(--theme-card)]/50"
                >
                  <Plus size={20} />
                </button>
              ) : (
                null
              )}
            </div>
            </React.Fragment>
          );
        })}
        <div
          className="group/add-scene relative flex h-44 flex-shrink-0 items-center justify-center"
          style={{ width: `${INSERTION_SLOT_WIDTH}px` }}
          onDragOver={handleDragOver}
          onDrop={(e) => handleSceneSequenceDrop(e, boardColumns.length, plotline.id)}
        >
          {!isPreviewMode && onAddSceneInSequence && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isPreviewMode) return;
                onAddSceneInSequence(plotline.id, boardColumns.length);
              }}
              className="absolute z-20 flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-[var(--theme-border)] bg-[var(--theme-card)]/50 text-[var(--theme-border)] opacity-0 shadow-md transition-all hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)] group-hover/add-scene:opacity-100 group-hover/plotline:opacity-100"
            >
              <Plus size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  ))}
</>
);

export default PlotlinesBoardView;

