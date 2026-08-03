import React, { useEffect, useState } from 'react';
import { PlotStructureSubView } from '../types';
import PlotPlanningNavigation from './plot-planning/PlotPlanningNavigation';
import RelationshipArcEditor from './plot-planning/RelationshipArcEditor';
import { PlotStructureProps } from './plot-planning/plotPlanningTypes';
import PlotStructureEditor from './plot-planning/PlotStructureEditor';
import ConflictEditor from './plot-planning/ConflictEditor';
import CharacterArcEditor from './plot-planning/CharacterArcEditor';

const PlotStructure: React.FC<PlotStructureProps> = ({ 
  selectedStructure, 
  onSelect, 
  pointsData, 
  onUpdatePoint,
  customPlotPoints,
  onUpdateCustomPoints,
  characterArcs,
  onUpdateArcs,
  characters,
  relationships,
  onUpdateRelationships,
  onUpdateCharacters,
  conflicts = [],
  onUpdateConflicts,
  initialSubView,
  onSubViewChange,
  isLibrarySidebarCollapsed = false,
  scenes = []
}) => {
  const [activeSubView, setActiveSubView] = useState<PlotStructureSubView>(initialSubView || 'structure');
  const [editingPointId, setEditingPointId] = useState<string | null>(null);

  useEffect(() => {
    if (!initialSubView || initialSubView === activeSubView) return;
    setActiveSubView(initialSubView);
  }, [initialSubView, activeSubView]);

  const handleSubViewChange = (subView: PlotStructureSubView) => {
    setActiveSubView(subView);
    onSubViewChange?.(subView);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--theme-bg)] p-8 overflow-y-auto">
      <div className={`${isLibrarySidebarCollapsed ? 'max-w-7xl' : 'max-w-5xl'} mx-auto w-full space-y-8 pb-20`}>
        <PlotPlanningNavigation activeSubView={activeSubView} onChange={handleSubViewChange} />

        {activeSubView === 'structure' ? (
          <PlotStructureEditor
            selectedStructure={selectedStructure}
            onSelect={onSelect}
            scenes={scenes}
            pointsData={pointsData}
            onUpdatePoint={onUpdatePoint}
            customPlotPoints={customPlotPoints}
            onUpdateCustomPoints={onUpdateCustomPoints}
            editingPointId={editingPointId}
            setEditingPointId={setEditingPointId}
          />
        ) : activeSubView === 'arc' ? (
          <CharacterArcEditor
            characterArcs={characterArcs}
            onUpdateArcs={onUpdateArcs}
            scenes={scenes}
            isLibrarySidebarCollapsed={isLibrarySidebarCollapsed}
          />
        ) : activeSubView === 'relationships' ? (
          <RelationshipArcEditor
            relationships={relationships}
            characters={characters}
            scenes={scenes}
            onUpdateRelationships={onUpdateRelationships}
            onUpdateCharacters={onUpdateCharacters}
          />
        ) : (
          <ConflictEditor
            conflicts={conflicts}
            onUpdateConflicts={onUpdateConflicts}
            scenes={scenes}
            isLibrarySidebarCollapsed={isLibrarySidebarCollapsed}
          />
        )}
      </div>
    </div>
  );
};

export default PlotStructure;
