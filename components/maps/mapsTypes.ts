import {
  Book,
  CharacterDiagram,
  CharacterMapConnection,
  MapGallery,
  MindMap,
  QuestionnaireEntry,
  WorldMap,
} from '../../types';
import { MapTabId } from './mapsDefinitions';

export interface MapsManagerProps {
  allBooks: Book[];
  activeBookId: string;
  characters: QuestionnaireEntry[];
  places: QuestionnaireEntry[];
  connections: CharacterMapConnection[];
  characterMaps: CharacterDiagram[];
  maps: WorldMap[];
  mindMaps: MindMap[];
  mapGallery?: MapGallery;
  onUpdateCharacters: (characters: QuestionnaireEntry[]) => void;
  onUpdateConnections: (connections: CharacterMapConnection[]) => void;
  onUpdateCharacterMaps: (maps: CharacterDiagram[]) => void;
  onUpdateMaps: (maps: WorldMap[]) => void;
  onUpdateMindMaps: (mindMaps: MindMap[]) => void;
  onUpdateMapGallery: (gallery: MapGallery) => void;
  initialTab?: MapTabId;
  onTabChange?: (tab: MapTabId) => void;
  selectedMapId?: string | null;
  onMapSelect?: (id: string | null) => void;
  selectedMindMapId?: string | null;
  onMindMapSelect?: (id: string | null) => void;
  selectedCharacterMapId?: string | null;
  onCharacterMapSelect?: (id: string | null) => void;
}
