import { Clock, FileText, MapPin, Share2, User, Wand2, Zap, type LucideIcon } from 'lucide-react';

export type QuestionnaireTabId = 'characters' | 'relationships' | 'places' | 'periods' | 'twists' | 'fantasyWorlds' | 'backgrounds';

export const QUESTIONNAIRE_NAV_ITEMS: { id: QuestionnaireTabId; label: string; icon: LucideIcon }[] = [
  { id: 'characters', label: 'דמויות', icon: User },
  { id: 'relationships', label: 'מערכות יחסים', icon: Share2 },
  { id: 'places', label: 'מקומות', icon: MapPin },
  { id: 'periods', label: 'תקופות', icon: Clock },
  { id: 'twists', label: 'טוויסטים', icon: Zap },
  { id: 'fantasyWorlds', label: 'עולם פנטזיה', icon: Wand2 },
  { id: 'backgrounds', label: 'רקע', icon: FileText },
];
