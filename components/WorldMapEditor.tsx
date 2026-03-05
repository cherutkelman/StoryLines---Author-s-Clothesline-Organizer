import React, { useState, useRef, useEffect } from 'react';
import { 
  Stage, Layer, Rect, Circle, Line, Text, Image as KonvaImage, Group, Transformer 
} from 'react-konva';
import { 
  Home, Trees, Mountain, MapPin, Type as LucideType, 
  Trash2, Undo, Redo, Upload, MousePointer2, Pencil, 
  Waves, Route, Circle as CircleIcon, Square, Eraser,
  ChevronRight, ChevronLeft, Plus, Minus, Maximize,
  Image as ImageIcon, X, Building2, Castle, Dog, TreePine, Download
} from 'lucide-react';
import { WorldMap, MapElement } from '../types';
import useImage from 'use-image';

interface WorldMapEditorProps {
  map: WorldMap;
  onUpdateMap: (updates: Partial<WorldMap>) => void;
}

const ICON_COMPONENTS = {
  house: Home,
  houses: Home, // Using Home for both for now, can differentiate later
  tree: Trees,
  mountain: Mountain,
  valley: Mountain, // Using Mountain for both for now
};

const WorldMapEditor: React.FC<WorldMapEditorProps> = ({ map, onUpdateMap }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<'select' | 'pencil' | 'road' | 'river' | 'pool' | 'text' | 'icon'>('select');
  const [selectedIcon, setSelectedIcon] = useState<'house' | 'houses' | 'tree' | 'trees' | 'mountain' | 'valley' | 'buildings' | 'palace' | 'bridge' | 'animal'>('house');
  const [isDrawing, setIsDrawing] = useState(false);
  const [previewPos, setPreviewPos] = useState<{x: number, y: number} | null>(null);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [bgImage] = useImage(map.backgroundImage || '');
  const [stageSize, setStageSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const selectedNode = stageRef.current.findOne('#' + selectedId);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId]);

  const handleMouseDown = (e: any) => {
    if (tool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedId(null);
      }
      return;
    }

    const stage = e.target.getStage();
    const pos = stage.getRelativePointerPosition();
    const id = `el-${Date.now()}`;

    if (tool === 'pencil' || tool === 'road' || tool === 'river') {
      setIsDrawing(true);
      const newElement: MapElement = {
        id,
        type: 'line',
        x: 0,
        y: 0,
        points: [pos.x, pos.y],
        stroke: tool === 'pencil' ? '#000000' : tool === 'road' ? '#8b4513' : '#3b82f6',
        strokeWidth: tool === 'pencil' ? 2 : tool === 'road' ? 4 : 6,
        ...(tool === 'road' && { dash: [10, 5] } as any)
      };
      onUpdateMap({ elements: [...map.elements, newElement] });
      setSelectedId(id);
    } else if (tool === 'pool') {
      const newElement: MapElement = {
        id,
        type: 'icon',
        iconType: 'valley', // Placeholder
        x: pos.x,
        y: pos.y,
        fill: '#93c5fd',
        stroke: '#3b82f6',
        strokeWidth: 2,
        ...( { isPool: true } as any)
      };
      onUpdateMap({ elements: [...map.elements, newElement] });
      setSelectedId(id);
    } else if (tool === 'text') {
      const newElement: MapElement = {
        id,
        type: 'text',
        x: pos.x,
        y: pos.y,
        text: 'שם מקום',
        fontSize: 20,
        fill: '#000000'
      };
      onUpdateMap({ elements: [...map.elements, newElement] });
      setSelectedId(id);
    } else if (tool === 'icon') {
      const newElement: MapElement = {
        id,
        type: 'icon',
        iconType: selectedIcon,
        x: pos.x,
        y: pos.y,
        fill: (selectedIcon === 'tree' || selectedIcon === 'trees') ? '#059669' : selectedIcon === 'mountain' ? '#92400e' : '#8b4513'
      };
      onUpdateMap({ elements: [...map.elements, newElement] });
      setSelectedId(id);
    }
  };

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getRelativePointerPosition();
    setPreviewPos(pos);

    if (!isDrawing) return;

    const lastElement = map.elements[map.elements.length - 1];
    if (lastElement && lastElement.type === 'line') {
      const updatedElements = map.elements.slice(0, -1);
      const updatedElement = {
        ...lastElement,
        points: [...(lastElement.points || []), pos.x, pos.y]
      };
      onUpdateMap({ elements: [...updatedElements, updatedElement] });
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleDblClick = () => {
    // No longer needed for freehand
  };

  const handleTransformEnd = (e: any) => {
    const node = e.target;
    const id = node.id();
    const updatedElements = map.elements.map(el => {
      if (el.id === id) {
        return {
          ...el,
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
        };
      }
      return el;
    });
    onUpdateMap({ elements: updatedElements });
  };

  const handleDragEnd = (e: any) => {
    const id = e.target.id();
    const updatedElements = map.elements.map(el => {
      if (el.id === id) {
        return {
          ...el,
          x: e.target.x(),
          y: e.target.y()
        };
      }
      return el;
    });
    onUpdateMap({ elements: updatedElements });
  };

  const deleteSelected = () => {
    if (selectedId) {
      onUpdateMap({ elements: map.elements.filter(el => el.id !== selectedId) });
      setSelectedId(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpdateMap({ backgroundImage: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.1, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
  const resetZoom = () => { setScale(1); setStagePos({ x: 0, y: 0 }); };

  const exportAsImage = () => {
    if (stageRef.current) {
      const uri = stageRef.current.toDataURL();
      const link = document.createElement('a');
      link.download = `${map.name || 'map'}.png`;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const selectedElement = map.elements.find(el => el.id === selectedId);

  return (
    <div className="h-full flex relative bg-[#fdf6e3]">
      {/* Toolbar */}
      <div className="w-16 bg-white border-l border-amber-100 flex flex-col items-center py-6 gap-4 shadow-xl z-20">
        <button 
          onClick={exportAsImage}
          className="p-3 text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
          title="ייצוא כתמונה"
        >
          <Download size={20} />
        </button>
        <div className="h-px w-8 bg-amber-50" />
        <button 
          onClick={() => setTool('select')}
          className={`p-3 rounded-xl transition-all ${tool === 'select' ? 'bg-amber-800 text-white shadow-md' : 'text-amber-200 hover:bg-amber-50'}`}
          title="בחירה"
        >
          <MousePointer2 size={20} />
        </button>
        <div className="h-px w-8 bg-amber-50" />
        <button 
          onClick={() => setTool('pencil')}
          className={`p-3 rounded-xl transition-all ${tool === 'pencil' ? 'bg-amber-800 text-white shadow-md' : 'text-amber-200 hover:bg-amber-50'}`}
          title="מפה (עיפרון שחור)"
        >
          <Pencil size={20} />
        </button>
        <button 
          onClick={() => setTool('road')}
          className={`p-3 rounded-xl transition-all ${tool === 'road' ? 'bg-amber-800 text-white shadow-md' : 'text-amber-200 hover:bg-amber-50'}`}
          title="דרך (חום)"
        >
          <Route size={20} />
        </button>
        <button 
          onClick={() => setTool('river')}
          className={`p-3 rounded-xl transition-all ${tool === 'river' ? 'bg-amber-800 text-white shadow-md' : 'text-amber-200 hover:bg-amber-50'}`}
          title="נחל (כחול)"
        >
          <Waves size={20} />
        </button>
        <button 
          onClick={() => setTool('pool')}
          className={`p-3 rounded-xl transition-all ${tool === 'pool' ? 'bg-amber-800 text-white shadow-md' : 'text-amber-200 hover:bg-amber-50'}`}
          title="בריכה"
        >
          <CircleIcon size={20} />
        </button>
        <div className="h-px w-8 bg-amber-50" />
        <button 
          onClick={() => setTool('text')}
          className={`p-3 rounded-xl transition-all ${tool === 'text' ? 'bg-amber-800 text-white shadow-md' : 'text-amber-200 hover:bg-amber-50'}`}
          title="טקסט"
        >
          <LucideType size={20} />
        </button>
        <button 
          onClick={() => setTool('icon')}
          className={`p-3 rounded-xl transition-all ${tool === 'icon' ? 'bg-amber-800 text-white shadow-md' : 'text-amber-200 hover:bg-amber-50'}`}
          title="אייקונים"
        >
          <Home size={20} />
        </button>
        <div className="h-px w-8 bg-amber-50" />
        <label className="p-3 text-amber-200 hover:bg-amber-50 rounded-xl cursor-pointer transition-all" title="העלה מפה">
          <ImageIcon size={20} />
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>
        <button 
          onClick={deleteSelected}
          disabled={!selectedId}
          className="p-3 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl disabled:opacity-20 transition-all"
          title="מחק"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Tool Sub-options */}
        {tool === 'icon' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-amber-100 shadow-xl z-10 flex gap-2 overflow-x-auto max-w-[90vw]">
            {(['house', 'houses', 'tree', 'trees', 'mountain', 'valley', 'buildings', 'palace', 'bridge', 'animal'] as const).map(icon => (
              <button 
                key={icon}
                onClick={() => setSelectedIcon(icon)}
                className={`p-2 rounded-xl transition-all flex-shrink-0 ${selectedIcon === icon ? 'bg-amber-800 text-white' : 'text-amber-800 hover:bg-amber-100'}`}
                title={icon}
              >
                {icon === 'house' && <Home size={18} />}
                {icon === 'houses' && <div className="flex -space-x-1"><Home size={14} /><Home size={14} /></div>}
                {icon === 'tree' && <TreePine size={18} />}
                {icon === 'trees' && <Trees size={18} />}
                {icon === 'mountain' && <Mountain size={18} />}
                {icon === 'valley' && <div className="rotate-180"><Mountain size={18} /></div>}
                {icon === 'buildings' && <Building2 size={18} />}
                {icon === 'palace' && <Castle size={18} />}
                {icon === 'bridge' && <Square size={18} />}
                {icon === 'animal' && <Dog size={18} />}
              </button>
            ))}
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 bg-[#fdf6e3] cursor-crosshair overflow-hidden" ref={containerRef}>
          <Stage
            width={stageSize.width}
            height={stageSize.height}
            scaleX={scale}
            scaleY={scale}
            x={stagePos.x}
            y={stagePos.y}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onDblClick={handleDblClick}
            ref={stageRef}
            draggable={tool === 'select'}
            onDragEnd={(e) => {
              if (e.target === stageRef.current) {
                setStagePos({ x: e.target.x(), y: e.target.y() });
              }
            }}
          >
            <Layer>
              {/* Background Image */}
              {bgImage && (
                <KonvaImage 
                  image={bgImage} 
                  width={bgImage.width} 
                  height={bgImage.height} 
                  opacity={0.8}
                />
              )}

              {/* Grid (Optional, can add later) */}

              {/* Map Elements */}
              {map.elements.map((el) => {
                if (el.type === 'line') {
                  return (
                    <Line
                      key={el.id}
                      id={el.id}
                      points={el.points}
                      stroke={el.stroke}
                      strokeWidth={el.strokeWidth}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                      dash={el.id.includes('road') ? [10, 5] : undefined}
                      draggable={tool === 'select'}
                      onClick={() => tool === 'select' && setSelectedId(el.id)}
                      onDragEnd={handleDragEnd}
                    />
                  );
                }
                if (el.type === 'text') {
                  return (
                    <Group
                      key={el.id}
                      id={el.id}
                      x={el.x}
                      y={el.y}
                      draggable={tool === 'select'}
                      onClick={() => tool === 'select' && setSelectedId(el.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <Rect 
                        fill="white"
                        opacity={1}
                        cornerRadius={4}
                        width={(el.text?.length || 0) * (el.fontSize || 20) * 0.55 + 15}
                        height={(el.fontSize || 20) * 1.2}
                        x={-5}
                        y={-2}
                      />
                      <Text
                        text={el.text}
                        fontSize={el.fontSize}
                        fill={el.fill}
                        onDblClick={() => {
                          const newText = prompt('ערוך טקסט:', el.text);
                          if (newText !== null) {
                            onUpdateMap({
                              elements: map.elements.map(e => e.id === el.id ? { ...e, text: newText } : e)
                            });
                          }
                        }}
                      />
                    </Group>
                  );
                }
                if (el.type === 'icon') {
                  // Simple shapes for icons for now
                  if ((el as any).isPool) {
                    return (
                      <Group
                        key={el.id}
                        id={el.id}
                        x={el.x}
                        y={el.y}
                        draggable={tool === 'select'}
                        onClick={() => tool === 'select' && setSelectedId(el.id)}
                        onDragEnd={handleDragEnd}
                      >
                        <Circle
                          radius={30}
                          fill={el.fill || '#93c5fd'}
                          stroke={el.stroke || '#3b82f6'}
                          strokeWidth={el.strokeWidth || 2}
                          opacity={0.8}
                        />
                        <Line 
                          points={[-15, -5, 15, 5]}
                          stroke="white"
                          strokeWidth={2}
                          opacity={0.5}
                          tension={0.5}
                        />
                      </Group>
                    );
                  }
                  
                  // For other icons, use a group with a shape
                  return (
                    <Group
                      key={el.id}
                      id={el.id}
                      x={el.x}
                      y={el.y}
                      draggable={tool === 'select'}
                      onClick={() => tool === 'select' && setSelectedId(el.id)}
                      onDragEnd={handleDragEnd}
                    >
                      {el.iconType === 'house' && (
                        <Group>
                          <Rect width={20} height={15} y={10} fill={el.fill || '#amber-800'} cornerRadius={2} />
                          <Line points={[0, 10, 10, 0, 20, 10]} closed fill={el.fill || '#amber-800'} />
                        </Group>
                      )}
                      {el.iconType === 'houses' && (
                        <Group>
                          <Group x={0} y={5} scaleX={0.7} scaleY={0.7}>
                            <Rect width={20} height={15} y={10} fill={el.fill || '#amber-800'} cornerRadius={2} />
                            <Line points={[0, 10, 10, 0, 20, 10]} closed fill={el.fill || '#amber-800'} />
                          </Group>
                          <Group x={12} y={0} scaleX={0.8} scaleY={0.8}>
                            <Rect width={20} height={15} y={10} fill={el.fill || '#amber-800'} cornerRadius={2} />
                            <Line points={[0, 10, 10, 0, 20, 10]} closed fill={el.fill || '#amber-800'} />
                          </Group>
                          <Group x={8} y={12} scaleX={0.7} scaleY={0.7}>
                            <Rect width={20} height={15} y={10} fill={el.fill || '#amber-800'} cornerRadius={2} />
                            <Line points={[0, 10, 10, 0, 20, 10]} closed fill={el.fill || '#amber-800'} />
                          </Group>
                        </Group>
                      )}
                      {el.iconType === 'tree' && (
                        <Group>
                          <Rect x={8} y={15} width={4} height={10} fill="#92400e" />
                          <Line points={[0, 15, 10, 0, 20, 15]} closed fill="#059669" />
                        </Group>
                      )}
                      {el.iconType === 'mountain' && (
                        <Group>
                          <Line points={[0, 30, 20, 0, 40, 30]} closed fill={el.fill || '#92400e'} stroke="#4a4a4a" strokeWidth={1} />
                          <Line points={[15, 7.5, 20, 0, 25, 7.5]} closed fill="white" />
                        </Group>
                      )}
                      {el.iconType === 'valley' && (
                        <Group>
                          <Line points={[0, 0, 20, 30, 40, 0]} closed fill={el.fill || '#059669'} opacity={0.6} />
                          <Line points={[10, 0, 20, 15, 30, 0]} stroke="#4a4a4a" strokeWidth={1} tension={0.5} />
                        </Group>
                      )}
                      {el.iconType === 'trees' && (
                        <Group>
                          <Group x={0} y={5} scaleX={0.7} scaleY={0.7}>
                            <Rect x={8} y={15} width={4} height={10} fill="#92400e" />
                            <Line points={[0, 15, 10, 0, 20, 15]} closed fill="#059669" />
                          </Group>
                          <Group x={12} y={0} scaleX={0.8} scaleY={0.8}>
                            <Rect x={8} y={15} width={4} height={10} fill="#92400e" />
                            <Line points={[0, 15, 10, 0, 20, 15]} closed fill="#059669" />
                          </Group>
                          <Group x={8} y={12} scaleX={0.7} scaleY={0.7}>
                            <Rect x={8} y={15} width={4} height={10} fill="#92400e" />
                            <Line points={[0, 15, 10, 0, 20, 15]} closed fill="#059669" />
                          </Group>
                        </Group>
                      )}
                      {el.iconType === 'buildings' && (
                        <Group>
                          <Rect width={15} height={30} fill={el.fill || '#4a4a4a'} cornerRadius={1} />
                          <Rect x={20} width={15} height={40} fill={el.fill || '#4a4a4a'} cornerRadius={1} />
                          <Rect x={40} width={15} height={25} fill={el.fill || '#4a4a4a'} cornerRadius={1} />
                        </Group>
                      )}
                      {el.iconType === 'palace' && (
                        <Group>
                          <Rect width={60} height={30} y={10} fill={el.fill || '#amber-800'} cornerRadius={2} />
                          <Rect x={0} width={15} height={40} fill={el.fill || '#amber-800'} />
                          <Rect x={45} width={15} height={40} fill={el.fill || '#amber-800'} />
                          <Line points={[0, 0, 7.5, -10, 15, 0]} closed fill={el.fill || '#ef4444'} />
                          <Line points={[45, 0, 52.5, -10, 60, 0]} closed fill={el.fill || '#ef4444'} />
                        </Group>
                      )}
                      {el.iconType === 'bridge' && (
                        <Group>
                          <Line points={[0, 10, 50, 10]} stroke={el.fill || '#8b4513'} strokeWidth={4} tension={0.5} />
                          <Line points={[0, 10, 0, 25]} stroke={el.fill || '#8b4513'} strokeWidth={4} />
                          <Line points={[50, 10, 50, 25]} stroke={el.fill || '#8b4513'} strokeWidth={4} />
                        </Group>
                      )}
                      {el.iconType === 'animal' && (
                         <Group>
                            <Rect width={20} height={12} y={5} fill={el.fill || '#92400e'} cornerRadius={2} />
                            <Rect width={4} height={8} y={15} fill={el.fill || '#92400e'} />
                            <Rect x={16} width={4} height={8} y={15} fill={el.fill || '#92400e'} />
                            <Circle x={22} y={5} radius={6} fill={el.fill || '#92400e'} />
                            <Line points={[-2, 8, -8, 2]} stroke={el.fill || '#92400e'} strokeWidth={3} lineCap="round" tension={0.5} />
                         </Group>
                      )}
                    </Group>
                  );
                }
                return null;
              })}

              {/* Transformer */}
              {selectedId && (
                <Transformer
                  ref={transformerRef}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 5 || newBox.height < 5) {
                      return oldBox;
                    }
                    return newBox;
                  }}
                />
              )}
            </Layer>
          </Stage>
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-amber-100 shadow-xl z-10">
          <button onClick={zoomOut} className="p-2 text-amber-800 hover:bg-amber-100 rounded-xl transition-all"><Minus size={18} /></button>
          <div className="text-xs font-bold text-amber-900 w-12 text-center">{Math.round(scale * 100)}%</div>
          <button onClick={zoomIn} className="p-2 text-amber-800 hover:bg-amber-100 rounded-xl transition-all"><Plus size={18} /></button>
          <div className="h-4 w-px bg-amber-200 mx-1" />
          <button onClick={resetZoom} className="p-2 text-amber-800 hover:bg-amber-100 rounded-xl transition-all"><Maximize size={18} /></button>
        </div>

        {/* Properties Panel */}
        {selectedElement && (
          <div className="absolute top-6 right-6 w-64 bg-white border border-amber-100 rounded-[2rem] shadow-2xl p-6 z-10 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest">מאפיינים</h3>
              <button onClick={() => setSelectedId(null)} className="text-amber-300 hover:text-amber-800"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              {selectedElement.type === 'text' && (
                <div>
                  <label className="text-[10px] font-bold text-amber-900/50 uppercase mb-1 block">טקסט</label>
                  <input 
                    type="text"
                    value={selectedElement.text}
                    onChange={(e) => onUpdateMap({
                      elements: map.elements.map(el => el.id === selectedId ? { ...el, text: e.target.value } : el)
                    })}
                    className="w-full bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              )}

              {selectedElement.type !== 'line' && (
                <div>
                  <label className="text-[10px] font-bold text-amber-900/50 uppercase mb-1 block">צבע</label>
                  <div className="flex flex-wrap gap-2">
                    {['#4a4a4a', '#ef4444', '#3b82f6', '#059669', '#92400e', '#8b4513', '#93c5fd', '#000000'].map(color => (
                      <button 
                        key={color}
                        onClick={() => onUpdateMap({
                          elements: map.elements.map(el => el.id === selectedId ? { ...el, fill: color, stroke: color } : el)
                        })}
                        className={`w-6 h-6 rounded-full border-2 ${selectedElement.fill === color || selectedElement.stroke === color ? 'border-amber-800' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {selectedElement.type === 'text' && (
                <div>
                  <label className="text-[10px] font-bold text-amber-900/50 uppercase mb-1 block">גודל גופן</label>
                  <input 
                    type="range"
                    min="10"
                    max="100"
                    value={selectedElement.fontSize || 20}
                    onChange={(e) => onUpdateMap({
                      elements: map.elements.map(el => el.id === selectedId ? { ...el, fontSize: parseInt(e.target.value) } : el)
                    })}
                    className="w-full accent-amber-800"
                  />
                </div>
              )}

              <button 
                onClick={deleteSelected}
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all mt-4"
              >
                <Trash2 size={14} />
                <span>מחק אלמנט</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorldMapEditor;
