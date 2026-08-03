import {
  Book,
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
  maps: WorldMap[];
  mindMaps: MindMap[];
  mapGallery?: MapGallery;
  onUpdateCharacters: (characters: QuestionnaireEntry[]) => void;
  onUpdateConnections: (connections: CharacterMapConnection[]) => void;
  onUpdateMaps: (maps: WorldMap[]) => void;
  onUpdateMindMaps: (mindMaps: MindMap[]) => void;
  onUpdateMapGallery: (gallery: MapGallery) => void;
  initialTab?: MapTabId;
  onTabChange?: (tab: MapTabId) => void;
  selectedMapId?: string | null;
  onMapSelect?: (id: string | null) => void;
  selectedMindMapId?: string | null;
  onMindMapSelect?: (id: string | null) => void;
}
