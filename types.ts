
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
  data: Record<string, string>; // Questions and their answers
}

export interface Project {
  plotlines: Plotline[];
  scenes: Scene[];
  characters?: QuestionnaireEntry[];
  places?: QuestionnaireEntry[];
  periods?: QuestionnaireEntry[];
}

export interface Book extends Project {
  id: string;
  title: string;
  lastModified: number;
}
