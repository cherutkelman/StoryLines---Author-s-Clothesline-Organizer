import React from 'react';
import { Project } from '../../types';

const SceneArcMarkers: React.FC<{ project: Project; sceneId: string }> = ({ project, sceneId }) => {
  const linkedTypes = new Set<'argument' | 'validation' | 'contradiction' | 'needReason' | 'obstacle' | 'resolution'>();
  (project.characterArcs || []).forEach(arc => (arc.sceneLinks || []).forEach(link => {
    const type = link.type || 'argument';
    if (link.sceneId === sceneId && ['argument', 'validation', 'contradiction'].includes(type)) {
      linkedTypes.add(type as 'argument' | 'validation' | 'contradiction');
    }
  }));
  (project.conflicts || []).forEach(conflict => (conflict.rows || []).forEach(row => {
    (row.needReasonScenes ?? row.goalScenes ?? []).forEach(link => { if (link.sceneId === sceneId) linkedTypes.add('needReason'); });
    (row.obstacleScenes || []).forEach(link => { if (link.sceneId === sceneId) linkedTypes.add('obstacle'); });
    (row.resolutionScenes || []).forEach(link => { if (link.sceneId === sceneId) linkedTypes.add('resolution'); });
  }));

  const markers = [
    { type: 'argument' as const, title: 'טיעון לאמונה השקרית', className: 'text-blue-500 bg-blue-50 border-blue-200', icon: <span className="text-[9px] font-black">ט</span> },
    { type: 'validation' as const, title: 'הוכחה לאמונה החדשה', className: 'text-orange-500 bg-orange-50 border-orange-200', icon: <span className="text-[9px] font-black">ה</span> },
    { type: 'contradiction' as const, title: 'הפרכת הטיעון', className: 'text-green-500 bg-green-50 border-green-200', icon: <span className="text-[8px] font-black">הפ</span> },
    { type: 'needReason' as const, title: 'סיבה להשגת המטרה', className: 'text-purple-500 bg-purple-50 border-purple-200', icon: <span className="text-[8px] font-black">ס</span> },
    { type: 'obstacle' as const, title: 'בעיה בדרך להשגת המטרה', className: 'text-rose-500 bg-rose-50 border-rose-200', icon: <span className="text-[8px] font-black">ב</span> },
    { type: 'resolution' as const, title: 'פתרון לבעיה', className: 'text-cyan-500 bg-cyan-50 border-cyan-200', icon: <span className="text-[8px] font-black">פ</span> },
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
