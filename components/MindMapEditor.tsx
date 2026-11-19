import React, { useState, useRef, useEffect } from 'react';
import type Konva from 'konva';
import { 
  Stage, Layer, Group
} from 'react-konva';
import { 
  Plus, Minus, Maximize, Download, Trash2, X, Edit2, RefreshCw, Share2
} from 'lucide-react';
import { MindMap, MindMapNode } from '../types';
import { MindMapLine, MindMapNodeArtwork } from './maps/MindMapArtwork';
import { useMindMapExport } from './maps/useMindMapExport';
import { addMindMapBranch, createMindMapRoot } from '../src/mind-map-ideas';

interface MindMapEditorProps {
  map: MindMap;
  onUpdateMap: (updates: Partial<MindMap>) => void;
}

const MindMapEditor: React.FC<MindMapEditorProps> = ({ map, onUpdateMap }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [isPanMode, setIsPanMode] = useState(false);
  
  const stageRef = useRef<any>(null);
  const artworkRef = useRef<Konva.Layer>(null);
  const { exportAsImage, exportError } = useMindMapExport(artworkRef, map.name);
  const containerRef = useRef<HTMLDivElement>(null);
  const centeredMapIdRef = useRef<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;

        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const mousePointTo = {
          x: (pointer.x - stage.x()) / oldScale,
          y: (pointer.y - stage.y()) / oldScale,
        };

        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        const newScale = Math.min(Math.max(0.5, oldScale + delta), 3);

        setScale(newScale);

        const newPos = {
          x: pointer.x - mousePointTo.x * newScale,
          y: pointer.y - mousePointTo.y * newScale,
        };
        setStagePos(newPos);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [scale, stagePos]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleResize = () => {
      if (container) {
        setStageSize({
          width: container.offsetWidth,
          height: container.offsetHeight
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!isPanMode) return;
    const leavePanOnButtonClick = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest('button')) return;
      setIsPanMode(false);
    };
    document.addEventListener('pointerdown', leavePanOnButtonClick, true);
    return () => document.removeEventListener('pointerdown', leavePanOnButtonClick, true);
  }, [isPanMode]);

  // Initialize root node if map is empty
  useEffect(() => {
    if (map.nodes.length === 0 && stageSize.width > 0 && stageSize.height > 0) {
      const rootNode = createMindMapRoot(stageSize.width / 2, stageSize.height / 2);
      onUpdateMap({ nodes: [rootNode], edges: [] });
    }
  }, [map.nodes.length, stageSize, onUpdateMap]);

  useEffect(() => {
    if (stageSize.width <= 0 || stageSize.height <= 0 || map.nodes.length === 0) return;
    if (centeredMapIdRef.current === map.id) return;

    const rootNode = map.nodes.find(node => node.isRoot) || map.nodes[0];
    if (!rootNode) return;

    setSelectedId(rootNode.id);
    setScale(1);
    setStagePos({
      x: stageSize.width / 2 - rootNode.x,
      y: stageSize.height / 2 - rootNode.y
    });
    centeredMapIdRef.current = map.id;
  }, [map.id, map.nodes, stageSize]);

  const handleNodeDragEnd = (id: string, e: any) => {
    const updatedNodes: MindMapNode[] = map.nodes.map(node => 
      node.id === id ? { ...node, x: e.target.x(), y: e.target.y() } : node
    );
    onUpdateMap({ nodes: updatedNodes });
  };

  const addNode = (parentId: string) => {
    const updates = addMindMapBranch(map, parentId);
    if (!updates) return;
    onUpdateMap(updates);
    setSelectedId(parentId);
  };

  const toggleNodeType = (id: string) => {
    const updatedNodes: MindMapNode[] = map.nodes.map(node => 
      node.id === id ? { ...node, type: (node.type === 'circle' ? 'square' : 'circle') as 'circle' | 'square' } : node
    );
    onUpdateMap({ nodes: updatedNodes });
  };

  const updateNodeText = (id: string, text: string) => {
    const updatedNodes: MindMapNode[] = map.nodes.map(node => 
      node.id === id ? { ...node, text } : node
    );
    onUpdateMap({ nodes: updatedNodes });
  };

  const deleteNode = (id: string) => {
    const node = map.nodes.find(n => n.id === id);
    if (!node || node.isRoot) return;

    // Recursive delete children? For now just delete node and its edges
    const nodesToDelete = new Set([id]);
    const edgesToDelete = new Set();

    // Simple one-level delete for now, or we can just delete the node and leave orphans?
    // Better to delete the branch or just the node.
    // Let's just delete the node and its connected edges.
    onUpdateMap({
      nodes: map.nodes.filter(n => n.id !== id),
      edges: map.edges.filter(e => e.fromId !== id && e.toId !== id)
    });
    setSelectedId(null);
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.1, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
  const centerNode = (node: MindMapNode) => {
    setScale(1);
    setStagePos({
      x: stageSize.width / 2 - node.x,
      y: stageSize.height / 2 - node.y
    });
  };
  const resetZoom = () => {
    const rootNode = map.nodes.find(node => node.isRoot) || map.nodes[0];
    if (rootNode) {
      centerNode(rootNode);
    } else {
      setScale(1);
      setStagePos({ x: 0, y: 0 });
    }
  };

  const selectedNode = map.nodes.find(n => n.id === selectedId);
  const rootNode = map.nodes.find(n => n.isRoot) || map.nodes[0];
  const activeNode = selectedNode || rootNode;

  return (
    <div className="h-full flex relative bg-[var(--theme-bg)]">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative" ref={containerRef}>
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          scaleX={scale}
          scaleY={scale}
          x={stagePos.x}
          y={stagePos.y}
          ref={stageRef}
          draggable={isPanMode}
          onDragEnd={(e) => {
            if (e.target === stageRef.current) {
              setStagePos({ x: e.target.x(), y: e.target.y() });
            }
          }}
          onClick={(e) => {
            if (!isPanMode && e.target === stageRef.current) setSelectedId(rootNode?.id || null);
          }}
          onDblClick={(e) => {
            if (e.target !== stageRef.current) return;
            setIsPanMode(true);
            setSelectedId(null);
          }}
        >
          <Layer ref={artworkRef}>
            {/* Edges */}
            {map.edges.map(edge => {
              const from = map.nodes.find(n => n.id === edge.fromId);
              const to = map.nodes.find(n => n.id === edge.toId);
              if (!from || !to) return null;
              return (
                <MindMapLine key={edge.id} from={from} to={to} />
              );
            })}

            {/* Nodes */}
            {map.nodes.map(node => (
              <Group
                key={node.id}
                x={node.x}
                y={node.y}
                draggable={!isPanMode}
                onMouseDown={(e) => {
                  if (!isPanMode) return;
                  const stage = e.target.getStage();
                  stage?.stopDrag();
                  stage?.draggable(false);
                  setIsPanMode(false);
                  setSelectedId(node.id);
                }}
                onDragEnd={(e) => handleNodeDragEnd(node.id, e)}
                onClick={(e) => {
                  e.cancelBubble = true;
                  setSelectedId(node.id);
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  setSelectedId(node.id);
                }}
              >
                <MindMapNodeArtwork node={node} selected={selectedId === node.id} />
              </Group>
            ))}
          </Layer>
        </Stage>

        {/* Floating Controls */}
        <div className="absolute top-6 right-6 flex flex-col gap-2">
          <button 
            onClick={exportAsImage}
            className="p-3 bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-2xl shadow-lg text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] transition-all"
            title="ייצוא כתמונה"
          >
            <Download size={20} />
          </button>
          {exportError && <p role="alert" className="max-w-60 rounded-xl bg-[var(--theme-card)] p-2 text-[var(--theme-text)]">לא ניתן לייצא את המפה כתמונה.</p>}
        </div>

        <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-[var(--theme-card)]/80 backdrop-blur-md p-2 rounded-2xl border border-[var(--theme-border)] shadow-xl">
          <button onClick={zoomOut} className="p-2 text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-xl transition-all"><Minus size={18} /></button>
          <div className="text-xs font-bold text-[var(--theme-primary)] w-12 text-center">{Math.round(scale * 100)}%</div>
          <button onClick={zoomIn} className="p-2 text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-xl transition-all"><Plus size={18} /></button>
          <div className="h-4 w-px bg-[var(--theme-border)]/50 mx-1" />
          <button onClick={resetZoom} className="p-2 text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-xl transition-all"><Maximize size={18} /></button>
        </div>

        {/* Node Actions */}
        {activeNode && (
          <div className="absolute top-2 left-2 right-2 sm:top-auto sm:right-auto sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-2xl shadow-2xl p-2 sm:p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 z-20 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col gap-1 min-w-0">
              <label className="sr-only">טקסט</label>
              <input 
                type="text"
                value={activeNode.text}
                onChange={(e) => updateNodeText(activeNode.id, e.target.value)}
                className="bg-[var(--theme-secondary)] border border-[var(--theme-border)]/50 rounded-xl px-3 py-1.5 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/20 w-full sm:w-48 text-[var(--theme-primary)]"
              />
            </div>
            
            <div className="hidden sm:block h-8 w-px bg-[var(--theme-border)]/50 mx-2" />
            
            <div className="flex items-center gap-2 flex-wrap">
              {activeNode.type === 'circle' && (
                <button 
                  onClick={() => addNode(activeNode.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-xl text-xs font-bold hover:opacity-90 transition-all"
                >
                  <Share2 size={14} />
                  <span>הוסף ענף</span>
                </button>
              )}
              
              <button 
                onClick={() => toggleNodeType(activeNode.id)}
                className="p-1.5 text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-xl transition-all"
                title={activeNode.type === 'circle' ? 'הפוך לריבוע' : 'הפוך לעיגול'}
              >
                <RefreshCw size={18} />
              </button>

              {!activeNode.isRoot && (
                <button 
                  onClick={() => deleteNode(activeNode.id)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="מחק"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <button onClick={() => setSelectedId(rootNode?.id || null)} className="absolute top-1 left-1 sm:static p-1.5 text-[var(--theme-primary)]/30 hover:text-[var(--theme-primary)]">
              <X size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MindMapEditor;
