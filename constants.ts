
export interface Theme {
  id: string;
  name: string;
  bg: string;
  sidebarBg: string;
  cardBg: string;
  text: string;
  border: string;
  accent: string;
  secondaryText: string;
  hover: string;
}

export const THEMES: Theme[] = [
  {
    id: 'classic',
    name: 'קלאסי (קרם)',
    bg: '#fdf6e3',
    sidebarBg: '#f5e6d3',
    cardBg: '#ffffff',
    text: '#78350f', // amber-900
    border: '#fde68a', // amber-200
    accent: '#d97706', // amber-600
    secondaryText: '#92400e', // amber-800
    hover: '#fef3c7' // amber-100
  },
  {
    id: 'midnight',
    name: 'חצות (כחול עמוק)',
    bg: '#0f172a', // slate-900
    sidebarBg: '#1e293b', // slate-800
    cardBg: '#1e293b', // slate-800
    text: '#f1f5f9', // slate-100
    border: '#334155', // slate-700
    accent: '#38bdf8', // sky-400
    secondaryText: '#94a3b8', // slate-400
    hover: '#334155' // slate-700
  },
  {
    id: 'forest',
    name: 'יער (ירוק)',
    bg: '#f0fdf4', // green-50
    sidebarBg: '#dcfce7', // green-100
    cardBg: '#ffffff',
    text: '#14532d', // green-900
    border: '#bbf7d0', // green-200
    accent: '#16a34a', // green-600
    secondaryText: '#166534', // green-800
    hover: '#dcfce7' // green-100
  },
  {
    id: 'royal',
    name: 'מלכותי (סגול)',
    bg: '#faf5ff', // purple-50
    sidebarBg: '#f3e8ff', // purple-100
    cardBg: '#ffffff',
    text: '#581c87', // purple-900
    border: '#e9d5ff', // purple-200
    accent: '#9333ea', // purple-600
    secondaryText: '#6b21a8', // purple-800
    hover: '#f3e8ff' // purple-100
  },
  {
    id: 'slate',
    name: 'מודרני (אפור)',
    bg: '#f8fafc', // slate-50
    sidebarBg: '#f1f5f9', // slate-100
    cardBg: '#ffffff',
    text: '#0f172a', // slate-900
    border: '#e2e8f0', // slate-200
    accent: '#475569', // slate-600
    secondaryText: '#1e293b', // slate-800
    hover: '#f1f5f9' // slate-100
  },
  {
    id: 'sepia',
    name: 'ספיה (עתיק)',
    bg: '#f4ecd8',
    sidebarBg: '#e9dec4',
    cardBg: '#fdfaf1',
    text: '#5c4033',
    border: '#d2b48c',
    accent: '#8b4513',
    secondaryText: '#a0522d',
    hover: '#e9dec4'
  },
  {
    id: 'lavender',
    name: 'לבנדר (רך)',
    bg: '#f3e5f5',
    sidebarBg: '#e1bee7',
    cardBg: '#ffffff',
    text: '#4a148c',
    border: '#ce93d8',
    accent: '#9c27b0',
    secondaryText: '#7b1fa2',
    hover: '#f3e5f5'
  },
  {
    id: 'cyberpunk',
    name: 'סייברפאנק (כהה)',
    bg: '#050505',
    sidebarBg: '#121212',
    cardBg: '#1a1a1a',
    text: '#00ff00',
    border: '#333333',
    accent: '#ff00ff',
    secondaryText: '#00ffff',
    hover: '#222222'
  }
];
