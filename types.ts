
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
  imageUrl?: string; // Unified image field
  x?: number; // Spatial X for character map
  y?: number; // Spatial Y for character map
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
}
