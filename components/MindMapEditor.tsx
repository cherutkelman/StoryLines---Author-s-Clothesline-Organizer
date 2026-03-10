import React, { useState, useRef, useEffect } from 'react';
import { 
  Stage, Layer, Circle, Rect, Line, Text, Group, Transformer 
} from 'react-konva';
import { 
  Plus, Minus, Maximize, Download, Trash2, X, Edit2, RefreshCw, Share2
} from 'lucide-react';
import { MindMap, MindMapNode, MindMapEdge } from '../types';

interface MindMapEditorProps {
  map: MindMap;
  onUpdateMap: (updates: Partial<MindMap>) => void;
}

const MindMapEditor: React.FC<MindMapEditorProps> = ({ map, onUpdateMap }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    const handleResize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize root node if map is empty
  useEffect(() => {
    if (map.nodes.length === 0) {
      const rootNode: MindMapNode = {
        id: 'root',
        x: stageSize.width / 2,
        y: stageSize.height / 2,
        text: 'נושא מרכזי',
        type: 'circle',
        isRoot: true
      };
      onUpdateMap({ nodes: [rootNode], edges: [] });
    }
  }, [map.nodes.length, stageSize]);

  const handleNodeDragEnd = (id: string, e: any) => {
    const updatedNodes: MindMapNode[] = map.nodes.map(node => 
      node.id === id ? { ...node, x: e.target.x(), y: e.target.y() } : node
    );
    onUpdateMap({ nodes: updatedNodes });
  };

  const addNode = (parentId: string) => {
    const parent = map.nodes.find(n => n.id === parentId);
    if (!parent) return;

    const id = `node-${Date.now()}`;
    const newNode: MindMapNode = {
      id,
      x: parent.x + 150,
      y: parent.y + (Math.random() - 0.5) * 100,
      text: 'רעיון חדש',
      type: 'square'
    };

    const newEdge: MindMapEdge = {
      id: `edge-${Date.now()}`,
      fromId: parentId,
      toId: id
    };

    onUpdateMap({
      nodes: [...map.nodes, newNode],
      edges: [...map.edges, newEdge]
    });
    setSelectedId(id);
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

  const exportAsImage = () => {
    if (stageRef.current) {
      const uri = stageRef.current.toDataURL();
      const link = document.createElement('a');
      link.download = `${map.name || 'mind-map'}.png`;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.1, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
  const resetZoom = () => { setScale(1); setStagePos({ x: 0, y: 0 }); };

  const selectedNode = map.nodes.find(n => n.id === selectedId);

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
          draggable
          onDragEnd={(e) => {
            if (e.target === stageRef.current) {
              setStagePos({ x: e.target.x(), y: e.target.y() });
            }
          }}
          onClick={(e) => {
            if (e.target === stageRef.current) setSelectedId(null);
          }}
        >
          <Layer>
            {/* Edges */}
            {map.edges.map(edge => {
              const from = map.nodes.find(n => n.id === edge.fromId);
              const to = map.nodes.find(n => n.id === edge.toId);
              if (!from || !to) return null;
              return (
                <Line
                  key={edge.id}
                  points={[from.x, from.y, to.x, to.y]}
                  stroke={getComputedStyle(document.documentElement).getPropertyValue('--theme-border').trim() || '#cbd5e1'}
                  strokeWidth={2}
                />
              );
            })}

            {/* Nodes */}
            {map.nodes.map(node => (
              <Group
                key={node.id}
                x={node.x}
                y={node.y}
                draggable
                onDragEnd={(e) => handleNodeDragEnd(node.id, e)}
                onClick={() => setSelectedId(node.id)}
              >
                {node.type === 'circle' ? (
                  <Circle
                    radius={50}
                    fill={node.isRoot ? (getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim() || '#1e293b') : (getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim() + 'cc' || '#334155')}
                    stroke={selectedId === node.id ? (getComputedStyle(document.documentElement).getPropertyValue('--theme-accent').trim() || '#3b82f6') : 'transparent'}
                    strokeWidth={3}
                    shadowBlur={5}
                    shadowOpacity={0.2}
                  />
                ) : (
                  <Rect
                    x={-50}
                    y={-30}
                    width={100}
                    height={60}
                    fill={getComputedStyle(document.documentElement).getPropertyValue('--theme-secondary').trim() || '#f1f5f9'}
                    stroke={selectedId === node.id ? (getComputedStyle(document.documentElement).getPropertyValue('--theme-accent').trim() || '#3b82f6') : (getComputedStyle(document.documentElement).getPropertyValue('--theme-border').trim() || '#cbd5e1')}
                    strokeWidth={2}
                    cornerRadius={8}
                    shadowBlur={5}
                    shadowOpacity={0.1}
                  />
                )}
                <Text
                  text={node.text}
                  fontSize={14}
                  fill={node.type === 'circle' ? (getComputedStyle(document.documentElement).getPropertyValue('--theme-card').trim() || 'white') : (getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim() || '#1e293b')}
                  align="center"
                  verticalAlign="middle"
                  width={90}
                  height={node.type === 'circle' ? 100 : 60}
                  offsetX={45}
                  offsetY={node.type === 'circle' ? 50 : 30}
                  wrap="char"
                />
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
        </div>

        <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-[var(--theme-card)]/80 backdrop-blur-md p-2 rounded-2xl border border-[var(--theme-border)] shadow-xl">
          <button onClick={zoomOut} className="p-2 text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-xl transition-all"><Minus size={18} /></button>
          <div className="text-xs font-bold text-[var(--theme-primary)] w-12 text-center">{Math.round(scale * 100)}%</div>
          <button onClick={zoomIn} className="p-2 text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-xl transition-all"><Plus size={18} /></button>
          <div className="h-4 w-px bg-[var(--theme-border)]/50 mx-1" />
          <button onClick={resetZoom} className="p-2 text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-xl transition-all"><Maximize size={18} /></button>
        </div>

        {/* Node Actions (when selected) */}
        {selectedNode && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-[2rem] shadow-2xl p-4 flex items-center gap-4 z-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-[var(--theme-primary)]/40 uppercase px-2">טקסט</label>
              <input 
                type="text"
                value={selectedNode.text}
                onChange={(e) => updateNodeText(selectedNode.id, e.target.value)}
                className="bg-[var(--theme-secondary)] border border-[var(--theme-border)]/50 rounded-xl px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/20 w-48 text-[var(--theme-primary)]"
                autoFocus
              />
            </div>
            
            <div className="h-8 w-px bg-[var(--theme-border)]/50 mx-2" />
            
            <div className="flex items-center gap-2">
              {selectedNode.type === 'circle' && (
                <button 
                  onClick={() => addNode(selectedNode.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-xl text-xs font-bold hover:opacity-90 transition-all"
                >
                  <Share2 size={14} />
                  <span>הוסף ענף</span>
                </button>
              )}
              
              <button 
                onClick={() => toggleNodeType(selectedNode.id)}
                className="p-2 text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-xl transition-all"
                title={selectedNode.type === 'circle' ? 'הפוך לריבוע' : 'הפוך לעיגול'}
              >
                <RefreshCw size={18} />
              </button>

              {!selectedNode.isRoot && (
                <button 
                  onClick={() => deleteNode(selectedNode.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="מחק"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <button onClick={() => setSelectedId(null)} className="p-2 text-[var(--theme-primary)]/30 hover:text-[var(--theme-primary)]">
              <X size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MindMapEditor;
