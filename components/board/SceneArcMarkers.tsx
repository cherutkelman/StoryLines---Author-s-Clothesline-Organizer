import React from 'react';
import { Circle, Diamond, Hexagon, Square, Triangle } from 'lucide-react';
import { Project } from '../../types';

const TrapezoidIcon: React.FC<{ size?: number; className?: string }> = ({ size = 11, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M6 5h12l4 14H2L6 5Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

const SceneArcMarkers: React.FC<{ project: Project; sceneId: string }> = ({ project, sceneId }) => {
  const linkedTypes = new Set<'argument' | 'validation' | 'contradiction' | 'needReason' | 'obstacle' | 'resolution'>();
  (project.characterArcs || []).forEach(arc => (arc.sceneLinks || []).forEach(link => {
    if (link.sceneId === sceneId) linkedTypes.add(link.type || 'argument');
  }));
  (project.conflicts || []).forEach(conflict => (conflict.rows || []).forEach(row => {
    (row.needReasonScenes ?? row.goalScenes ?? []).forEach(link => { if (link.sceneId === sceneId) linkedTypes.add('needReason'); });
    (row.obstacleScenes || []).forEach(link => { if (link.sceneId === sceneId) linkedTypes.add('obstacle'); });
    (row.resolutionScenes || []).forEach(link => { if (link.sceneId === sceneId) linkedTypes.add('resolution'); });
  }));

  const markers = [
    { type: 'argument' as const, title: 'טיעון לאמונה השקרית', className: 'text-blue-500 bg-blue-50 border-blue-200', icon: <Square size={11} className="fill-blue-500/20" /> },
    { type: 'validation' as const, title: 'הוכחה לטיעון', className: 'text-orange-500 bg-orange-50 border-orange-200', icon: <Triangle size={11} className="fill-orange-500/20" /> },
    { type: 'contradiction' as const, title: 'הפרכת הטיעון', className: 'text-green-500 bg-green-50 border-green-200', icon: <Circle size={11} className="fill-green-500/20" /> },
    { type: 'needReason' as const, title: 'טיעון לצורך במטרה', className: 'text-purple-500 bg-purple-50 border-purple-200', icon: <Diamond size={11} className="fill-purple-500/20" /> },
    { type: 'obstacle' as const, title: 'בעיה בדרך להשגת המטרה', className: 'text-rose-500 bg-rose-50 border-rose-200', icon: <TrapezoidIcon size={11} /> },
    { type: 'resolution' as const, title: 'הישג בדרך לפתרון ולהצלחה', className: 'text-cyan-500 bg-cyan-50 border-cyan-200', icon: <Hexagon size={11} className="fill-cyan-500/20" /> },
  ].filter(marker => linkedTypes.has(marker.type));

  if (markers.length === 0) return null;
  return (
    <div className="absolute bottom-8 left-2 z-20 flex max-w-[72px] flex-wrap items-center gap-1">
      {markers.map(marker => (
        <span key={marker.type} title={marker.title} className={`w-5 h-5 rounded-md border shadow-sm flex items-center justify-center ${marker.className}`}>
          {marker.icon}
        </span>
      ))}
    </div>
  );
};

export default SceneArcMarkers;
