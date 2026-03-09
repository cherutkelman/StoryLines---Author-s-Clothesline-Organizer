
export const THEMES = {
  classic: {
    name: 'קלאסי',
    bg: '#fdf6e3',
    card: '#ffffff',
    primary: '#78350f',
    accent: '#92400e',
    secondary: '#fffbeb', // Changed from #fef3c7 to #fffbeb (amber-50)
    border: '#fde68a',
    text: '#4a4a4a',
    muted: '#92400e99'
  },
  midnight: {
    name: 'חצות',
    bg: '#0f172a',
    card: '#1e293b',
    primary: '#f8fafc',
    accent: '#38bdf8',
    secondary: '#334155',
    border: '#475569',
    text: '#cbd5e1',
    muted: '#94a3b8'
  },
  rose: {
    name: 'ורד',
    bg: '#fff1f2',
    card: '#ffffff',
    primary: '#881337',
    accent: '#be123c',
    secondary: '#ffe4e6',
    border: '#fecdd3',
    text: '#4c0519',
    muted: '#be123c99'
  },
  forest: {
    name: 'יער',
    bg: '#f0fdf4',
    card: '#ffffff',
    primary: '#064e3b',
    accent: '#059669',
    secondary: '#dcfce7',
    border: '#bbf7d0',
    text: '#064e3b',
    muted: '#05966999'
  }
};

export interface Scene {
  id: string;
  plotlineId: string;
  title: string;
  content: string;
  position: number; // Order within the plotline
  isCompleted?: boolean; // Whether the scene is marked as finished
  chapterTitle?: string;
}

export interface Plotline {
  id: string;
  name: string;
  color: string;
}

export interface DevelopmentStage {
  id: string;
  title: string;
  data: Record<string, string>;
}

export interface SpecialItem {
  id: string;
  name: string;
  data: Record<string, string>;
}

export interface UniquePower {
  id: string;
  name: string;
  data: Record<string, string>;
}

export interface SpecificLocation {
  id: string;
  name: string;
  data: Record<string, string>;
}

export interface LoreItem {
  id: string;
  title: string;
  content: string;
}

export interface QuestionnaireEntry {
  id: string;
  name: string;
  role?: string; // For categorization (e.g., main character, family)
  imageUrl?: string; // Unified image field
  x?: number; // Spatial X for character map
  y?: number; // Spatial Y for character map
  parentId?: string; // For nested entries (e.g., micro places within macro)
  data: Record<string, string>; // Questions and their answers
  customFields?: { id: string; label: string }[]; // User-defined questions
  developmentStages?: DevelopmentStage[]; // For character development tracking
  specialItems?: SpecialItem[]; // For fantasy world special items
  uniquePowers?: UniquePower[]; // For fantasy world unique powers
  specificLocations?: SpecificLocation[]; // For geographical locations
  loreItems?: LoreItem[]; // For background lore items
}

export interface CharacterMapConnection {
  id: string;
  fromId: string;
  toId: string;
  description: string;
  labelPosition?: number; // 0 to 1, default 0.5
}

export interface MapElement {
  id: string;
  type: 'icon' | 'text' | 'line';
  x: number;
  y: number;
  iconType?: 'house' | 'houses' | 'tree' | 'trees' | 'mountain' | 'valley' | 'buildings' | 'palace' | 'bridge' | 'animal';
  text?: string;
  points?: number[]; // For lines (road, river, pool)
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  fontSize?: number;
  questionnaireId?: string;
  isPlace?: boolean;
}

export interface WorldMap {
  id: string;
  name: string;
  backgroundImage?: string; // Base64 uploaded image
  elements: MapElement[];
}

export interface MindMapNode {
  id: string;
  x: number;
  y: number;
  text: string;
  type: 'circle' | 'square';
  isRoot?: boolean;
}

export interface MindMapEdge {
  id: string;
  fromId: string;
  toId: string;
}

export interface MindMap {
  id: string;
  name: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

export interface Project {
  plotlines: Plotline[];
  scenes: Scene[];
  summary?: string;
  characters?: QuestionnaireEntry[];
  places?: QuestionnaireEntry[];
  periods?: QuestionnaireEntry[];
  twists?: QuestionnaireEntry[];
  fantasyWorlds?: QuestionnaireEntry[];
  backgrounds?: QuestionnaireEntry[];
  characterMapConnections?: CharacterMapConnection[];
  maps?: WorldMap[];
  mindMaps?: MindMap[];
}

export interface Book extends Project {
  id: string;
  title: string;
  universeId?: string;
  lastModified: number;
  uiState?: {
    lastView?: 'board' | 'editor' | 'questionnaires' | 'maps';
    editorFocusedSceneId?: string | null;
    editorDisplayMode?: 'full' | 'focus';
    questionnaireActiveTab?: 'characters' | 'places' | 'periods' | 'twists' | 'fantasyWorlds' | 'backgrounds';
    questionnaireSelectedEntryId?: string | null;
    boardZoomLevel?: number;
    mapsActiveTab?: 'characterDiagram' | 'worldMaps' | 'mindMaps';
    mapsSelectedMapId?: string | null;
    mapsSelectedMindMapId?: string | null;
    theme?: keyof typeof THEMES;
  };
}
