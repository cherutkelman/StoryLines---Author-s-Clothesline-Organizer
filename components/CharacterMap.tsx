
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CharacterMapNode, CharacterMapConnection } from '../types';
import { Plus, Link as LinkIcon, Trash2, User, Image as ImageIcon, X, Move, Edit2 } from 'lucide-react';

interface CharacterMapProps {
  nodes: CharacterMapNode[];
  connections: CharacterMapConnection[];
  onUpdateNodes: (nodes: CharacterMapNode[]) => void;
  onUpdateConnections: (connections: CharacterMapConnection[]) => void;
}

const CharacterMap: React.FC<CharacterMapProps> = ({ nodes, connections, onUpdateNodes, onUpdateConnections }) => {
  const [tool, setTool] = useState<'move' | 'link'>('move');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (tool === 'move') {
      setSelectedNodeId(null);
    }
  };

  const addNode = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Place at center of view if possible, or near where clicked if we use absolute coordinates
    const newNode: CharacterMapNode = {
      id: `node-${Date.now()}`,
      name: 'דמות חדשה',
      x: 200,
      y: 200,
    };
    onUpdateNodes([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tool === 'link') {
      if (selectedNodeId && selectedNodeId !== id) {
        // Create connection
        const exists = connections.find(c => (c.fromId === selectedNodeId && c.toId === id) || (c.fromId === id && c.toId === selectedNodeId));
        if (!exists) {
          const newConn: CharacterMapConnection = {
            id: `conn-${Date.now()}`,
            fromId: selectedNodeId,
            toId: id,
            description: 'תיאור הקשר...',
          };
          onUpdateConnections([...connections, newConn]);
        }
        setSelectedNodeId(null);
      } else {
        setSelectedNodeId(id);
      }
    } else {
      setSelectedNodeId(id);
      setDraggingNodeId(id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId && tool === 'move') {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      onUpdateNodes(nodes.map(n => n.id === draggingNodeId ? { ...n, x, y } : n));
    }
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
  };

  const deleteNode = (id: string) => {
    onUpdateNodes(nodes.filter(n => n.id !== id));
    onUpdateConnections(connections.filter(c => c.fromId !== id && c.toId !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const updateNode = (id: string, updates: Partial<CharacterMapNode>) => {
    onUpdateNodes(nodes.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const updateConnection = (id: string, description: string) => {
    onUpdateConnections(connections.map(c => c.id === id ? { ...c, description } : c));
  };

  const deleteConnection = (id: string) => {
    onUpdateConnections(connections.filter(c => c.id !== id));
  };

  const handleImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateNode(id, { imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="h-full flex flex-col relative select-none bg-[#fdf6e3]">
      {/* Tool Bar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-amber-200 flex items-center gap-2">
        <button 
          onClick={() => setTool('move')}
          className={`p-3 rounded-xl transition-all flex items-center gap-2 ${tool === 'move' ? 'bg-amber-800 text-white shadow-md' : 'text-amber-800/60 hover:bg-amber-50'}`}
        >
          <Move size={18} />
          <span className="text-xs font-bold">הזזה</span>
        </button>
        <button 
          onClick={() => setTool('link')}
          className={`p-3 rounded-xl transition-all flex items-center gap-2 ${tool === 'link' ? 'bg-amber-800 text-white shadow-md' : 'text-amber-800/60 hover:bg-amber-50'}`}
        >
          <LinkIcon size={18} />
          <span className="text-xs font-bold">קישור דמויות</span>
        </button>
        <div className="w-px h-6 bg-amber-200 mx-1" />
        <button 
          onClick={addNode}
          className="p-3 bg-amber-100 text-amber-800 rounded-xl hover:bg-amber-200 transition-all flex items-center gap-2"
        >
          <Plus size={18} />
          <span className="text-xs font-bold">דמות חדשה</span>
        </button>
      </div>

      {/* Canvas Area */}
      <div 
        ref={canvasRef}
        className="flex-1 overflow-hidden relative"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
      >
        <svg className="absolute inset-0 pointer-events-none w-full h-full z-0">
          {connections.map(conn => {
            const fromNode = nodes.find(n => n.id === conn.fromId);
            const toNode = nodes.find(n => n.id === conn.toId);
            if (!fromNode || !toNode) return null;

            return (
              <g key={conn.id}>
                <line 
                  x1={fromNode.x} 
                  y1={fromNode.y} 
                  x2={toNode.x} 
                  y2={toNode.y} 
                  stroke="#78350f" 
                  strokeWidth="2" 
                  strokeDasharray="5,5" 
                  opacity="0.3" 
                />
              </g>
            );
          })}
        </svg>

        {/* Relationship Text Boxes on Lines */}
        {connections.map(conn => {
          const fromNode = nodes.find(n => n.id === conn.fromId);
          const toNode = nodes.find(n => n.id === conn.toId);
          if (!fromNode || !toNode) return null;

          const midX = (fromNode.x + toNode.x) / 2;
          const midY = (fromNode.y + toNode.y) / 2;

          return (
            <div 
              key={`${conn.id}-text`}
              className="absolute pointer-events-auto z-10 group"
              style={{ left: midX, top: midY, transform: 'translate(-50%, -50%)' }}
            >
              <div className="relative">
                <textarea 
                  className="handwritten text-lg min-w-[120px] max-w-[200px] bg-white/90 border-2 border-amber-100 rounded-xl p-3 shadow-lg focus:ring-4 focus:ring-amber-200/20 focus:border-amber-400 outline-none resize-none transition-all text-center leading-tight"
                  value={conn.description}
                  onChange={(e) => {
                    updateConnection(conn.id, e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onFocus={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  rows={1}
                />
                <button 
                  onClick={() => deleteConnection(conn.id)}
                  className="absolute -top-2 -right-2 bg-red-50 text-red-400 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          );
        })}

        {/* Character Nodes */}
        {nodes.map(node => (
          <div 
            key={node.id}
            className={`absolute cursor-pointer z-20 group flex flex-col items-center gap-2 ${draggingNodeId === node.id ? 'scale-110' : ''}`}
            style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
          >
            <div className={`w-24 h-24 rounded-full border-4 shadow-xl overflow-hidden bg-white flex items-center justify-center transition-all ${selectedNodeId === node.id ? 'border-amber-500 ring-4 ring-amber-200' : 'border-amber-100 hover:border-amber-300'}`}>
              {node.imageUrl ? (
                <img src={node.imageUrl} alt={node.name} className="w-full h-full object-cover" />
              ) : (
                <User size={48} className="text-amber-100" />
              )}
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg border border-amber-100 shadow-sm">
               {selectedNodeId === node.id ? (
                 <input 
                   autoFocus
                   className="text-center font-bold text-amber-900 bg-transparent border-none focus:ring-0 p-0 text-sm w-24"
                   value={node.name}
                   onChange={(e) => updateNode(node.id, { name: e.target.value })}
                   onClick={(e) => e.stopPropagation()}
                 />
               ) : (
                 <span className="text-sm font-bold text-amber-900 truncate max-w-[100px] block">{node.name}</span>
               )}
            </div>

            {/* Node Controls Overlay */}
            {selectedNodeId === node.id && (
              <div className="absolute -top-12 flex gap-2 animate-in fade-in slide-in-from-bottom-2">
                <label className="p-2 bg-white text-blue-500 rounded-full shadow-lg hover:bg-blue-50 cursor-pointer">
                  <ImageIcon size={16} />
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(node.id, e)} />
                </label>
                <button 
                  onClick={() => deleteNode(node.id)}
                  className="p-2 bg-white text-red-500 rounded-full shadow-lg hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        ))}

        {tool === 'link' && selectedNodeId && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-xs font-black text-amber-900/40 uppercase tracking-widest bg-amber-50 px-4 py-2 rounded-full border border-amber-100">
            בחר דמות נוספת כדי ליצור קישור
          </div>
        )}
      </div>

      {/* Floating Instructions */}
      <div className="absolute bottom-8 right-8 text-right pointer-events-none">
        <h4 className="handwritten text-3xl text-amber-900/40 mb-1">מפת דמויות</h4>
        <p className="text-[10px] text-amber-900/30 font-bold uppercase tracking-widest">גרור דמויות כדי לשנות מיקום | השתמש בכלי הקישור לתיאור יחסים</p>
      </div>
    </div>
  );
};

export default CharacterMap;
