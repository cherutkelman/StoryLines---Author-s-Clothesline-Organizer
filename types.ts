
export interface Scene {
  id: string;
  plotlineId: string;
  title: string;
  content: string;
  position: number; // Order within the plotline
  isCompleted?: boolean; // Whether the scene is marked as finished
}

export interface Plotline {
  id: string;
  name: string;
  color: string;
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
}

export interface CharacterMapConnection {
  id: string;
  fromId: string;
  toId: string;
  description: string;
}

export interface Project {
  plotlines: Plotline[];
  scenes: Scene[];
  characters?: QuestionnaireEntry[];
  places?: QuestionnaireEntry[];
  periods?: QuestionnaireEntry[];
  twists?: QuestionnaireEntry[];
  fantasyWorlds?: QuestionnaireEntry[];
  characterMapConnections?: CharacterMapConnection[];
}

export interface Book extends Project {
  id: string;
  title: string;
  lastModified: number;
  uiState?: {
    lastView?: 'board' | 'editor' | 'questionnaires' | 'characterMap';
    editorFocusedSceneId?: string | null;
    editorDisplayMode?: 'full' | 'focus';
    questionnaireActiveTab?: 'characters' | 'places' | 'periods' | 'twists' | 'fantasyWorlds';
    questionnaireSelectedEntryId?: string | null;
    boardZoomLevel?: number;
  };
}
