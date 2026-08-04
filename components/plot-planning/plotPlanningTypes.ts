import { PlotStructureSubView, QuestionnaireEntry, Scene } from '../../types';

export interface PlotStructureProps {
  selectedStructure: string | undefined;
  onSelect: (id: string) => void;
  scenes: Scene[];
  pointsData: Record<string, { sceneId?: string; description?: string }>;
  onUpdatePoint: (pointId: string, data: { sceneId?: string; description?: string }) => void;
  customPlotPoints: { id: string; label: string; x: number; y: number }[];
  onUpdateCustomPoints: (points: { id: string; label: string; x: number; y: number }[]) => void;
  characterArcs: {
    id: string;
    characterName: string;
    falseBelief?: string;
    finalGoal?: string;
    steps: {
      id: string;
      text: string;
      argument?: string;
      validation?: string;
      contradiction?: string;
    }[];
    sceneLinks?: {
      id: string;
      sceneId?: string;
      sceneName?: string;
      summary?: string;
      stepNumber?: number;
      type?: 'argument' | 'validation' | 'contradiction';
    }[];
  }[];
  onUpdateArcs: (arcs: any[]) => void;
  characters: any[];
  relationships: any[];
  onUpdateRelationships: (rels: any[]) => void;
  onUpdateCharacters: (chars: any[]) => void;
  conflicts: any[];
  onUpdateConflicts: (conflicts: any[]) => void;
  twists: QuestionnaireEntry[];
  onUpdateTwists: (twists: QuestionnaireEntry[]) => void;
  initialSubView?: PlotStructureSubView;
  onSubViewChange?: (subView: PlotStructureSubView) => void;
  isLibrarySidebarCollapsed?: boolean;
}
