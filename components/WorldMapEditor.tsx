import React, { useState, useRef, useEffect } from 'react';
import { 
  Stage, Layer, Rect, Circle, Ellipse, Line, Text, Image as KonvaImage, Group, Transformer, Label, Tag
} from 'react-konva';
import { 
  Home, Trees, Mountain, MapPin, Type as LucideType, 
  Trash2, Undo, Redo, Upload, MousePointer2, Pencil, 
  Waves, Route, Circle as CircleIcon, Square, Eraser, Triangle,
  ChevronRight, ChevronLeft, Plus, Minus, Maximize,
  Image as ImageIcon, X, Building2, Castle, Dog, TreePine, Download,
  TrainFront, Navigation, Flag, Hand, Cat, Bird, Fish, Spline,
  Leaf, Construction, Truck, Brush, PaintBucket,
  ChevronUp, ChevronDown, ChevronsUp, ChevronsDown
} from 'lucide-react';
import { WorldMap, MapElement, QuestionnaireEntry, PixelEraserStroke } from '../types';
import useImage from 'use-image';

interface WorldMapEditorProps {
  map: WorldMap;
  places: QuestionnaireEntry[];
  onUpdateMap: (updates: Partial<WorldMap>) => void;
}

const MAP_TEXT_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Segoe UI", Arial, sans-serif';

type WorldMapTool =
  'select' | 'pan' | 'pencil' | 'road' | 'river' | 'pool' | 'railroad' | 'highway' |
  'border' | 'text' | 'icon' | 'place' | 'brush' | 'area' | 'circle' | 'rect' |
  'triangle' | 'line' | 'eraser' | 'fill';

const ICON_COMPONENTS: Record<string, any> = {
  house: Home,
  houses: Home,
  tree: Trees,
  trees: Trees,
  mountain: Mountain,
  valley: Mountain,
  buildings: Building2,
  palace: Castle,
  bridge: Spline,
  fish: Fish,
  horse: Dog,
  snake: Spline,
  cattle: Dog,
  sheep: Dog,
  eagle: Bird,
  wildcat: Cat,
  flower: Leaf,
  wave: Waves,
  village: Home,
  camp: Home,
  temple: Castle,
  hotel: Building2,
  hospital: Building2,
  factory: Building2,
  park: Trees,
  city: Building2,
  car: Truck,
  bus: Truck,
  ambulance: Truck,
  fire_truck: Truck,
  truck: Truck,
  tractor: Truck,
  train: TrainFront,
  plane: Navigation,
  ship: Waves,
  desert: Mountain,
  beach: Waves,
  rainbow: Waves,
  fire: Waves,
  field: Leaf,
  traffic_light: Construction,
  barrier: Construction,
  cat: Cat,
  bird: Bird,
  market: Construction
};

const getDefaultMapIconSize = (iconType?: string) => {
  if (iconType === 'mountain') return 40;
  if (iconType === 'flower' || iconType === 'market') return 25;
  return 30;
};

interface ErasableElementProps {
  element: MapElement;
  tool: WorldMapTool;
  children: React.ReactNode;
  onDragStart: (e: any) => void;
  onDragMove: (e: any) => void;
  onDragEnd: (e: any) => void;
  onDblClick: (e: any) => void;
}

const ErasableElement = ({
  element,
  tool,
  children,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDblClick
}: ErasableElementProps) => {
  const groupRef = useRef<any>(null);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    group.clearCache();
    const rect = group.getClientRect({
      skipTransform: true,
      skipShadow: true
    });

    const padding = 50;
    const width = Math.max(rect.width + padding * 2, 1);
    const height = Math.max(rect.height + padding * 2, 1);
    const cachePixelRatio = Math.min(3, Math.max(1, window.devicePixelRatio || 1));

    group.cache({
      x: rect.x - padding,
      y: rect.y - padding,
      width,
      height,
      pixelRatio: cachePixelRatio
    });
    group.getLayer()?.batchDraw();
  }, [
    element.erasers,
    element.points,
    element.width,
    element.height,
    element.radius,
    element.radiusX,
    element.radiusY,
    element.text,
    element.fontSize,
    element.iconSize,
    element.fill,
    element.stroke,
    element.strokeWidth,
    element.imageUrl,
    element.iconType,
    element.opacity
  ]);

  return (
    <Group
      ref={groupRef}
      id={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation || 0}
      scaleX={element.scaleX || 1}
      scaleY={element.scaleY || 1}
      draggable={tool === 'select'}
      onDblClick={onDblClick}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      name="erasable-element"
    >
      {children}

      {(element.erasers || []).map(stroke => (
        <Line
          key={stroke.id}
          points={stroke.points}
          stroke="#000000"
          strokeWidth={stroke.strokeWidth}
          opacity={1}
          lineCap={stroke.lineCap || 'round'}
          lineJoin="round"
          globalCompositeOperation="destination-out"
          listening={false}
        />
      ))}
    </Group>
  );
};

const MapImage = ({ el, tool, onDblClick, onDragStart, onDragMove, onDragEnd }: any) => {
  const [image] = useImage(el.imageUrl || '');
  if (!image) return null;
  
  return (
    <ErasableElement
      element={el}
      tool={tool}
      onDblClick={onDblClick}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
    >
      <KonvaImage
        image={image}
        x={0}
        y={0}
        width={image.width}
        height={image.height}
        name="image"
      />
    </ErasableElement>
  );
};

