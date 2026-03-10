
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { QuestionnaireEntry, CharacterMapConnection } from '../types';
import { Plus, Link as LinkIcon, Trash2, User, Image as ImageIcon, X, Move, Edit2, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import html2canvas from 'html2canvas';

interface CharacterMapProps {
  characters: QuestionnaireEntry[];
  connections: CharacterMapConnection[];
  onUpdateCharacters: (chars: QuestionnaireEntry[]) => void;
  onUpdateConnections: (connections: CharacterMapConnection[]) => void;
}

const CharacterMap: React.FC<CharacterMapProps> = ({ characters, connections, onUpdateCharacters, onUpdateConnections }) => {
  const [tool, setTool] = useState<'move' | 'link'>('move');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [draggingLabelId, setDraggingLabelId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        const newZoom = Math.min(Math.max(0.2, zoom + delta), 3);
        setZoom(newZoom);
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [zoom]);

  const [localCharacters, setLocalCharacters] = useState<QuestionnaireEntry[]>(characters);
  const [localConnections, setLocalConnections] = useState<CharacterMapConnection[]>(connections);

  useEffect(() => {
    if (!draggingNodeId && !draggingLabelId) {
      setLocalCharacters(characters);
    }
  }, [characters, draggingNodeId, draggingLabelId]);

  useEffect(() => {
    if (!draggingNodeId && !draggingLabelId) {
      setLocalConnections(connections);
    }
  }, [connections, draggingNodeId, draggingLabelId]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (tool === 'move') {
      setSelectedNodeId(null);
    }
  };

  const addNode = (e: React.MouseEvent) => {
    const newNode: QuestionnaireEntry = {
      id: `char-${Date.now()}`,
      name: 'דמות חדשה',
      x: 200,
      y: 200,
      data: { gender: 'female' },
      customFields: []
    };
    onUpdateCharacters([...characters, newNode]);
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
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    if (draggingNodeId && tool === 'move') {
      setLocalCharacters(prev => prev.map(n => n.id === draggingNodeId ? { ...n, x, y } : n));
    } else if (draggingLabelId) {
      const conn = localConnections.find(c => c.id === draggingLabelId);
      if (!conn) return;
      const from = localCharacters.find(n => n.id === conn.fromId);
      const to = localCharacters.find(n => n.id === conn.toId);
      if (!from || !to) return;

      const x1 = from.x ?? 0;
      const y1 = from.y ?? 0;
      const x2 = to.x ?? 0;
      const y2 = to.y ?? 0;

      // Project point onto line segment
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return;

      let t = ((x - x1) * dx + (y - y1) * dy) / lenSq;
      t = Math.max(0.1, Math.min(0.9, t)); // Keep it within bounds and not exactly on nodes

      setLocalConnections(prev => prev.map(c => c.id === draggingLabelId ? { ...c, labelPosition: t } : c));
    }
  };

  const handleMouseUp = () => {
    if (draggingNodeId) {
      onUpdateCharacters(localCharacters);
    }
    if (draggingLabelId) {
      onUpdateConnections(localConnections);
    }
    setDraggingNodeId(null);
    setDraggingLabelId(null);
  };

  const deleteNode = (id: string) => {
    onUpdateCharacters(characters.filter(n => n.id !== id));
    onUpdateConnections(connections.filter(c => c.fromId !== id && c.toId !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const updateNode = (id: string, updates: Partial<QuestionnaireEntry>) => {
    onUpdateCharacters(characters.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const updateConnection = (id: string, description: string) => {
    onUpdateConnections(connections.map(c => c.id === id ? { ...c, description } : c));
  };

  const deleteConnection = (id: string) => {
    onUpdateConnections(connections.filter(c => c.id !== id));
  };

  const handleImageUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Renderer: handleImageUpload triggered for node:', id);
    
    // Safer check for Electron
    let isElectron = false;
    try {
      isElectron = !!((window as any).require && (window as any).require('electron'));
    } catch (err) {
      isElectron = false;
    }
    
    if (isElectron) {
      console.log('Renderer: Electron environment detected, using IPC dialog');
      try {
        const { ipcRenderer } = (window as any).require('electron');
        const dataUrl = await ipcRenderer.invoke('open-image-dialog');
        
        console.log('Renderer: IPC dialog returned result');
        if (dataUrl) {
          console.log('Renderer: Received dataUrl, updating node');
          updateNode(id, { imageUrl: dataUrl });
        } else {
          console.log('Renderer: Dialog was canceled or no file selected');
        }
      } catch (error) {
        console.error('Renderer: Error in Electron image upload:', error);
      }
      return;
    }

    console.log('Renderer: Standard web environment detected, using FileReader');
    const file = e?.target?.files?.[0];
    if (file) {
      console.log('Renderer: File selected:', file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('Renderer: FileReader finished reading');
        updateNode(id, { imageUrl: reader.result as string });
      };
      reader.onerror = (err) => {
        console.error('Renderer: FileReader error:', err);
      };
      reader.readAsDataURL(file);
    } else {
      console.log('Renderer: No file selected in standard input');
    }
  };

  const handleRemoveImage = (id: string) => {
    updateNode(id, { imageUrl: undefined });
  };

  const exportAsImage = async () => {
    if (!canvasRef.current) return;
    
    setIsExporting(true);
    
    // Small delay to allow React to re-render without controls
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--theme-bg').trim() || '#fdf6e3',
        useCORS: true,
        scale: 2, // Higher quality
        logging: false,
        removeContainer: true,
      });
      
      const link = document.createElement('a');
      link.download = `character-map-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const selectedNode = characters.find(n => n.id === selectedNodeId);

  return (
    <div className="h-full flex flex-col relative select-none bg-[var(--theme-bg)]">
      {/* Tool Bar */}
      {!isExporting && (
        <div className="character-map-toolbar absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-[var(--theme-card)]/80 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-[var(--theme-border)] flex items-center gap-2">
          <button 
            onClick={() => setTool('move')}
            className={`p-3 rounded-xl transition-all flex items-center gap-2 ${tool === 'move' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-md' : 'text-[var(--theme-primary)]/60 hover:bg-[var(--theme-secondary)]'}`}
          >
            <Move size={18} />
            <span className="text-xs font-bold">הזזה</span>
          </button>
          <button 
            onClick={() => setTool('link')}
            className={`p-3 rounded-xl transition-all flex items-center gap-2 ${tool === 'link' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-md' : 'text-[var(--theme-primary)]/60 hover:bg-[var(--theme-secondary)]'}`}
          >
            <LinkIcon size={18} />
            <span className="text-xs font-bold">קישור דמויות</span>
          </button>
          <div className="w-px h-6 bg-[var(--theme-border)] mx-1" />
          <div className="flex items-center gap-1 bg-[var(--theme-secondary)] rounded-xl p-1 border border-[var(--theme-border)]/50">
            <button 
              onClick={() => setZoom(prev => Math.max(0.2, prev - 0.1))}
              className="p-2 text-[var(--theme-primary)] hover:bg-[var(--theme-card)] rounded-lg transition-all"
              title="זום אאוט"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-[10px] font-bold text-[var(--theme-primary)] w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button 
              onClick={() => setZoom(prev => Math.min(3, prev + 0.1))}
              className="p-2 text-[var(--theme-primary)] hover:bg-[var(--theme-card)] rounded-lg transition-all"
              title="זום אין"
            >
              <ZoomIn size={16} />
            </button>
            <button 
              onClick={() => setZoom(1)}
              className="p-2 text-[var(--theme-primary)] hover:bg-[var(--theme-card)] rounded-lg transition-all"
              title="איפוס זום"
            >
              <RotateCcw size={14} />
            </button>
          </div>
          <div className="w-px h-6 bg-[var(--theme-border)] mx-1" />
          <button 
            onClick={addNode}
            className="p-3 bg-[var(--theme-secondary)] text-[var(--theme-primary)] rounded-xl hover:opacity-80 transition-all flex items-center gap-2"
          >
            <Plus size={18} />
            <span className="text-xs font-bold">דמות חדשה</span>
          </button>
          <div className="w-px h-6 bg-[var(--theme-border)] mx-1" />
          <button 
            onClick={exportAsImage}
            className="p-3 bg-[var(--theme-card)] text-[var(--theme-primary)] border border-[var(--theme-border)] rounded-xl hover:bg-[var(--theme-secondary)] transition-all flex items-center gap-2"
            title="ייצוא תמונה"
          >
            <Download size={18} />
            <span className="text-xs font-bold">ייצוא תמונה</span>
          </button>
        </div>
      )}

      {/* Canvas Area */}
      <div 
        ref={canvasRef}
        className="flex-1 overflow-hidden relative"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
      >
        <div 
          className="absolute inset-0 transition-transform duration-75 ease-out origin-top-right"
          style={{ transform: `scale(${zoom})`, width: `${100/zoom}%`, height: `${100/zoom}%` }}
        >
          <svg className="absolute inset-0 pointer-events-none w-full h-full z-0">
            {localConnections.map(conn => {
            const fromNode = localCharacters.find(n => n.id === conn.fromId);
            const toNode = localCharacters.find(n => n.id === conn.toId);
            if (!fromNode || !toNode) return null;

            return (
              <g key={conn.id}>
                <line 
                  x1={fromNode.x ?? 0} 
                  y1={fromNode.y ?? 0} 
                  x2={toNode.x ?? 0} 
                  y2={toNode.y ?? 0} 
                  stroke="currentColor" 
                  className="text-[var(--theme-primary)]"
                  strokeWidth="2" 
                  strokeDasharray="5,5" 
                  opacity="0.3" 
                />
              </g>
            );
          })}
        </svg>

        {/* Relationship Text Boxes on Lines */}
        {localConnections.map(conn => {
          const fromNode = localCharacters.find(n => n.id === conn.fromId);
          const toNode = localCharacters.find(n => n.id === conn.toId);
          if (!fromNode || !toNode) return null;

          const t = conn.labelPosition ?? 0.5;
          const x1 = fromNode.x ?? 0;
          const y1 = fromNode.y ?? 0;
          const x2 = toNode.x ?? 0;
          const y2 = toNode.y ?? 0;

          const labelX = x1 + (x2 - x1) * t;
          const labelY = y1 + (y2 - y1) * t;

          return (
            <div 
              key={`${conn.id}-text`}
              className="absolute pointer-events-auto z-10 group"
              style={{ left: labelX, top: labelY, transform: 'translate(-50%, -50%)' }}
            >
              <div className="relative flex flex-col items-center">
                <div 
                  className="cursor-grab active:cursor-grabbing p-1 text-[var(--theme-accent)]/50 hover:text-[var(--theme-accent)] transition-colors"
                  onMouseDown={(e) => {
                    if (isExporting) return;
                    e.stopPropagation();
                    setDraggingLabelId(conn.id);
                  }}
                >
                  {!isExporting && <Move size={14} />}
                </div>
                {isExporting ? (
                  <div className="handwritten text-[10px] min-w-[60px] max-w-[120px] bg-white/90 border border-slate-200 rounded-lg p-2 shadow-md text-center leading-tight whitespace-pre-wrap text-slate-900">
                    {conn.description}
                  </div>
                ) : (
                  <textarea 
                    className="handwritten text-[10px] min-w-[60px] max-w-[120px] bg-white/90 border border-slate-200 rounded-lg p-1 shadow-md focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-none transition-all text-center leading-tight overflow-visible text-slate-900"
                    value={conn.description}
                    onChange={(e) => {
                      updateConnection(conn.id, e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = (e.target.scrollHeight + 10) + 'px';
                    }}
                    onFocus={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = (e.target.scrollHeight + 10) + 'px';
                    }}
                    rows={1}
                  />
                )}
                {!isExporting && (
                  <button 
                    onClick={() => deleteConnection(conn.id)}
                    className="absolute -top-2 -right-2 bg-red-50 text-red-400 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Character Nodes */}
        {localCharacters.map(node => (
          <div 
            key={node.id}
            className={`absolute cursor-pointer z-20 group flex flex-col items-center gap-1.5 ${draggingNodeId === node.id ? 'scale-110' : ''}`}
            style={{ left: node.x ?? 200, top: node.y ?? 200, transform: 'translate(-50%, -50%)' }}
            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
          >
            <div className={`w-16 h-16 rounded-full border-2 shadow-lg overflow-hidden bg-[var(--theme-card)] flex items-center justify-center transition-all ${selectedNodeId === node.id ? 'border-[var(--theme-accent)] ring-2 ring-[var(--theme-accent)]/20' : 'border-[var(--theme-border)] hover:border-[var(--theme-accent)]/50'}`}>
              {node.imageUrl ? (
                <img src={node.imageUrl} alt={node.name} className="w-full h-full object-cover" />
              ) : (
                <User size={32} className="text-[var(--theme-border)]" />
              )}
            </div>
            
            <div className="bg-[var(--theme-card)]/90 backdrop-blur-sm px-2 py-1.5 rounded-md border border-[var(--theme-border)] shadow-sm overflow-visible">
               {selectedNodeId === node.id && !isExporting ? (
                 <input 
                   autoFocus
                   className="text-center font-bold text-[var(--theme-primary)] bg-transparent border-none focus:ring-0 p-0 text-[10px] w-20 leading-tight"
                   value={node.name}
                   onChange={(e) => updateNode(node.id, { name: e.target.value })}
                   onClick={(e) => e.stopPropagation()}
                 />
               ) : (
                 <span className="text-[10px] font-bold text-[var(--theme-primary)] truncate max-w-[80px] block leading-normal py-0.5">{node.name}</span>
               )}
            </div>

            {/* Node Controls Overlay */}
            {selectedNodeId === node.id && (
              <div className="node-controls absolute -top-12 flex gap-2 animate-in fade-in slide-in-from-bottom-2">
                <label 
                  className="p-2 bg-white text-blue-600 rounded-full shadow-lg hover:bg-blue-50 cursor-pointer border border-blue-100 transition-colors" 
                  title="העלאת תמונה"
                  onClick={(e) => {
                    let isElectron = false;
                    try {
                      isElectron = !!((window as any).require && (window as any).require('electron'));
                    } catch (err) {
                      isElectron = false;
                    }
                    
                    if (isElectron) {
                      e.preventDefault();
                      handleImageUpload(node.id, null as any);
                    }
                  }}
                >
                  <ImageIcon size={16} />
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(node.id, e)} />
                </label>
                {node.imageUrl && (
                  <button 
                    onClick={() => handleRemoveImage(node.id)}
                    className="p-2 bg-white text-orange-500 rounded-full shadow-lg hover:bg-orange-50 border border-orange-100 transition-colors"
                    title="הסרת תמונה"
                  >
                    <X size={16} />
                  </button>
                )}
                <button 
                  onClick={() => deleteNode(node.id)}
                  className="p-2 bg-white text-red-500 rounded-full shadow-lg hover:bg-red-50 border border-red-100 transition-colors"
                  title="מחיקת דמות"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        ))}

        {tool === 'link' && selectedNodeId && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-xs font-black text-[var(--theme-primary)]/40 uppercase tracking-widest bg-[var(--theme-secondary)] px-4 py-2 rounded-full border border-[var(--theme-border)]/50">
            בחר דמות נוספת כדי ליצור קישור
          </div>
        )}
        </div>
      </div>

      {/* Floating Instructions */}
      {!isExporting && (
        <div className="character-map-instructions absolute bottom-8 right-8 text-right pointer-events-none">
          <h4 className="handwritten text-3xl text-[var(--theme-primary)]/40 mb-1">מפת דמויות</h4>
          <p className="text-[10px] text-[var(--theme-primary)]/30 font-bold uppercase tracking-widest">גרור דמויות כדי לשנות מיקום | השתמש בכלי הקישור לתיאור יחסים</p>
        </div>
      )}
    </div>
  );
};

export default CharacterMap;
