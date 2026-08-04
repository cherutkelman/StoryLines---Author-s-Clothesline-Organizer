
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { QuestionnaireEntry, CharacterMapConnection } from '../types';
import { Plus, Link as LinkIcon, Trash2, User, UserPlus, Check, Image as ImageIcon, X, Move, Edit2, Download, ZoomIn, ZoomOut, RotateCcw, Grab } from 'lucide-react';
import html2canvas from 'html2canvas';
import { isElectron, openDesktopImageDialog } from '../src/platform';
import { compressImageFile } from '../src/image-utils';
import { createCharacterEntry } from '../src/characters/characterFactory';

interface CharacterMapProps {
  characters: QuestionnaireEntry[];
  bookCharacters: QuestionnaireEntry[];
  connections: CharacterMapConnection[];
  onUpdateCharacters: (chars: QuestionnaireEntry[]) => void;
  onUpdateConnections: (connections: CharacterMapConnection[]) => void;
  onAddExistingCharacters: (characterIds: string[]) => void;
  onRemoveCharacterFromMap: (characterId: string) => void;
}

const CharacterMap: React.FC<CharacterMapProps> = ({
  characters,
  bookCharacters,
  connections,
  onUpdateCharacters,
  onUpdateConnections,
  onAddExistingCharacters,
  onRemoveCharacterFromMap,
}) => {
  const [tool, setTool] = useState<'move' | 'link' | 'pan'>('move');
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPos, setStartPanPos] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [draggingLabelId, setDraggingLabelId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [isExistingCharacterDialogOpen, setIsExistingCharacterDialogOpen] = useState(false);
  const [selectedExistingCharacterIds, setSelectedExistingCharacterIds] = useState<string[]>([]);
  const [exportBounds, setExportBounds] = useState<{
    minX: number;
    minY: number;
    width: number;
    height: number;
    contentWidth: number;
    contentHeight: number;
  } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const touchGestureRef = useRef<{
    mode: 'pan' | 'pinch' | null;
    lastX: number;
    lastY: number;
    startDistance: number;
    startZoom: number;
    startPan: { x: number; y: number };
    startCenter: { x: number; y: number };
  }>({
    mode: null,
    lastX: 0,
    lastY: 0,
    startDistance: 0,
    startZoom: 1,
    startPan: { x: 0, y: 0 },
    startCenter: { x: 0, y: 0 }
  });

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
  const localCharactersRef = useRef<QuestionnaireEntry[]>(characters);
  const localConnectionsRef = useRef<CharacterMapConnection[]>(connections);

  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const getTouchCenter = (touches: React.TouchList) => ({
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2
  });

  const getCanvasPoint = (clientX: number, clientY: number, scale = zoom, pan = panOffset) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left) / scale - pan.x,
      y: (clientY - rect.top) / scale - pan.y
    };
  };

  const moveNodeToPoint = (id: string, clientX: number, clientY: number) => {
    const point = getCanvasPoint(clientX, clientY);
    setLocalCharacters(prev => {
      const next = prev.map(n => n.id === id ? { ...n, x: point.x, y: point.y } : n);
      localCharactersRef.current = next;
      return next;
    });
  };

  const getConnectionLabelPoint = (conn: CharacterMapConnection, fromNode: QuestionnaireEntry, toNode: QuestionnaireEntry) => {
    const t = conn.labelPosition ?? 0.5;
    const x1 = fromNode.x ?? 0;
    const y1 = fromNode.y ?? 0;
    const x2 = toNode.x ?? 0;
    const y2 = toNode.y ?? 0;
    const baseX = x1 + (x2 - x1) * t;
    const baseY = y1 + (y2 - y1) * t;

    return {
      x: baseX + (conn.labelOffset?.x ?? 0),
      y: baseY + (conn.labelOffset?.y ?? 0),
      baseX,
      baseY
    };
  };

  const moveConnectionLabelToPoint = (id: string, clientX: number, clientY: number) => {
    const point = getCanvasPoint(clientX, clientY);
    setLocalConnections(prev => {
      const next = prev.map(conn => {
        if (conn.id !== id) return conn;
        const fromNode = localCharactersRef.current.find(n => n.id === conn.fromId);
        const toNode = localCharactersRef.current.find(n => n.id === conn.toId);
        if (!fromNode || !toNode) return conn;
        const labelPoint = getConnectionLabelPoint(conn, fromNode, toNode);

        return {
          ...conn,
          labelOffset: {
            x: point.x - labelPoint.baseX,
            y: point.y - labelPoint.baseY
          }
        };
      });
      localConnectionsRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    if (!draggingNodeId && !draggingLabelId) {
      setLocalCharacters(characters);
      localCharactersRef.current = characters;
    }
  }, [characters, draggingNodeId, draggingLabelId]);

  useEffect(() => {
    localCharactersRef.current = localCharacters;
  }, [localCharacters]);

  useEffect(() => {
    if (!draggingNodeId && !draggingLabelId) {
      setLocalConnections(connections);
      localConnectionsRef.current = connections;
    }
  }, [connections, draggingNodeId, draggingLabelId]);

  useEffect(() => {
    localConnectionsRef.current = localConnections;
  }, [localConnections]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (tool === 'move') {
      setSelectedNodeId(null);
    }
  };

  const addNode = (e: React.MouseEvent) => {
    const newNode = createCharacterEntry({ questionnaireVisibility: 'hidden' });
    onUpdateCharacters([...characters, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const startNodeInteraction = (id: string) => {
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

  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    startNodeInteraction(id);
  };

  const handleNodeTouchStart = (e: React.TouchEvent, id: string) => {
    if (isExporting) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, label')) return;
    e.stopPropagation();
    if (e.touches.length !== 1) return;
    e.preventDefault();
    startNodeInteraction(id);
  };

  const handleNodeTouchMove = (e: React.TouchEvent, id: string) => {
    if (isExporting || draggingNodeId !== id || tool !== 'move' || e.touches.length !== 1) return;
    e.stopPropagation();
    e.preventDefault();
    const touch = e.touches[0];
    moveNodeToPoint(id, touch.clientX, touch.clientY);
  };

  const handleNodeTouchEnd = (e: React.TouchEvent, id: string) => {
    if (draggingNodeId !== id) return;
    e.stopPropagation();
    onUpdateCharacters(localCharactersRef.current);
    setDraggingNodeId(null);
    touchGestureRef.current.mode = null;
  };

  const handleLabelTouchStart = (e: React.TouchEvent, id: string) => {
    if (isExporting || e.touches.length !== 1) return;
    e.stopPropagation();
    e.preventDefault();
    setDraggingLabelId(id);
  };

  const handleLabelTouchMove = (e: React.TouchEvent, id: string) => {
    if (isExporting || draggingLabelId !== id || e.touches.length !== 1) return;
    e.stopPropagation();
    e.preventDefault();
    const touch = e.touches[0];
    moveConnectionLabelToPoint(id, touch.clientX, touch.clientY);
  };

  const handleLabelTouchEnd = (e: React.TouchEvent, id: string) => {
    if (draggingLabelId !== id) return;
    e.stopPropagation();
    onUpdateConnections(localConnectionsRef.current);
    setDraggingLabelId(null);
    touchGestureRef.current.mode = null;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / zoom - panOffset.x;
    const y = (e.clientY - rect.top) / zoom - panOffset.y;

    if (isPanning && tool === 'pan') {
      const dx = (e.clientX - startPanPos.x) / zoom;
      const dy = (e.clientY - startPanPos.y) / zoom;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setStartPanPos({ x: e.clientX, y: e.clientY });
      return;
    }

    if (draggingNodeId && tool === 'move') {
      setLocalCharacters(prev => {
        const next = prev.map(n => n.id === draggingNodeId ? { ...n, x, y } : n);
        localCharactersRef.current = next;
        return next;
      });
    } else if (draggingLabelId) {
      moveConnectionLabelToPoint(draggingLabelId, e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (draggingNodeId) {
      onUpdateCharacters(localCharactersRef.current);
    }
    if (draggingLabelId) {
      onUpdateConnections(localConnectionsRef.current);
    }
    setDraggingNodeId(null);
    setDraggingLabelId(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isExporting) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, label')) return;

    if (e.touches.length === 2) {
      e.preventDefault();
      touchGestureRef.current = {
        mode: 'pinch',
        lastX: 0,
        lastY: 0,
        startDistance: getTouchDistance(e.touches),
        startZoom: zoom,
        startPan: panOffset,
        startCenter: getTouchCenter(e.touches)
      };
      return;
    }

    if (e.touches.length === 1) {
      e.preventDefault();
      touchGestureRef.current = {
        ...touchGestureRef.current,
        mode: 'pan',
        lastX: e.touches[0].clientX,
        lastY: e.touches[0].clientY
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isExporting) return;
    const gesture = touchGestureRef.current;

    if (gesture.mode === 'pinch' && e.touches.length === 2) {
      e.preventDefault();
      const center = getTouchCenter(e.touches);
      const distance = getTouchDistance(e.touches);
      const nextZoom = Math.min(Math.max(0.2, gesture.startZoom * (distance / Math.max(gesture.startDistance, 1))), 3);
      const anchor = getCanvasPoint(gesture.startCenter.x, gesture.startCenter.y, gesture.startZoom, gesture.startPan);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      setZoom(nextZoom);
      setPanOffset({
        x: (center.x - rect.left) / nextZoom - anchor.x,
        y: (center.y - rect.top) / nextZoom - anchor.y
      });
      return;
    }

    if (gesture.mode === 'pan' && e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      const dx = (touch.clientX - gesture.lastX) / zoom;
      const dy = (touch.clientY - gesture.lastY) / zoom;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      touchGestureRef.current = {
        ...gesture,
        lastX: touch.clientX,
        lastY: touch.clientY
      };
    }
  };

  const handleTouchEnd = () => {
    touchGestureRef.current.mode = null;
  };

  const deleteNode = (id: string) => {
    if (!confirm('להסיר את הדמות מהמפה? הדמות תישאר ברשימת הדמויות של הספר.')) return;
    onRemoveCharacterFromMap(id);
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
    
    if (isElectron) {
      console.log('Renderer: Electron environment detected, using IPC dialog');
      try {
        const dataUrl = await openDesktopImageDialog();
        
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
      try {
        const { dataUrl } = await compressImageFile(file, 900, 0.76);
        updateNode(id, { imageUrl: dataUrl });
      } catch (error) {
        console.error('Renderer: Image compression failed:', error);
      } finally {
        if (e?.target) e.target.value = '';
      }
    } else {
      console.log('Renderer: No file selected in standard input');
    }
  };

  const handleRemoveImage = (id: string) => {
    updateNode(id, { imageUrl: undefined });
  };

  const getMapExportBounds = () => {
    const padding = 160;
    const nodeHalfWidth = 100;
    const nodeHalfHeight = 120;
    const labelHalfWidth = 160;
    const labelHalfHeight = 90;
    const points: { minX: number; minY: number; maxX: number; maxY: number }[] = [];

    localCharacters.forEach((node) => {
      const x = node.x ?? 200;
      const y = node.y ?? 200;
      points.push({
        minX: x - nodeHalfWidth,
        minY: y - nodeHalfHeight,
        maxX: x + nodeHalfWidth,
        maxY: y + nodeHalfHeight
      });
    });

    localConnections.forEach((conn) => {
      const fromNode = localCharacters.find(n => n.id === conn.fromId);
      const toNode = localCharacters.find(n => n.id === conn.toId);
      if (!fromNode || !toNode) return;

      const x1 = fromNode.x ?? 0;
      const y1 = fromNode.y ?? 0;
      const x2 = toNode.x ?? 0;
      const y2 = toNode.y ?? 0;
      const labelPoint = getConnectionLabelPoint(conn, fromNode, toNode);

      points.push({
        minX: Math.min(x1, x2, labelPoint.x - labelHalfWidth),
        minY: Math.min(y1, y2, labelPoint.y - labelHalfHeight),
        maxX: Math.max(x1, x2, labelPoint.x + labelHalfWidth),
        maxY: Math.max(y1, y2, labelPoint.y + labelHalfHeight)
      });
    });

    if (points.length === 0) {
      const rect = canvasRef.current?.getBoundingClientRect();
      return {
        minX: 0,
        minY: 0,
        width: Math.max(rect?.width || 800, 800),
        height: Math.max(rect?.height || 600, 600),
        contentWidth: Math.max(rect?.width || 800, 800),
        contentHeight: Math.max(rect?.height || 600, 600)
      };
    }

    const minX = Math.floor(Math.min(...points.map(point => point.minX)) - padding);
    const minY = Math.floor(Math.min(...points.map(point => point.minY)) - padding);
    const maxX = Math.ceil(Math.max(...points.map(point => point.maxX)) + padding);
    const maxY = Math.ceil(Math.max(...points.map(point => point.maxY)) + padding);

    return {
      minX,
      minY,
      width: Math.max(maxX - minX, 800),
      height: Math.max(maxY - minY, 600),
      contentWidth: Math.max(maxX + padding, 800),
      contentHeight: Math.max(maxY + padding, 600)
    };
  };

  const exportAsImage = async () => {
    if (!canvasRef.current) return;
    
    const bounds = getMapExportBounds();
    setExportBounds(bounds);
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
        width: bounds.width,
        height: bounds.height,
        windowWidth: bounds.width,
        windowHeight: bounds.height,
      });
      
      const link = document.createElement('a');
      link.download = `character-map-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
    } finally {
      setIsExporting(false);
      setExportBounds(null);
    }
  };

  const selectedNode = characters.find(n => n.id === selectedNodeId);
  const mapCharacterIds = useMemo(() => new Set(characters.map(character => character.id)), [characters]);
  const availableCharacters = useMemo(
    () => bookCharacters.filter(character => !mapCharacterIds.has(character.id)),
    [bookCharacters, mapCharacterIds]
  );

  useEffect(() => {
    if (!isExistingCharacterDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsExistingCharacterDialogOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExistingCharacterDialogOpen]);

  const openExistingCharacterDialog = () => {
    setSelectedExistingCharacterIds([]);
    setIsExistingCharacterDialogOpen(true);
  };

  const toggleExistingCharacter = (characterId: string) => {
    setSelectedExistingCharacterIds(current =>
      current.includes(characterId)
        ? current.filter(id => id !== characterId)
        : [...current, characterId]
    );
  };

  const confirmExistingCharacters = () => {
    if (selectedExistingCharacterIds.length === 0) return;
    onAddExistingCharacters(selectedExistingCharacterIds);
    setIsExistingCharacterDialogOpen(false);
    setSelectedExistingCharacterIds([]);
  };

  return (
    <div className="h-full flex flex-col relative select-none bg-[var(--theme-bg)]">
      {/* Tool Bar */}
      {!isExporting && (
        <div className="character-map-toolbar absolute top-4 left-1/2 -translate-x-1/2 z-30 max-w-[calc(100vw-1rem)] overflow-x-auto bg-[var(--theme-card)]/80 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-[var(--theme-border)] flex items-center gap-2 whitespace-nowrap">
          <button 
            onClick={() => setTool('move')}
            className={`hidden md:flex p-3 rounded-xl transition-all items-center gap-2 ${tool === 'move' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-md' : 'text-[var(--theme-primary)]/60 hover:bg-[var(--theme-secondary)]'}`}
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
          <div className="hidden md:block w-px h-6 bg-[var(--theme-border)] mx-1" />
          <div className="hidden md:flex items-center gap-1 bg-[var(--theme-secondary)] rounded-xl p-1 border border-[var(--theme-border)]/50">
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
              onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }}
              className="p-2 text-[var(--theme-primary)] hover:bg-[var(--theme-card)] rounded-lg transition-all"
              title="איפוס זום ומיקום"
            >
              <RotateCcw size={14} />
            </button>
          </div>
          <div className="hidden md:block w-px h-6 bg-[var(--theme-border)] mx-1" />
          <button 
            onClick={() => setTool('pan')}
            className={`hidden md:flex p-3 rounded-xl transition-all items-center gap-2 ${tool === 'pan' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-md' : 'text-[var(--theme-primary)]/60 hover:bg-[var(--theme-secondary)]'}`}
            title="הזזת כל המפה"
          >
            <Grab size={18} />
            <span className="text-xs font-bold">הזזת מפה</span>
          </button>
          <div className="hidden md:block w-px h-6 bg-[var(--theme-border)] mx-1" />
          <button 
            onClick={addNode}
            className="p-3 bg-[var(--theme-secondary)] text-[var(--theme-primary)] rounded-xl hover:opacity-80 transition-all flex items-center gap-2"
          >
            <Plus size={18} />
            <span className="text-xs font-bold">דמות חדשה</span>
          </button>
          <button
            onClick={openExistingCharacterDialog}
            className="p-3 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-xl hover:opacity-90 transition-all flex items-center gap-2 min-h-11"
            aria-label="הוספת דמות קיימת"
          >
            <UserPlus size={18} />
            <span className="text-xs font-bold">הוספת דמות קיימת</span>
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

      {isExistingCharacterDialogOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setIsExistingCharacterDialogOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="existing-character-dialog-title"
            dir="rtl"
            className="w-full max-w-xl max-h-[85vh] bg-[var(--theme-card)] rounded-[2rem] border border-[var(--theme-border)] shadow-2xl flex flex-col overflow-hidden text-right select-text"
          >
            <div className="flex items-center justify-between gap-4 p-5 sm:p-7 border-b border-[var(--theme-border)]/50">
              <div>
                <h2 id="existing-character-dialog-title" className="text-xl sm:text-2xl font-bold text-[var(--theme-primary)]">הוספת דמות קיימת</h2>
                <p className="mt-1 text-xs text-[var(--theme-primary)]/60">בחרי דמות אחת או כמה דמויות להצבה במפה הזאת.</p>
              </div>
              <button
                onClick={() => setIsExistingCharacterDialogOpen(false)}
                className="p-3 rounded-xl text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] min-w-11 min-h-11 flex items-center justify-center"
                aria-label="סגירת חלון הוספת דמות קיימת"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {bookCharacters.length === 0 ? (
                <p className="py-12 text-center font-bold text-[var(--theme-primary)]/55">עדיין אין דמויות שאפשר להוסיף.</p>
              ) : availableCharacters.length === 0 ? (
                <p className="py-12 text-center font-bold text-[var(--theme-primary)]/55">כל הדמויות בספר כבר נמצאות במפה הזאת.</p>
              ) : (
                <div className="space-y-3">
                  {availableCharacters.map(character => {
                    const isSelected = selectedExistingCharacterIds.includes(character.id);
                    return (
                      <button
                        key={character.id}
                        type="button"
                        onClick={() => toggleExistingCharacter(character.id)}
                        aria-pressed={isSelected}
                        className={`w-full min-h-16 p-3 rounded-2xl border-2 flex items-center gap-4 text-right transition-all ${isSelected ? 'border-[var(--theme-primary)] bg-[var(--theme-secondary)]' : 'border-[var(--theme-border)]/50 hover:border-[var(--theme-primary)]/40'}`}
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-[var(--theme-secondary)] flex items-center justify-center shrink-0 border border-[var(--theme-border)]">
                          {character.imageUrl ? (
                            <img src={character.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={24} className="text-[var(--theme-primary)]/35" />
                          )}
                        </div>
                        <span className="flex-1 font-bold text-[var(--theme-primary)] truncate">{character.name}</span>
                        <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'bg-[var(--theme-primary)] border-[var(--theme-primary)] text-[var(--theme-card)]' : 'border-[var(--theme-border)]'}`}>
                          {isSelected && <Check size={17} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 border-t border-[var(--theme-border)]/50 flex flex-col-reverse sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setIsExistingCharacterDialogOpen(false)}
                className="px-5 py-3 min-h-11 rounded-xl border border-[var(--theme-border)] text-[var(--theme-primary)] font-bold hover:bg-[var(--theme-secondary)]"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={confirmExistingCharacters}
                disabled={selectedExistingCharacterIds.length === 0}
                className="flex-1 px-5 py-3 min-h-11 rounded-xl bg-[var(--theme-primary)] text-[var(--theme-card)] font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
              >
                הוספת {selectedExistingCharacterIds.length || ''} דמויות למפה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <div 
        ref={canvasRef}
        className={isExporting ? "relative overflow-visible" : "flex-1 overflow-hidden relative"}
        style={isExporting && exportBounds ? {
          width: exportBounds.width,
          height: exportBounds.height,
          touchAction: 'none'
        } : { touchAction: 'none' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseDown={(e) => {
          if (tool === 'pan') {
            setIsPanning(true);
            setStartPanPos({ x: e.clientX, y: e.clientY });
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={handleCanvasClick}
        >
        <div 
          className="absolute left-0 top-0 transition-transform duration-75 ease-out origin-top-left"
          style={isExporting && exportBounds ? {
            transform: `translate(${-exportBounds.minX}px, ${-exportBounds.minY}px)`,
            width: exportBounds.contentWidth,
            height: exportBounds.contentHeight
          } : { 
            transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`, 
            width: `${100/zoom}%`, 
            height: `${100/zoom}%` 
          }}
        >
          <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible">
            {localConnections.map(conn => {
            const fromNode = localCharacters.find(n => n.id === conn.fromId);
            const toNode = localCharacters.find(n => n.id === conn.toId);
            if (!fromNode || !toNode) return null;
            const labelPoint = getConnectionLabelPoint(conn, fromNode, toNode);
            const x1 = fromNode.x ?? 0;
            const y1 = fromNode.y ?? 0;
            const x2 = toNode.x ?? 0;
            const y2 = toNode.y ?? 0;
            const curvePath = `M ${x1} ${y1} C ${labelPoint.x} ${labelPoint.y}, ${labelPoint.x} ${labelPoint.y}, ${x2} ${y2}`;

            return (
              <g key={conn.id}>
                <path
                  d={curvePath}
                  fill="none"
                  stroke="currentColor" 
                  className="text-[var(--theme-primary)]"
                  strokeWidth="2" 
                  strokeDasharray="5,5" 
                  strokeLinecap="round"
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

          const labelPoint = getConnectionLabelPoint(conn, fromNode, toNode);

          return (
            <div 
              key={`${conn.id}-text`}
              className="absolute pointer-events-auto z-10 group"
              style={{ left: labelPoint.x, top: labelPoint.y, transform: 'translate(-50%, -50%)' }}
            >
              <div className="relative flex flex-col items-center">
                <div 
                  className="cursor-grab active:cursor-grabbing p-1 text-[var(--theme-accent)]/50 hover:text-[var(--theme-accent)] transition-colors"
                  onMouseDown={(e) => {
                    if (isExporting) return;
                    e.stopPropagation();
                    setDraggingLabelId(conn.id);
                  }}
                  onTouchStart={(e) => handleLabelTouchStart(e, conn.id)}
                  onTouchMove={(e) => handleLabelTouchMove(e, conn.id)}
                  onTouchEnd={(e) => handleLabelTouchEnd(e, conn.id)}
                  onTouchCancel={(e) => handleLabelTouchEnd(e, conn.id)}
                >
                  {!isExporting && <Move size={14} />}
                </div>
                {isExporting ? (
                  <div className="font-sans text-[12px] font-medium min-w-[60px] max-w-[120px] bg-white/90 border border-slate-200 rounded-lg p-2 shadow-md text-center leading-snug whitespace-pre-wrap text-slate-900">
                    {conn.description}
                  </div>
                ) : (
                  <textarea 
                    className="font-sans text-[12px] font-medium min-w-[60px] max-w-[120px] bg-white/90 border border-slate-200 rounded-lg p-1.5 shadow-md focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-none transition-all text-center leading-snug overflow-visible text-slate-900"
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
            onTouchStart={(e) => handleNodeTouchStart(e, node.id)}
            onTouchMove={(e) => handleNodeTouchMove(e, node.id)}
            onTouchEnd={(e) => handleNodeTouchEnd(e, node.id)}
            onTouchCancel={(e) => handleNodeTouchEnd(e, node.id)}
          >
            <div className={`w-16 h-16 rounded-full border-2 shadow-lg overflow-hidden bg-[var(--theme-card)] flex items-center justify-center transition-all ${selectedNodeId === node.id ? 'border-[var(--theme-accent)] ring-2 ring-[var(--theme-accent)]/20' : 'border-[var(--theme-border)] hover:border-[var(--theme-accent)]/50'}`}>
              {node.imageUrl ? (
                <img
                  src={node.imageUrl}
                  alt={node.name}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  className="w-full h-full object-cover select-none"
                />
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
                  title="הסרת דמות מהמפה"
                  aria-label="הסרת דמות מהמפה"
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