const WorldMapEditor: React.FC<WorldMapEditorProps> = ({ map, places = [], onUpdateMap }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'select' | 'pan' | 'icons' | 'paint' | 'extras'>('select');
  const [tool, setTool] = useState<WorldMapTool>('select');
  const [isShapeFilled, setIsShapeFilled] = useState(true);
  const [showPathTools, setShowPathTools] = useState(false);
  const [iconCategory, setIconCategory] = useState<'nature' | 'construction' | 'transportation' | 'animals'>('nature');
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState(4);
  const [currentColor, setCurrentColor] = useState('#78350f');
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [selectedIcon, setSelectedIcon] = useState<'house' | 'houses' | 'tree' | 'trees' | 'mountain' | 'valley' | 'buildings' | 'palace' | 'bridge' | 'fish' | 'horse' | 'snake' | 'cattle' | 'sheep' | 'eagle' | 'wildcat' | 'flower' | 'wave' | 'village' | 'camp' | 'temple' | 'hotel' | 'hospital' | 'factory' | 'park' | 'city' | 'car' | 'bus' | 'ambulance' | 'fire_truck' | 'truck' | 'tractor' | 'train' | 'plane' | 'ship' | 'desert' | 'beach' | 'rainbow' | 'fire' | 'field' | 'traffic_light' | 'barrier' | 'cat' | 'bird' | 'market'>('house');
  const [showPlacesList, setShowPlacesList] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState('');
  const [editingTextPos, setEditingTextPos] = useState<{ x: number, y: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [previewPos, setPreviewPos] = useState<{x: number, y: number} | null>(null);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [bgImage] = useImage(map.backgroundImage || '');
  const [stageSize, setStageSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [lastPlacedPos, setLastPlacedPos] = useState<{ x: number, y: number } | null>(null);
  const [dragStartPos, setDragStartPos] = useState<Record<string, { x: number, y: number }>>({});

  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const uiLayerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeEraserElementIdRef = useRef<string | null>(null);
  const activeEraserStrokeIdRef = useRef<string | null>(null);

  const getRelativePointerPosition = (stage: any) => {
    const pointer = stage.getPointerPosition();
    if (!pointer) return { x: 0, y: 0 };
    return {
      x: (pointer.x - stage.x()) / stage.scaleX(),
      y: (pointer.y - stage.y()) / stage.scaleY(),
    };
  };

  const resolveElementId = (target: any) => {
    let node = target;

    while (node) {
      const id = node.id?.();
      if (id && localElementsRef.current.some(el => el.id === id)) {
        return id;
      }
      node = node.getParent?.();
    }

    return null;
  };

  const getPointerOnElement = (elementId: string, stage: any) => {
    const node = stage.findOne('#' + elementId);
    const pointer = stage.getPointerPosition();

    if (!node || !pointer) return null;

    const transform = node.getAbsoluteTransform().copy();
    transform.invert();
    return transform.point(pointer);
  };

  const getElementAdjustedStrokeWidth = (elementId: string, stage: any) => {
    const node = stage.findOne('#' + elementId);
    if (!node) return currentStrokeWidth;

    const absoluteScale = node.getAbsoluteScale();
    const stageScaleX = stage.scaleX() || 1;
    const stageScaleY = stage.scaleY() || 1;
    const elementScaleX = Math.abs(absoluteScale.x / stageScaleX) || 1;
    const elementScaleY = Math.abs(absoluteScale.y / stageScaleY) || 1;
    const elementScale = (elementScaleX + elementScaleY) / 2 || 1;

    return currentStrokeWidth / elementScale;
  };

  const getIconFill = (icon: string) => {
    if (['tree', 'trees', 'flower', 'park', 'field'].includes(icon)) return '#059669';
    if (['mountain', 'valley', 'temple', 'palace', 'desert'].includes(icon)) return '#92400e';
    if (['wave', 'ship', 'beach'].includes(icon)) return '#3b82f6';
    if (['factory', 'hospital', 'hotel', 'city', 'bridge'].includes(icon)) return '#4a4a4a';
    if (['fire_truck', 'ambulance', 'fire'].includes(icon)) return '#ef4444';
    if (['traffic_light', 'barrier'].includes(icon)) return '#f59e0b';
    if (['house', 'village', 'camp'].includes(icon)) return '#b45309';
    return '#8b4513';
  };

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

  const [localElements, setLocalElements] = useState<MapElement[]>(map.elements);
  const localElementsRef = useRef<MapElement[]>(map.elements);
  const [history, setHistory] = useState<MapElement[][]>([map.elements]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoingRedoing = useRef(false);

  const undo = () => {
    if (historyIndex > 0) {
      isUndoingRedoing.current = true;
      const previous = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onUpdateMap({ elements: previous });
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      isUndoingRedoing.current = true;
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onUpdateMap({ elements: next });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        deleteSelected();
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
          e.preventDefault();
        } else if (e.key === 'y' || e.key === 'Y') {
          redo();
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, map.elements, history, historyIndex]);

  useEffect(() => {
    if (isUndoingRedoing.current) {
      isUndoingRedoing.current = false;
      return;
    }

    const currentSnapshot = map.elements;
    const currentSerialized = JSON.stringify(currentSnapshot);
    const historySerialized = JSON.stringify(history[historyIndex]);

    if (currentSerialized !== historySerialized) {
      // Check if it's an undo/redo (in case it was triggered by parent or something else)
      const isUndo = historyIndex > 0 && currentSerialized === JSON.stringify(history[historyIndex - 1]);
      const isRedo = historyIndex < history.length - 1 && currentSerialized === JSON.stringify(history[historyIndex + 1]);

      if (isUndo) {
        setHistoryIndex(historyIndex - 1);
      } else if (isRedo) {
        setHistoryIndex(historyIndex + 1);
      } else {
        // New action
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(currentSnapshot);
        if (newHistory.length > 50) newHistory.shift();
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    }
  }, [map.elements]);

  useEffect(() => {
    if (selectedIds.length > 0 && transformerRef.current) {
      const stage = stageRef.current;
      const nodes = selectedIds.map(id => stage.findOne('#' + id)).filter(Boolean);
      transformerRef.current.nodes(nodes);
      transformerRef.current.getLayer().batchDraw();
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [selectedIds, localElements]);

  useEffect(() => {
    if (!isDrawing) {
      setLocalElements(map.elements);
      localElementsRef.current = map.elements;
    }
  }, [map.elements, isDrawing]);

  useEffect(() => {
    localElementsRef.current = localElements;
  }, [localElements]);

  const stopDrawing = () => {
    if (isDrawing) {
      onUpdateMap({ elements: localElementsRef.current });
      setIsDrawing(false);
      setLastPlacedPos(null);
    }
    activeEraserElementIdRef.current = null;
    activeEraserStrokeIdRef.current = null;
  };

  useEffect(() => {
    if (selectedIds.length === 1) {
      const el = map.elements.find(e => e.id === selectedIds[0]);
      if (el) {
        if (['circle', 'rect', 'triangle'].includes(el.type)) {
          setIsShapeFilled(el.fill !== 'transparent');
        }
        if (el.stroke) {
          setCurrentColor(el.stroke);
        } else if (el.fill && el.fill !== 'transparent' && el.fill.startsWith('#')) {
          setCurrentColor(el.fill.substring(0, 7));
        }
        if (el.strokeWidth) {
          setCurrentStrokeWidth(el.strokeWidth);
        }
        if (el.opacity !== undefined) {
          setBrushOpacity(el.opacity);
        }
      }
    }
  }, [selectedIds, map.elements]);

  const handleMouseDown = (e: any) => {
    if (tool === 'eraser') {
      e.evt?.preventDefault?.();
      const stage = e.target.getStage();
      const elementId = resolveElementId(e.target);
      if (!elementId) return;

      const point = getPointerOnElement(elementId, stage);
      if (!point) return;

      const newStroke: PixelEraserStroke = {
        id: `eraser-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        points: [point.x, point.y, point.x, point.y],
        strokeWidth: getElementAdjustedStrokeWidth(elementId, stage),
        lineCap: 'round'
      };

      const updatedElements = localElementsRef.current.map(el =>
        el.id === elementId
          ? { ...el, erasers: [...(el.erasers || []), newStroke] }
          : el
      );

      activeEraserElementIdRef.current = elementId;
      activeEraserStrokeIdRef.current = newStroke.id;
      localElementsRef.current = updatedElements;
      setLocalElements(updatedElements);
      setSelectedIds([]);
      setSelectionRect(null);
      setIsDrawing(true);
      return;
    }

    const stage = e.target.getStage();
    const pos = getRelativePointerPosition(stage);

    if (tool === 'select') {
      // If we clicked on a transformer handle or the transformer itself, don't do anything
      let target = e.target;
      let isTransformer = false;
      while (target && target !== stage) {
        if (target.name() === 'transformer' || target.name().startsWith('_anchor')) {
          isTransformer = true;
          break;
        }
        target = target.getParent();
      }
      
      if (isTransformer) {
        return;
      }

      const id = resolveElementId(e.target);
      const isElement = id && id.startsWith('el-');
      
      if (!isElement) {
        if (!e.evt.shiftKey) {
          setSelectedIds([]);
        }
        setSelectionRect({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
      } else {
        if (e.evt.shiftKey) {
          setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        } else if (!selectedIds.includes(id)) {
          setSelectedIds([id]);
        }
      }
      return;
    }

    if (tool === 'fill') {
      handleFloodFill(pos);
      return;
    }

    const id = `el-${Date.now()}`;

    if (['pencil', 'road', 'river', 'pool', 'railroad', 'highway', 'border', 'brush', 'area', 'circle', 'triangle', 'rect', 'line'].includes(tool)) {
      setIsDrawing(true);
      let stroke = currentColor;
      let strokeWidth = currentStrokeWidth;
      let dash: number[] | undefined = undefined;
      let fill: string | undefined = undefined;
      let closed = false;

      if (tool === 'road') {
        stroke = currentColor;
        strokeWidth = currentStrokeWidth;
      } else if (tool === 'river') {
        stroke = currentColor;
        strokeWidth = currentStrokeWidth + 2;
      } else if (tool === 'railroad') {
        stroke = '#4b5563';
        strokeWidth = currentStrokeWidth;
        dash = [5, 5];
      } else if (tool === 'highway') {
        stroke = '#1f2937';
        strokeWidth = currentStrokeWidth * 2;
        dash = [20, 10];
      } else if (tool === 'border') {
        stroke = '#ef4444';
        strokeWidth = Math.max(1, currentStrokeWidth / 2);
        dash = [15, 5, 5, 5];
      } else if (tool === 'pool') {
        stroke = currentColor;
        strokeWidth = 2;
        fill = currentColor + '80';
        closed = true;
      } else if (tool === 'brush') {
        stroke = currentColor;
        strokeWidth = currentStrokeWidth;
      } else if (tool === 'pencil') {
        stroke = currentColor;
        strokeWidth = currentStrokeWidth;
      } else if (tool === 'area') {
        stroke = currentColor;
        strokeWidth = 2;
        fill = currentColor + '80'; // Semi-transparent fill
        closed = true;
      } else if (tool === 'circle' || tool === 'rect' || tool === 'triangle' || tool === 'line') {
        stroke = currentColor;
        strokeWidth = currentStrokeWidth;
        if (tool === 'circle' || tool === 'rect' || tool === 'triangle') {
          fill = isShapeFilled ? currentColor + Math.round(brushOpacity * 255).toString(16).padStart(2, '0') : 'transparent';
        }
      }

      const newElement: MapElement = {
        id,
        type: tool === 'circle' ? 'circle' : tool === 'rect' ? 'rect' : tool === 'triangle' ? 'triangle' : 'line',
        x: pos.x,
        y: pos.y,
        points: tool === 'line' || tool === 'pencil' || tool === 'brush' || tool === 'area' || tool === 'road' || tool === 'river' || tool === 'railroad' || tool === 'highway' || tool === 'border' || tool === 'triangle' ? [0, 0] : undefined,
        radius: tool === 'circle' ? 0 : undefined,
        radiusX: tool === 'circle' ? 0 : undefined,
        radiusY: tool === 'circle' ? 0 : undefined,
        width: tool === 'rect' ? 0 : undefined,
        height: tool === 'rect' ? 0 : undefined,
        stroke,
        strokeWidth,
        fill,
        opacity: brushOpacity,
        ...(dash && { dash } as any),
        ...(closed && { closed } as any)
      };
      setLocalElements([...localElements, newElement]);
      setSelectedIds([id]);
    } else if (tool === 'text') {
      const newElement: MapElement = {
        id,
        type: 'text',
        x: pos.x,
        y: pos.y,
        text: 'שם מקום',
        fontSize: 20,
        fill: currentColor
      };
      onUpdateMap({ elements: [...map.elements, newElement] });
      setSelectedIds([id]);
      
      // Enter editing mode immediately
      setTimeout(() => {
        const stage = stageRef.current;
        const textNode = stage.findOne('#' + id);
        if (textNode) {
          const textPosition = textNode.getAbsolutePosition();
          setEditingTextId(id);
          setEditingTextValue('שם מקום');
          setEditingTextPos({
            x: textPosition.x,
            y: textPosition.y
          });
        }
      }, 50);
    } else if (tool === 'icon') {
      const id = `el-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newElement: MapElement = {
        id,
        type: 'icon',
        iconType: selectedIcon,
        x: pos.x,
        y: pos.y,
        fill: getIconFill(selectedIcon),
        iconSize: getDefaultMapIconSize(selectedIcon)
      };

      if (iconCategory === 'nature' || iconCategory === 'construction') {
        setIsDrawing(true);
        setLastPlacedPos(pos);
        setLocalElements(prev => [...prev, newElement]);
      } else {
        onUpdateMap({ elements: [...map.elements, newElement] });
        setSelectedIds([id]);
      }
    }
  };

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pos = getRelativePointerPosition(stage);
    setPreviewPos(pos);

    if (tool === 'eraser' && isDrawing && activeEraserElementIdRef.current && activeEraserStrokeIdRef.current) {
      e.evt?.preventDefault?.();
      const elementId = activeEraserElementIdRef.current;
      const strokeId = activeEraserStrokeIdRef.current;
      const point = getPointerOnElement(elementId, stage);
      if (!point) return;

      const updatedElements = localElementsRef.current.map(el => {
        if (el.id !== elementId) return el;

        return {
          ...el,
          erasers: (el.erasers || []).map(stroke =>
            stroke.id === strokeId
              ? {
                  ...stroke,
                  points: [
                    ...stroke.points,
                    point.x,
                    point.y
                  ]
                }
              : stroke
          )
        };
      });

      localElementsRef.current = updatedElements;
      setLocalElements(updatedElements);
      return;
    }

    if (selectionRect) {
      setSelectionRect({ ...selectionRect, x2: pos.x, y2: pos.y });
      return;
    }

    if (!isDrawing) return;

    if (tool === 'icon' && (iconCategory === 'nature' || iconCategory === 'construction') && lastPlacedPos) {
      const dx = pos.x - lastPlacedPos.x;
      const dy = pos.y - lastPlacedPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 40) { // Threshold for repeating icons
        const id = `el-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const newElement: MapElement = {
          id,
          type: 'icon',
          iconType: selectedIcon,
          x: pos.x,
          y: pos.y,
          fill: getIconFill(selectedIcon)
        };
        setLocalElements(prev => [...prev, newElement]);
        setLastPlacedPos(pos);
      }
      return;
    }


    const lastElement = localElements[localElements.length - 1];
    if (lastElement) {
      if (lastElement.type === 'line') {
        const updatedElements = localElements.slice(0, -1);
        let newPoints = [...(lastElement.points || [])];
        
        if (tool === 'line') {
          // Straight line: only keep start and current end
          newPoints = [0, 0, pos.x - lastElement.x, pos.y - lastElement.y];
        } else {
          // Freehand
          newPoints.push(pos.x - lastElement.x, pos.y - lastElement.y);
        }

        const updatedElement = {
          ...lastElement,
          points: newPoints
        };
        setLocalElements([...updatedElements, updatedElement]);
      } else if (lastElement.type === 'rect') {
        const updatedElements = localElements.slice(0, -1);
        const updatedElement = {
          ...lastElement,
          width: pos.x - lastElement.x,
          height: pos.y - lastElement.y
        };
        setLocalElements([...updatedElements, updatedElement]);
      } else if (lastElement.type === 'circle') {
        const updatedElements = localElements.slice(0, -1);
        const radiusX = Math.abs(pos.x - lastElement.x);
        const radiusY = Math.abs(pos.y - lastElement.y);
        const updatedElement = {
          ...lastElement,
          radiusX,
          radiusY
        };
        setLocalElements([...updatedElements, updatedElement]);
      } else if (lastElement.type === 'triangle') {
        const updatedElements = localElements.slice(0, -1);
        const dx = pos.x - lastElement.x;
        const dy = pos.y - lastElement.y;
        // Triangle points relative to x, y: [0, 0, dx, dy, -dx, dy] for an isosceles triangle
        // Or just [0, 0, dx, dy, 0, dy] for a right triangle
        // Let's do an isosceles triangle where the first point is the top vertex
        const updatedElement = {
          ...lastElement,
          points: [0, 0, dx, dy, -dx, dy]
        };
        setLocalElements([...updatedElements, updatedElement]);
      }
    }
  };

  const handleMouseUp = (e: any) => {
    if (selectionRect) {
      const stage = e.target.getStage();
      const box = {
        x: Math.min(selectionRect.x1, selectionRect.x2),
        y: Math.min(selectionRect.y1, selectionRect.y2),
        width: Math.abs(selectionRect.x1 - selectionRect.x2),
        height: Math.abs(selectionRect.y1 - selectionRect.y2),
      };

      if (box.width > 5 || box.height > 5) {
        const shapes = stage.find('.erasable-element');
        const selected = shapes.filter((shape: any) => {
          const id = shape.id();
          if (!id || !id.startsWith('el-')) return false;
          if (shape.getAttr('isEraser')) return false;
          const shapeBox = shape.getClientRect({ relativeTo: shape.getLayer() });

          return (
            shapeBox.x >= box.x &&
            shapeBox.y >= box.y &&
            shapeBox.x + shapeBox.width <= box.x + box.width &&
            shapeBox.y + shapeBox.height <= box.y + box.height
          );
        }).map((shape: any) => shape.id());
        
        if (e.evt.shiftKey) {
          setSelectedIds(prev => [...new Set([...prev, ...selected])]);
        } else {
          setSelectedIds(selected);
        }
      }
      setSelectionRect(null);
    }

    if (tool === 'eraser' && activeEraserElementIdRef.current) {
      onUpdateMap({ elements: localElementsRef.current });
      activeEraserElementIdRef.current = null;
      activeEraserStrokeIdRef.current = null;
      setIsDrawing(false);
      setLastPlacedPos(null);
      return;
    }

    if (isDrawing) {
      onUpdateMap({ elements: localElementsRef.current });
    }
    setIsDrawing(false);
    setLastPlacedPos(null);
    activeEraserElementIdRef.current = null;
    activeEraserStrokeIdRef.current = null;
  };

  const handleDblClick = (e: any) => {
    const id = resolveElementId(e.target);
    if (id && id.startsWith('el-')) {
      setSelectedIds([id]);
    }
  };

  const handleDragStart = (e: any) => {
    const id = e.target.id();
    if (selectedIds.includes(id)) {
      const starts: Record<string, { x: number, y: number }> = {};
      selectedIds.forEach(selId => {
        const el = map.elements.find(item => item.id === selId);
        if (el) {
          starts[selId] = { x: el.x, y: el.y };
        }
      });
      setDragStartPos(starts);
    }
  };

  const handleDragMove = (e: any) => {
    const id = e.target.id();
    if (selectedIds.includes(id) && selectedIds.length > 1) {
      const stage = stageRef.current;
      const start = dragStartPos[id];
      if (!start) return;
      
      const dx = e.target.x() - start.x;
      const dy = e.target.y() - start.y;
      
      selectedIds.forEach(selId => {
        if (selId === id) return;
        const node = stage.findOne('#' + selId);
        const nodeStart = dragStartPos[selId];
        if (node && nodeStart) {
          node.x(nodeStart.x + dx);
          node.y(nodeStart.y + dy);
        }
      });
    }
  };

  const handleDragEnd = (e: any) => {
    const updatedElements = map.elements.map(el => {
      const node = stageRef.current.findOne('#' + el.id);
      if (node && (selectedIds.includes(el.id) || el.id === e.target.id())) {
        return {
          ...el,
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY()
        };
      }
      return el;
    });
    onUpdateMap({ elements: updatedElements });
    setDragStartPos({});
  };

  const deleteSelected = () => {
    if (selectedIds.length > 0) {
      const updatedElements = localElementsRef.current.filter(el => !selectedIds.includes(el.id));
      setLocalElements(updatedElements);
      localElementsRef.current = updatedElements;
      setSelectedIds([]);
      onUpdateMap({ elements: updatedElements });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPendingImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const bringForward = () => {
    if (selectedIds.length > 0) {
      const newElements = [...map.elements];
      // Sort selected IDs by their current index in reverse to avoid index shifting issues
      const sortedSelectedIds = [...selectedIds].sort((a, b) => {
        return newElements.findIndex(el => el.id === b) - newElements.findIndex(el => el.id === a);
      });

      let changed = false;
      sortedSelectedIds.forEach(id => {
        const index = newElements.findIndex(el => el.id === id);
        if (index < newElements.length - 1) {
          // Only swap if the element above is NOT also selected (to move the whole group)
          if (!selectedIds.includes(newElements[index + 1].id)) {
            const temp = newElements[index];
            newElements[index] = newElements[index + 1];
            newElements[index + 1] = temp;
            changed = true;
          }
        }
      });

      if (changed) {
        onUpdateMap({ elements: newElements });
      }
    }
  };

  const sendBackward = () => {
    if (selectedIds.length > 0) {
      const newElements = [...map.elements];
      // Sort selected IDs by their current index to avoid index shifting issues
      const sortedSelectedIds = [...selectedIds].sort((a, b) => {
        return newElements.findIndex(el => el.id === a) - newElements.findIndex(el => el.id === b);
      });

      let changed = false;
      sortedSelectedIds.forEach(id => {
        const index = newElements.findIndex(el => el.id === id);
        if (index > 0) {
          // Only swap if the element below is NOT also selected
          if (!selectedIds.includes(newElements[index - 1].id)) {
            const temp = newElements[index];
            newElements[index] = newElements[index - 1];
            newElements[index - 1] = temp;
            changed = true;
          }
        }
      });

      if (changed) {
        onUpdateMap({ elements: newElements });
      }
    }
  };

  const bringToFront = () => {
    if (selectedIds.length > 0) {
      const selectedElements = map.elements.filter(el => selectedIds.includes(el.id));
      const remainingElements = map.elements.filter(el => !selectedIds.includes(el.id));
      onUpdateMap({ elements: [...remainingElements, ...selectedElements] });
    }
  };

  const sendToBack = () => {
    if (selectedIds.length > 0) {
      const selectedElements = map.elements.filter(el => selectedIds.includes(el.id));
      const remainingElements = map.elements.filter(el => !selectedIds.includes(el.id));
      onUpdateMap({ elements: [...selectedElements, ...remainingElements] });
    }
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.1, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
  const resetZoom = () => { setScale(1); setStagePos({ x: 0, y: 0 }); };

  const handleFloodFill = (pos: { x: number, y: number }) => {
    const stage = stageRef.current;
    if (!stage) return;

    // This is a simplified version of flood fill for Konva
    // Since Konva is vector-based, a true pixel flood fill would require creating a bitmap
    // We'll use a hidden canvas to perform the fill and then add it as an image
    
    const canvas = stage.toCanvas();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Get stage coordinates in pixel space
    const stageX = Math.round((pos.x * scale + stagePos.x));
    const stageY = Math.round((pos.y * scale + stagePos.y));

    const targetColor = getPixel(pixels, stageX, stageY, canvas.width);
    const fillColor = hexToRgb(currentColor);

    if (colorsMatch(targetColor, fillColor)) return;

    const filledPixels = new Uint8Array(canvas.width * canvas.height);
    const stack = [[stageX, stageY]];
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
      
      const idx = y * canvas.width + x;
      if (filledPixels[idx]) continue;

      const color = getPixel(pixels, x, y, canvas.width);
      if (colorsMatch(color, targetColor)) {
        filledPixels[idx] = 1;
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
    }

    // Create a new canvas for the result
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = canvas.width;
    resultCanvas.height = canvas.height;
    const resultCtx = resultCanvas.getContext('2d')!;
    const resultImageData = resultCtx.createImageData(canvas.width, canvas.height);
    
    for (let i = 0; i < filledPixels.length; i++) {
      if (filledPixels[i]) {
        resultImageData.data[i * 4] = fillColor.r;
        resultImageData.data[i * 4 + 1] = fillColor.g;
        resultImageData.data[i * 4 + 2] = fillColor.b;
        resultImageData.data[i * 4 + 3] = Math.round(brushOpacity * 255);
      }
    }
    resultCtx.putImageData(resultImageData, 0, 0);

    const id = `el-${Date.now()}`;
    const newElement: MapElement = {
      id,
      type: 'image',
      x: -stagePos.x / scale,
      y: -stagePos.y / scale,
      scaleX: 1 / scale,
      scaleY: 1 / scale,
      imageUrl: resultCanvas.toDataURL(),
      opacity: 1
    };

    onUpdateMap({ elements: [...map.elements, newElement] });
  };

  const getPixel = (pixels: Uint8ClampedArray, x: number, y: number, width: number) => {
    const i = (y * width + x) * 4;
    return { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2], a: pixels[i + 3] };
  };

  const colorsMatch = (c1: any, c2: any) => {
    const threshold = 10;
    return Math.abs(c1.r - c2.r) < threshold && 
           Math.abs(c1.g - c2.g) < threshold && 
           Math.abs(c1.b - c2.b) < threshold;
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const exportAsImage = () => {
    if (stageRef.current) {
      // Find bounding box of all elements to export the full map
      let minX = 0;
      let minY = 0;
      let maxX = stageSize.width;
      let maxY = stageSize.height;

      if (map.elements.length > 0 || bgImage) {
        minX = Infinity;
        minY = Infinity;
        maxX = -Infinity;
        maxY = -Infinity;

        if (bgImage) {
          minX = 0;
          minY = 0;
          maxX = bgImage.width;
          maxY = bgImage.height;
        }

        map.elements.forEach(el => {
          if (el.type === 'line' && el.points) {
            for (let i = 0; i < el.points.length; i += 2) {
              const x = el.x + el.points[i];
              const y = el.y + el.points[i+1];
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          } else {
            const x = el.x;
            const y = el.y;
            minX = Math.min(minX, x - 50);
            minY = Math.min(minY, y - 50);
            maxX = Math.max(maxX, x + 50);
            maxY = Math.max(maxY, y + 50);
          }
        });
      }

      // Add padding
      const padding = 100;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;

      // Temporarily reset zoom and position to capture correctly
      const oldScale = scale;
      const oldPos = stagePos;
      
      // We don't actually need to reset if we provide the bounds correctly to toDataURL
      // But we need to make sure the bounds are in the stage's coordinate system (untransformed)
      
      let uri = '';
      uiLayerRef.current?.hide();
      stageRef.current.batchDraw();
      try {
        uri = stageRef.current.toDataURL({
          pixelRatio: 2,
          x: minX * scale + stagePos.x,
          y: minY * scale + stagePos.y,
          width: (maxX - minX) * scale,
          height: (maxY - minY) * scale
        });
      } finally {
        uiLayerRef.current?.show();
        stageRef.current.batchDraw();
      }
      
      const link = document.createElement('a');
      link.download = `${map.name || 'map'}.png`;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const selectedElement = map.elements.find(el => el.id === selectedIds[0]);

  return (
    <div className="h-full flex relative bg-[var(--theme-bg)] overflow-hidden">
      {/* Toolbar */}
      <div className="flex h-full z-20 shadow-xl">
        <div className="w-16 bg-[var(--theme-card)] border-l border-[var(--theme-border)] flex flex-col items-center py-6 gap-4 overflow-y-auto no-scrollbar">
          <button 
            onClick={() => { stopDrawing(); setActiveTab('select'); setTool('select'); setShowPathTools(false); }}
            className={`p-3 rounded-xl transition-all ${activeTab === 'select' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-md' : 'text-[var(--theme-primary)]/40 hover:bg-[var(--theme-secondary)]'}`}
            title="בחירה"
          >
            <MousePointer2 size={20} />
          </button>
          <button 
            onClick={() => { stopDrawing(); setActiveTab('pan'); setTool('pan'); setShowPathTools(false); }}
            className={`p-3 rounded-xl transition-all ${activeTab === 'pan' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-md' : 'text-[var(--theme-primary)]/40 hover:bg-[var(--theme-secondary)]'}`}
            title="הזזת מפה"
          >
            <Hand size={20} />
          </button>
          <div className="h-px w-8 bg-[var(--theme-border)]/50" />
          <button 
            onClick={() => { stopDrawing(); setActiveTab('icons'); setTool('icon'); setIconCategory('nature'); setShowPathTools(true); }}
            className={`p-3 rounded-xl transition-all ${activeTab === 'icons' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-md' : 'text-[var(--theme-primary)]/40 hover:bg-[var(--theme-secondary)]'}`}
            title="אייקונים"
          >
            <Trees size={20} />
          </button>
          <button 
            onClick={() => { stopDrawing(); setActiveTab('paint'); setTool('brush'); setShowPathTools(true); }}
            className={`p-3 rounded-xl transition-all ${activeTab === 'paint' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-md' : 'text-[var(--theme-primary)]/40 hover:bg-[var(--theme-secondary)]'}`}
            title="צביעה וציור"
          >
            <Brush size={20} />
          </button>
          <button 
            onClick={() => { stopDrawing(); setActiveTab('extras'); setShowPathTools(true); }}
            className={`p-3 rounded-xl transition-all ${activeTab === 'extras' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-md' : 'text-[var(--theme-primary)]/40 hover:bg-[var(--theme-secondary)]'}`}
            title="תוספות וייצוא"
          >
            <Plus size={20} />
          </button>
          
          <div className="mt-auto flex flex-col gap-4 items-center">
            <button 
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-3 text-[var(--theme-primary)]/40 hover:text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-xl disabled:opacity-20 transition-all"
              title="בטל (Ctrl+Z)"
            >
              <Undo size={20} />
            </button>
            <button 
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-3 text-[var(--theme-primary)]/40 hover:text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-xl disabled:opacity-20 transition-all"
              title="בצע שוב (Ctrl+Y)"
            >
              <Redo size={20} />
            </button>
            <button 
              onClick={() => { stopDrawing(); deleteSelected(); }}
              disabled={selectedIds.length === 0}
              className="p-3 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl disabled:opacity-20 transition-all"
              title="מחק"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        {/* Secondary Sidebar */}
        {showPathTools && (
          <div className="w-56 bg-[var(--theme-card)] border-l border-[var(--theme-border)] flex flex-col py-6 px-3 gap-2 overflow-y-auto no-scrollbar animate-in slide-in-from-right duration-200">
            {activeTab === 'icons' && (
              <>
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="text-[10px] font-black text-[var(--theme-primary)] uppercase tracking-widest">אייקונים</h3>
                  <button onClick={() => setShowPathTools(false)} className="text-[var(--theme-primary)]/30 hover:text-[var(--theme-primary)]"><X size={14} /></button>
                </div>
                <div className="grid grid-cols-2 gap-1 mb-4">
                  <button 
                    onClick={() => { stopDrawing(); setIconCategory('nature'); setTool('icon'); }}
                    className={`p-2 rounded-lg text-[10px] font-bold transition-all ${iconCategory === 'nature' && tool === 'icon' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)]' : 'bg-[var(--theme-secondary)] text-[var(--theme-primary)]'}`}
                  >טבע</button>
                  <button 
                    onClick={() => { stopDrawing(); setIconCategory('construction'); setTool('icon'); }}
                    className={`p-2 rounded-lg text-[10px] font-bold transition-all ${iconCategory === 'construction' && tool === 'icon' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)]' : 'bg-[var(--theme-secondary)] text-[var(--theme-primary)]'}`}
                  >בנייה</button>
                  <button 
                    onClick={() => { stopDrawing(); setIconCategory('transportation'); setTool('icon'); }}
                    className={`p-2 rounded-lg text-[10px] font-bold transition-all ${iconCategory === 'transportation' && tool === 'icon' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)]' : 'bg-[var(--theme-secondary)] text-[var(--theme-primary)]'}`}
                  >תחבורה</button>
                  <button 
                    onClick={() => { stopDrawing(); setIconCategory('animals'); setTool('icon'); }}
                    className={`p-2 rounded-lg text-[10px] font-bold transition-all ${iconCategory === 'animals' && tool === 'icon' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)]' : 'bg-[var(--theme-secondary)] text-[var(--theme-primary)]'}`}
                  >חיות</button>
                </div>
              </>
            )}

            {activeTab === 'paint' && (
              <>
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="text-[10px] font-black text-[var(--theme-primary)] uppercase tracking-widest">צביעה וציור</h3>
                  <button onClick={() => setShowPathTools(false)} className="text-[var(--theme-primary)]/30 hover:text-[var(--theme-primary)]"><X size={14} /></button>
                </div>
                
                <div className="space-y-1">
                  <button 
                    onClick={() => { stopDrawing(); setTool('brush'); }}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${tool === 'brush' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-md' : 'text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]'}`}
                  >
                    <Brush size={16} />
                    <span className="text-xs font-bold">מברשת</span>
                  </button>
                  <button 
                    onClick={() => { stopDrawing(); setTool('border'); }}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${tool === 'border' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-md' : 'text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]'}`}
                  >
                    <Flag size={16} />
                    <span className="text-xs font-bold">גבול</span>
                  </button>
                  <button 
                    onClick={() => { stopDrawing(); setTool('area'); }}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${tool === 'area' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-md' : 'text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]'}`}
                  >
                    <Spline size={16} />
                    <span className="text-xs font-bold">שטח צבוע</span>
                  </button>              
                  <button 
                    onClick={() => { stopDrawing(); setTool('eraser'); }}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${tool === 'eraser' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-md' : 'text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]'}`}
                  >
                    <Eraser size={16} />
                    <span className="text-xs font-bold">מחק</span>
                  </button>
                  
                  <div className="h-px bg-[var(--theme-border)]/50 mx-2 my-2" />

                  <div className="grid grid-cols-4 gap-1 px-1">
                    <button 
                      onClick={() => { stopDrawing(); setTool('line'); }}
                      className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-all ${tool === 'line' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)]' : 'bg-[var(--theme-secondary)] text-[var(--theme-primary)]'}`}
                      title="קו ישר"
                    >
                      <Minus size={16} className="rotate-45" />
                      <span className="text-[8px] font-bold">קו</span>
                    </button>
                    <button 
                      onClick={() => { stopDrawing(); setTool('rect'); }}
                      className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-all ${tool === 'rect' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)]' : 'bg-[var(--theme-secondary)] text-[var(--theme-primary)]'}`}
                      title="מלבן"
                    >
                      <Square size={16} />
                      <span className="text-[8px] font-bold">מלבן</span>
                    </button>
                    <button 
                      onClick={() => { stopDrawing(); setTool('circle'); }}
                      className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-all ${tool === 'circle' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)]' : 'bg-[var(--theme-secondary)] text-[var(--theme-primary)]'}`}
                      title="עיגול"
                    >
                      <CircleIcon size={16} />
                      <span className="text-[8px] font-bold">עיגול</span>
                    </button>
                    <button 
                      onClick={() => { stopDrawing(); setTool('triangle'); }}
                      className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-all ${tool === 'triangle' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)]' : 'bg-[var(--theme-secondary)] text-[var(--theme-primary)]'}`}
                      title="משולש"
                    >
                      <Triangle size={16} />
                      <span className="text-[8px] font-bold">משולש</span>
                    </button>
                  </div>
                  
                  <div className="h-px bg-[var(--theme-border)]/50 mx-2 my-2" />

                  <div className="px-1 space-y-2">
                    <label className="text-[10px] font-bold text-[var(--theme-primary)]/50 uppercase block">מילוי צורה:</label>
                    <div className="flex bg-[var(--theme-secondary)] p-1 rounded-xl border border-[var(--theme-border)]/50">
                      <button 
                        onClick={() => {
                          setIsShapeFilled(true);
                          if (selectedIds.length > 0) {
                            const updatedElements = map.elements.map(el => {
                              if (selectedIds.includes(el.id) && ['circle', 'rect', 'triangle'].includes(el.type)) {
                                return { ...el, fill: (el.stroke || currentColor) + Math.round(brushOpacity * 255).toString(16).padStart(2, '0') };
                              }
                              return el;
                            });
                            onUpdateMap({ elements: updatedElements });
                          }
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isShapeFilled ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-sm' : 'text-[var(--theme-primary)]/60'}`}
                      >
                        מלא
                      </button>
                      <button 
                        onClick={() => {
                          setIsShapeFilled(false);
                          if (selectedIds.length > 0) {
                            const updatedElements = map.elements.map(el => {
                              if (selectedIds.includes(el.id) && ['circle', 'rect', 'triangle'].includes(el.type)) {
                                return { ...el, fill: 'transparent' };
                              }
                              return el;
                            });
                            onUpdateMap({ elements: updatedElements });
                          }
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${!isShapeFilled ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-sm' : 'text-[var(--theme-primary)]/60'}`}
                      >
                        ריק
                      </button>
                    </div>
                  </div>

                </div>

                <div className="h-px bg-[var(--theme-border)]/50 mx-2 my-4" />
                
                <div className="px-2 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--theme-primary)]/50 uppercase block">צבע כלי:</label>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg border border-[var(--theme-border)] shadow-sm" style={{ backgroundColor: currentColor }} />
                      <input 
                        type="color" 
                        value={currentColor} 
                        onChange={(e) => {
                          const newColor = e.target.value;
                          setCurrentColor(newColor);
                          if (selectedIds.length > 0) {
                            const updatedElements = map.elements.map(el => {
                              if (selectedIds.includes(el.id)) {
                                if (el.type === 'line' || el.type === 'triangle' || el.type === 'circle' || el.type === 'rect') {
                                  const updatedEl = { ...el, stroke: newColor };
                                  if (el.fill && el.fill !== 'transparent') {
                                    updatedEl.fill = newColor + Math.round(brushOpacity * 255).toString(16).padStart(2, '0');
                                  }
                                  return updatedEl;
                                }
                                if (el.type === 'icon' || el.type === 'text') {
                                  return { ...el, fill: newColor };
                                }
                              }
                              return el;
                            });
                            onUpdateMap({ elements: updatedElements });
                          }
                        }} 
                        className="flex-1 h-8 cursor-pointer rounded-lg overflow-hidden border-0 p-0" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--theme-primary)]/50 uppercase block">עובי קו: {currentStrokeWidth}</label>
                    <input 
                      type="range" 
                      min="1" 
                      max="40" 
                      value={currentStrokeWidth} 
                      onChange={(e) => {
                        const newWidth = parseInt(e.target.value);
                        setCurrentStrokeWidth(newWidth);
                        if (selectedIds.length > 0) {
                          const updatedElements = map.elements.map(el => {
                            if (selectedIds.includes(el.id)) {
                              if (['line', 'circle', 'rect', 'triangle'].includes(el.type)) {
                                return { ...el, strokeWidth: newWidth };
                              }
                            }
                            return el;
                          });
                          onUpdateMap({ elements: updatedElements });
                        }
                      }}
                      className="w-full accent-[var(--theme-primary)]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--theme-primary)]/50 uppercase block">שקיפות: {Math.round(brushOpacity * 100)}%</label>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="1" 
                      step="0.1"
                      value={brushOpacity} 
                      onChange={(e) => {
                        const newOpacity = parseFloat(e.target.value);
                        setBrushOpacity(newOpacity);
                        if (selectedIds.length > 0) {
                          const updatedElements = map.elements.map(el => {
                            if (selectedIds.includes(el.id)) {
                              if (['line', 'circle', 'rect', 'triangle'].includes(el.type)) {
                                const updatedEl = { ...el, opacity: newOpacity };
                                if (el.fill && el.fill !== 'transparent') {
                                  const baseColor = el.fill.substring(0, 7);
                                  updatedEl.fill = baseColor + Math.round(newOpacity * 255).toString(16).padStart(2, '0');
                                }
                                return updatedEl;
                              }
                            }
                            return el;
                          });
                          onUpdateMap({ elements: updatedElements });
                        }
                      }}
                      className="w-full accent-[var(--theme-primary)]"
                    />
                  </div>

                  <div className="h-px bg-[var(--theme-border)]/50 mx-2 my-2" />

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--theme-primary)]/50 uppercase block">צבע רקע המפה:</label>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg border border-[var(--theme-border)] shadow-sm" style={{ backgroundColor: map.backgroundColor || '#fdf6e3' }} />
                      <input 
                        type="color" 
                        value={map.backgroundColor || '#fdf6e3'} 
                        onChange={(e) => onUpdateMap({ backgroundColor: e.target.value })} 
                        className="flex-1 h-8 cursor-pointer rounded-lg overflow-hidden border-0 p-0" 
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'extras' && (
              <>
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="text-[10px] font-black text-[var(--theme-primary)] uppercase tracking-widest">תוספות וייצוא</h3>
                  <button onClick={() => setShowPathTools(false)} className="text-[var(--theme-primary)]/30 hover:text-[var(--theme-primary)]"><X size={14} /></button>
                </div>
                
                <div className="space-y-2">
                  <button 
                    onClick={() => { stopDrawing(); setTool('text'); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${tool === 'text' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-md' : 'text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]'}`}
                  >
                    <LucideType size={18} />
                    <span className="text-xs font-bold">הוספת טקסט</span>
                  </button>
                  
                  <button 
                    onClick={() => { stopDrawing(); setTool('place'); setShowPlacesList(true); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${tool === 'place' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-md' : 'text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]'}`}
                  >
                    <MapPin size={18} />
                    <span className="text-xs font-bold">מקום מהשאלון</span>
                  </button>

                  <label className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] cursor-pointer transition-all">
                    <ImageIcon size={18} />
                    <span className="text-xs font-bold">העלאת תמונה</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>

                  <div className="h-px bg-[var(--theme-border)]/50 mx-2 my-2" />

                  <button 
                    onClick={exportAsImage}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] transition-all"
                  >
                    <Download size={18} />
                    <span className="text-xs font-bold">הורדה כתמונה</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Tool Sub-options */}
        {tool === 'place' && showPlacesList && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[var(--theme-card)]/90 backdrop-blur-md p-4 rounded-3xl border border-[var(--theme-border)] shadow-2xl z-30 flex flex-col gap-3 min-w-[300px] max-h-[60vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--theme-border)]/50 pb-2">
              <h3 className="text-xs font-black text-[var(--theme-primary)] uppercase tracking-widest">בחר מקום מהשאלון</h3>
              <button onClick={() => setShowPlacesList(false)} className="text-[var(--theme-primary)]/30 hover:text-[var(--theme-primary)]"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto flex-1 space-y-1 pr-1 text-[var(--theme-primary)]">
              {places.length === 0 ? (
                <div className="text-center py-8 text-[var(--theme-primary)]/40 text-xs">אין מקומות בשאלון</div>
              ) : (
                places.map(place => (
                  <button 
                    key={place.id}
                    onClick={() => {
                      stopDrawing();
                      const id = `el-${Date.now()}`;
                      const newElement: MapElement = {
                        id,
                        type: 'text',
                        x: stageSize.width / 2 - stagePos.x,
                        y: stageSize.height / 2 - stagePos.y,
                        text: place.name,
                        fontSize: 24,
                        fill: '#8b4513',
                        ...( { questionnaireId: place.id, isPlace: true } as any)
                      };
                      onUpdateMap({ elements: [...map.elements, newElement] });
                      setSelectedIds([id]);
                      setShowPlacesList(false);
                      setTool('select');
                    }}
                    className="w-full text-right px-4 py-3 rounded-xl hover:bg-[var(--theme-secondary)] text-sm text-[var(--theme-primary)] font-medium transition-all flex items-center justify-between group"
                  >
                    <span>{place.name}</span>
                    <Plus size={14} className="opacity-0 group-hover:opacity-100 text-[var(--theme-accent)]" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {tool === 'icon' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[var(--theme-card)]/80 backdrop-blur-md p-2 rounded-2xl border border-[var(--theme-border)] shadow-xl z-10 flex gap-2 overflow-x-auto max-w-[90vw]">
            {iconCategory === 'nature' ? (
              (['tree', 'trees', 'mountain', 'valley', 'flower', 'wave', 'desert', 'beach', 'rainbow', 'fire', 'field'] as const).map(icon => (
                <button 
                  key={icon}
                  onClick={() => setSelectedIcon(icon)}
                  className={`p-2 rounded-xl transition-all flex-shrink-0 ${selectedIcon === icon ? 'bg-[var(--theme-primary)] text-[var(--theme-card)]' : 'text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]'}`}
                  title={icon}
                >
                  {icon === 'tree' && <span className="text-lg">🌳</span>}
                  {icon === 'trees' && <span className="text-lg">🌲🌲</span>}
                  {icon === 'mountain' && <span className="text-lg">⛰️</span>}
                  {icon === 'valley' && <div className="rotate-180"><Mountain size={18} /></div>}
                  {icon === 'flower' && <span className="text-lg">🌹</span>}
                  {icon === 'wave' && <span className="text-lg">🌊</span>}
                  {icon === 'desert' && <span className="text-lg">🏜️</span>}
                  {icon === 'beach' && <span className="text-lg">🏖️</span>}
                  {icon === 'rainbow' && <span className="text-lg">🌈</span>}
                  {icon === 'fire' && <span className="text-lg">🔥</span>}
                  {icon === 'field' && <span className="text-lg">🌾</span>}
                </button>
              ))
            ) : iconCategory === 'construction' ? (
              (['house', 'village', 'city', 'camp', 'temple', 'hotel', 'hospital', 'factory', 'palace', 'park', 'bridge', 'market'] as const).map(icon => (
                <button 
                  key={icon}
                  onClick={() => setSelectedIcon(icon)}
                  className={`p-2 rounded-xl transition-all flex-shrink-0 ${selectedIcon === icon ? 'bg-[var(--theme-primary)] text-[var(--theme-card)]' : 'text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]'}`}
                  title={icon}
                >
                  {icon === 'house' && <span className="text-lg">🏠</span>}
                  {icon === 'village' && <span className="text-lg">🏘️</span>}
                  {icon === 'city' && <span className="text-lg">🏙️</span>}
                  {icon === 'camp' && <span className="text-lg">⛺</span>}
                  {icon === 'temple' && <span className="text-lg">🏛️</span>}
                  {icon === 'hotel' && <span className="text-lg">🏨</span>}
                  {icon === 'hospital' && <span className="text-lg">🏥</span>}
                  {icon === 'factory' && <span className="text-lg">🏭</span>}
                  {icon === 'palace' && <span className="text-lg">🏰</span>}
                  {icon === 'park' && <span className="text-lg">🎡</span>}
                  {icon === 'bridge' && <span className="text-lg">🌉</span>}
                  {icon === 'market' && <span className="text-lg">🍞☕</span>}
                </button>
              ))
            ) : iconCategory === 'transportation' ? (
              (['car', 'bus', 'ambulance', 'fire_truck', 'truck', 'tractor', 'train', 'plane', 'ship', 'traffic_light', 'barrier'] as const).map(icon => (
                <button 
                  key={icon}
                  onClick={() => setSelectedIcon(icon)}
                  className={`p-2 rounded-xl transition-all flex-shrink-0 ${selectedIcon === icon ? 'bg-[var(--theme-primary)] text-[var(--theme-card)]' : 'text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]'}`}
                  title={icon}
                >
                  {icon === 'car' && <span className="text-lg">🚗</span>}
                  {icon === 'bus' && <span className="text-lg">🚌</span>}
                  {icon === 'ambulance' && <span className="text-lg">🚑</span>}
                  {icon === 'fire_truck' && <span className="text-lg">🚒</span>}
                  {icon === 'truck' && <span className="text-lg">🚛</span>}
                  {icon === 'tractor' && <span className="text-lg">🚜</span>}
                  {icon === 'train' && <span className="text-lg">🚂</span>}
                  {icon === 'plane' && <span className="text-lg">✈️</span>}
                  {icon === 'ship' && <span className="text-lg">🚢</span>}
                  {icon === 'traffic_light' && <span className="text-lg">🚦</span>}
                  {icon === 'barrier' && <span className="text-lg">🚧</span>}
                </button>
              ))
            ) : (
              (['fish', 'horse', 'snake', 'cattle', 'sheep', 'eagle', 'wildcat', 'cat', 'bird'] as const).map(icon => (
                <button 
                  key={icon}
                  onClick={() => setSelectedIcon(icon)}
                  className={`p-2 rounded-xl transition-all flex-shrink-0 ${selectedIcon === icon ? 'bg-[var(--theme-primary)] text-[var(--theme-card)]' : 'text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)]'}`}
                  title={icon}
                >
                  {icon === 'fish' && <span className="text-lg">🐟</span>}
                  {icon === 'horse' && <span className="text-lg">🐎</span>}
                  {icon === 'snake' && <span className="text-lg">🐍</span>}
                  {icon === 'cattle' && <span className="text-lg">🐄</span>}
                  {icon === 'sheep' && <span className="text-lg">🐑</span>}
                  {icon === 'eagle' && <span className="text-lg">🦅</span>}
                  {icon === 'wildcat' && <span className="text-lg">🐆</span>}
                  {icon === 'cat' && <span className="text-lg">🐈</span>}
                  {icon === 'bird' && <span className="text-lg">🐦</span>}
                </button>
              ))
            )}
          </div>
        )}

        {/* Canvas */}
        <div
          className="flex-1 cursor-crosshair overflow-hidden relative"
          ref={containerRef}
          style={{
            backgroundColor: '#ffffff',
            backgroundImage: `
              linear-gradient(45deg, #d1d5db 25%, transparent 25%),
              linear-gradient(-45deg, #d1d5db 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #d1d5db 75%),
              linear-gradient(-45deg, transparent 75%, #d1d5db 75%)
            `,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
          }}
        >
          <Stage
            id="stage"
            width={stageSize.width}
            height={stageSize.height}
            scaleX={scale}
            scaleY={scale}
            x={stagePos.x}
            y={stagePos.y}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            onDblClick={handleDblClick}
            ref={stageRef}
            draggable={tool === 'pan'}
            onDragEnd={(e) => {
              if (e.target === stageRef.current) {
                setStagePos({ x: e.target.x(), y: e.target.y() });
              }
            }}
          >
            <Layer>
              {/* Background Color */}
              <Rect
                x={-5000}
                y={-5000}
                width={10000}
                height={10000}
                fill={map.backgroundColor || '#fdf6e3'}
                name="background"
                listening={false}
              />
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
              {localElements.map((el) => {
                if (el.type === 'rect') {
                  return (
                    <ErasableElement
                      key={el.id}
                      element={el}
                      tool={tool}
                      onDblClick={handleDblClick}
                      onDragStart={handleDragStart}
                      onDragMove={handleDragMove}
                      onDragEnd={handleDragEnd}
                    >
                      <Rect
                        x={0}
                        y={0}
                        width={el.width}
                        height={el.height}
                        stroke={el.stroke}
                        strokeWidth={el.strokeWidth}
                        fill={el.fill}
                        opacity={el.opacity ?? 1}
                        name="rect"
                      />
                    </ErasableElement>
                  );
                }
                if (el.type === 'circle') {
                  return (
                    <ErasableElement
                      key={el.id}
                      element={el}
                      tool={tool}
                      onDblClick={handleDblClick}
                      onDragStart={handleDragStart}
                      onDragMove={handleDragMove}
                      onDragEnd={handleDragEnd}
                    >
                      <Ellipse
                        x={0}
                        y={0}
                        radiusX={el.radiusX || el.radius || 0}
                        radiusY={el.radiusY || el.radius || 0}
                        stroke={el.stroke}
                        strokeWidth={el.strokeWidth}
                        fill={el.fill}
                        opacity={el.opacity ?? 1}
                        name="ellipse"
                      />
                    </ErasableElement>
                  );
                }
                if (el.type === 'line' || el.type === 'triangle') {
                  const isEraserLine =
                    !!(el as any).isEraser ||
                    (el as any).globalCompositeOperation === 'destination-out';
                  if (isEraserLine) return null;
                  return (
                    <ErasableElement
                      key={el.id}
                      element={el}
                      tool={tool}
                      onDblClick={handleDblClick}
                      onDragStart={handleDragStart}
                      onDragMove={handleDragMove}
                      onDragEnd={handleDragEnd}
                    >
                      <Line
                        x={0}
                        y={0}
                        points={el.points}
                        stroke={el.stroke}
                        strokeWidth={el.strokeWidth}
                        tension={el.type === 'triangle' ? 0 : 0.5}
                        lineCap="round"
                        lineJoin="round"
                        dash={(el as any).dash}
                        closed={(el as any).closed || el.type === 'triangle'}
                        fill={el.fill || (el as any).fill}
                        opacity={el.opacity ?? 1}
                        name={el.type}
                      />
                    </ErasableElement>
                  );
                }
                if (el.type === 'text') {
                  return (
                    <ErasableElement
                      key={el.id}
                      element={el}
                      tool={tool}
                      onDblClick={handleDblClick}
                      onDragStart={handleDragStart}
                      onDragMove={handleDragMove}
                      onDragEnd={handleDragEnd}
                    >
                      <Label x={0} y={0}>
                        <Tag
                          fill="white"
                          opacity={1}
                          cornerRadius={4}
                          stroke={el.isPlace ? '#8b4513' : 'transparent'}
                          strokeWidth={el.isPlace ? 1 : 0}
                        />
                        <Text fontFamily={MAP_TEXT_FONT}
                          padding={5}
                          text={el.text}
                          fontSize={el.fontSize}
                          fill={el.fill}
                          align="right"
                          direction="rtl"
                          onDblClick={(e) => {
                            if (el.isPlace) return; // Don't edit linked places directly
                            handleDblClick(e);
                            
                            const stage = e.target.getStage();
                            const textNode = e.target;
                            const textPosition = textNode.getAbsolutePosition();
                            
                            setEditingTextId(el.id);
                            setEditingTextValue(el.text || '');
                            setEditingTextPos({
                              x: textPosition.x,
                              y: textPosition.y
                            });
                          }}
                        />
                      </Label>
                      {el.isPlace && (
                        <Circle x={-10} y={(el.fontSize || 20) * 0.5 + 5} radius={4} fill="#8b4513" />
                      )}
                    </ErasableElement>
                  );
                }
              if (el.type === 'icon') {
                const iconSize = el.iconSize || getDefaultMapIconSize(el.iconType);
                // Simple shapes for icons for now
                if ((el as any).isPool) {
                  return (
                    <ErasableElement
                      key={el.id}
                      element={el}
                      tool={tool}
                      onDblClick={handleDblClick}
                      onDragStart={handleDragStart}
                      onDragMove={handleDragMove}
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
                      </ErasableElement>
                    );
                  }
                  
                  // For other icons, use a group with a shape
                  return (
                    <ErasableElement
                      key={el.id}
                      element={el}
                      tool={tool}
                      onDblClick={handleDblClick}
                      onDragStart={handleDragStart}
                      onDragMove={handleDragMove}
                      onDragEnd={handleDragEnd}
                    >
                      {el.iconType === 'fish' && <Text fontFamily={MAP_TEXT_FONT} text="🐟" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'horse' && <Text fontFamily={MAP_TEXT_FONT} text="🐎" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'snake' && <Text fontFamily={MAP_TEXT_FONT} text="🐍" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'cattle' && <Text fontFamily={MAP_TEXT_FONT} text="🐄" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'sheep' && <Text fontFamily={MAP_TEXT_FONT} text="🐑" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'eagle' && <Text fontFamily={MAP_TEXT_FONT} text="🦅" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'wildcat' && <Text fontFamily={MAP_TEXT_FONT} text="🐆" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'cat' && <Text fontFamily={MAP_TEXT_FONT} text="🐈" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'bird' && <Text fontFamily={MAP_TEXT_FONT} text="🐦" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'tree' && <Text fontFamily={MAP_TEXT_FONT} text="🌳" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'trees' && (
                        <Group x={-iconSize / 2} y={-iconSize / 2}>
                          <Text fontFamily={MAP_TEXT_FONT} text="🌲" fontSize={iconSize} x={0} y={0} />
                          <Text fontFamily={MAP_TEXT_FONT} text="🌲" fontSize={iconSize} x={iconSize / 3} y={iconSize / 6} />
                          <Text fontFamily={MAP_TEXT_FONT} text="🌲" fontSize={iconSize} x={-iconSize / 3} y={iconSize / 6} />
                        </Group>
                      )}
                      {el.iconType === 'mountain' && <Text fontFamily={MAP_TEXT_FONT} text="⛰️" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'flower' && <Text fontFamily={MAP_TEXT_FONT} text="🌹" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'wave' && <Text fontFamily={MAP_TEXT_FONT} text="🌊" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'desert' && <Text fontFamily={MAP_TEXT_FONT} text="🏜️" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'beach' && <Text fontFamily={MAP_TEXT_FONT} text="🏖️" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'rainbow' && <Text fontFamily={MAP_TEXT_FONT} text="🌈" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'fire' && <Text fontFamily={MAP_TEXT_FONT} text="🔥" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'field' && <Text fontFamily={MAP_TEXT_FONT} text="🌾" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'traffic_light' && <Text fontFamily={MAP_TEXT_FONT} text="🚦" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'barrier' && <Text fontFamily={MAP_TEXT_FONT} text="🚧" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'bridge' && <Text fontFamily={MAP_TEXT_FONT} text="🌉" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'village' && <Text fontFamily={MAP_TEXT_FONT} text="🏘️" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'camp' && <Text fontFamily={MAP_TEXT_FONT} text="⛺" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'temple' && <Text fontFamily={MAP_TEXT_FONT} text="🏛️" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'hotel' && <Text fontFamily={MAP_TEXT_FONT} text="🏨" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'hospital' && <Text fontFamily={MAP_TEXT_FONT} text="🏥" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'factory' && <Text fontFamily={MAP_TEXT_FONT} text="🏭" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'palace' && <Text fontFamily={MAP_TEXT_FONT} text="🏰" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'park' && <Text fontFamily={MAP_TEXT_FONT} text="🎡" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'city' && <Text fontFamily={MAP_TEXT_FONT} text="🏙️" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'market' && (
                        <Group x={-iconSize / 2} y={-iconSize / 2}>
                          <Text fontFamily={MAP_TEXT_FONT} text="🍞" fontSize={iconSize} x={-iconSize / 2} y={0} />
                          <Text fontFamily={MAP_TEXT_FONT} text="☕" fontSize={iconSize} x={iconSize / 4} y={0} />
                        </Group>
                      )}
                      {el.iconType === 'car' && <Text fontFamily={MAP_TEXT_FONT} text="🚗" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'bus' && <Text fontFamily={MAP_TEXT_FONT} text="🚌" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'ambulance' && <Text fontFamily={MAP_TEXT_FONT} text="🚑" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'fire_truck' && <Text fontFamily={MAP_TEXT_FONT} text="🚒" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'truck' && <Text fontFamily={MAP_TEXT_FONT} text="🚛" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'tractor' && <Text fontFamily={MAP_TEXT_FONT} text="🚜" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'train' && <Text fontFamily={MAP_TEXT_FONT} text="🚂" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'plane' && <Text fontFamily={MAP_TEXT_FONT} text="✈️" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'ship' && <Text fontFamily={MAP_TEXT_FONT} text="🚢" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'house' && <Text fontFamily={MAP_TEXT_FONT} text="🏠" fontSize={iconSize} x={-iconSize / 2} y={-iconSize / 2} />}
                      {el.iconType === 'valley' && (
                        <Group>
                          <Line points={[0, 0, 20, 30, 40, 0]} closed fill={el.fill || '#059669'} opacity={0.6} />
                          <Line points={[10, 0, 20, 15, 30, 0]} stroke="#4a4a4a" strokeWidth={1} tension={0.5} />
                        </Group>
                      )}
                    </ErasableElement>
                  );
                }
                if (el.type === 'image') {
                  return (
                    <MapImage 
                      key={el.id}
                      el={el}
                      tool={tool}
                      onDblClick={handleDblClick}
                      onDragStart={handleDragStart}
                      onDragMove={handleDragMove}
                      onDragEnd={handleDragEnd}
                    />
                  );
                }            
                return null;
              })}
            </Layer>

            <Layer ref={uiLayerRef}>
              {/* Transformer */}
              {selectedIds.length > 0 && (
                <Transformer
                  ref={transformerRef}
                  name="transformer"
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 5 || newBox.height < 5) {
                      return oldBox;
                    }
                    return newBox;
                  }}
                  onTransformEnd={() => {
                    const updatedElements = map.elements.map(el => {
                      const node = stageRef.current.findOne('#' + el.id);
                      if (node && selectedIds.includes(el.id)) {
                        if (el.type === 'icon') {
                          const scaleX = node.scaleX();
                          const scaleY = node.scaleY();
                          const averageScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2 || 1;
                          const iconSize = Math.max(8, (el.iconSize || getDefaultMapIconSize(el.iconType)) * averageScale);
                          node.scaleX(1);
                          node.scaleY(1);

                          return {
                            ...el,
                            x: node.x(),
                            y: node.y(),
                            rotation: node.rotation(),
                            scaleX: 1,
                            scaleY: 1,
                            iconSize,
                          };
                        }

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
                  }}
                />
              )}

              {selectionRect && (
                <Rect
                  x={Math.min(selectionRect.x1, selectionRect.x2)}
                  y={Math.min(selectionRect.y1, selectionRect.y2)}
                  width={Math.abs(selectionRect.x1 - selectionRect.x2)}
                  height={Math.abs(selectionRect.y1 - selectionRect.y2)}
                  fill="rgba(0, 161, 255, 0.15)"
                  stroke="rgba(0, 161, 255, 1)"
                  strokeWidth={2}
                  dash={[4, 4]}
                  listening={false}
                />
              )}
            </Layer>
          </Stage>

          {editingTextId && editingTextPos && (
            <textarea
              className="absolute z-50 bg-white border-2 border-[var(--theme-primary)] rounded-lg shadow-2xl p-2 outline-none resize-none overflow-hidden whitespace-pre-wrap text-right"
              dir="rtl"
              value={editingTextValue}
              onChange={(e) => {
                setEditingTextValue(e.target.value);
                // Auto-resize
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onBlur={() => {
                const updatedElements = map.elements.map(e => 
                  e.id === editingTextId ? { ...e, text: editingTextValue } : e
                );
                onUpdateMap({ elements: updatedElements });
                setEditingTextId(null);
                setEditingTextPos(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
                if (e.key === 'Escape') {
                  setEditingTextId(null);
                  setEditingTextPos(null);
                }
              }}
              autoFocus
              style={{
                top: editingTextPos.y - 8,
                left: editingTextPos.x - 8,
                fontSize: (map.elements.find(e => e.id === editingTextId)?.fontSize || 20) * scale,
                color: map.elements.find(e => e.id === editingTextId)?.fill || '#000',
                fontFamily: MAP_TEXT_FONT,
                minWidth: '150px',
                maxWidth: '400px',
                transform: `rotate(${map.elements.find(e => e.id === editingTextId)?.rotation || 0}deg)`,
                transformOrigin: 'top left'
              }}
            />
          )}
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-[var(--theme-card)]/80 backdrop-blur-md p-2 rounded-2xl border border-[var(--theme-border)] shadow-xl z-10">
          <button onClick={zoomOut} className="p-2 text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-xl transition-all"><Minus size={18} /></button>
          <div className="text-xs font-bold text-[var(--theme-primary)] w-12 text-center">{Math.round(scale * 100)}%</div>
          <button onClick={zoomIn} className="p-2 text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-xl transition-all"><Plus size={18} /></button>
          <div className="h-4 w-px bg-[var(--theme-border)]/50 mx-1" />
          <button onClick={resetZoom} className="p-2 text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] rounded-xl transition-all"><Maximize size={18} /></button>
        </div>

        {/* Layer Control Panel (Left Side) */}
        {selectedIds.length > 0 && (
          <div className="absolute top-6 left-6 flex flex-col gap-2 z-10 animate-in slide-in-from-left duration-300">
            <div className="bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-2xl shadow-xl p-2 flex flex-col gap-2">
              <button 
                onClick={bringToFront}
                className="p-3 bg-[var(--theme-secondary)] hover:bg-[var(--theme-border)]/20 rounded-xl text-[var(--theme-primary)] transition-all flex flex-col items-center gap-1"
                title="הבא לקידמה"
              >
                <ChevronsUp size={20} />
              </button>
              <button 
                onClick={bringForward}
                className="p-3 bg-[var(--theme-secondary)] hover:bg-[var(--theme-border)]/20 rounded-xl text-[var(--theme-primary)] transition-all flex flex-col items-center gap-1"
                title="הבא קדימה"
              >
                <ChevronUp size={20} />
              </button>
              <button 
                onClick={sendBackward}
                className="p-3 bg-[var(--theme-secondary)] hover:bg-[var(--theme-border)]/20 rounded-xl text-[var(--theme-primary)] transition-all flex flex-col items-center gap-1"
                title="שלח אחורה"
              >
                <ChevronDown size={20} />
              </button>
              <button 
                onClick={sendToBack}
                className="p-3 bg-[var(--theme-secondary)] hover:bg-[var(--theme-border)]/20 rounded-xl text-[var(--theme-primary)] transition-all flex flex-col items-center gap-1"
                title="שלח לרקע"
              >
                <ChevronsDown size={20} />
              </button>
              <div className="h-px bg-[var(--theme-border)]/50 my-1" />
              <button 
                onClick={deleteSelected}
                className="p-3 bg-red-50 hover:bg-red-100 rounded-xl text-red-600 transition-all flex flex-col items-center gap-1"
                title="מחק"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        )}
        {/* Image Upload Choice Dialog */}
        {pendingImage && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[var(--theme-card)] rounded-[2rem] shadow-2xl p-8 max-w-sm w-full border border-[var(--theme-border)] animate-in zoom-in-95 duration-200">
              <h3 className="text-lg font-black text-[var(--theme-primary)] mb-4 text-center">איך תרצה להוסיף את התמונה?</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    onUpdateMap({ backgroundImage: pendingImage });
                    setPendingImage(null);
                  }}
                  className="w-full py-4 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-2xl font-bold flex flex-col items-center gap-1 hover:opacity-90 transition-all"
                >
                  <span className="text-sm">כרקע למפה</span>
                  <span className="text-[10px] opacity-70 font-normal">התמונה תהיה מתחת לכל האלמנטים</span>
                </button>
                <button 
                  onClick={() => {
                    const id = `el-${Date.now()}`;                    
                    const newElement: MapElement = {
                      id,
                      type: 'image',
                      imageUrl: pendingImage,
                      x: 100,
                      y: 100,
                      rotation: 0,
                      scaleX: 1,
                      scaleY: 1
                    };
                    onUpdateMap({ elements: [...map.elements, newElement] });
                    setPendingImage(null);
                    setSelectedIds([id]);
                  }}
                  className="w-full py-4 bg-[var(--theme-secondary)] text-[var(--theme-primary)] rounded-2xl font-bold flex flex-col items-center gap-1 hover:bg-[var(--theme-border)]/20 transition-all border border-[var(--theme-border)]"
                >
                  <span className="text-sm">כאלמנט על המפה</span>
                  <span className="text-[10px] opacity-70 font-normal">תוכל להזיז, להגדיל ולסובב את התמונה</span>
                </button>
                <button 
                  onClick={() => setPendingImage(null)}
                  className="w-full py-3 text-[var(--theme-primary)]/50 text-xs font-bold hover:text-[var(--theme-primary)] transition-all"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorldMapEditor;



