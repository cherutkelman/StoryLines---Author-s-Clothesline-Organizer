import { Map as MapIcon, Share2, Users, type LucideIcon } from 'lucide-react';

export type MapTabId = 'characterDiagram' | 'worldMaps' | 'mindMaps';

export const MAP_NAV_ITEMS: { id: MapTabId; label: string; icon: LucideIcon }[] = [
  { id: 'characterDiagram', label: 'מפת דמויות', icon: Users },
  { id: 'worldMaps', label: 'מפות עולם', icon: MapIcon },
  { id: 'mindMaps', label: 'מפות חשיבה', icon: Share2 },
];
