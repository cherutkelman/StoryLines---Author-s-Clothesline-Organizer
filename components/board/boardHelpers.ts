import { Project } from '../../types';
import { BoardChapter } from './boardTypes';

export const buildBoardChapters = (project: Project, visiblePlotlineIds: string[]): BoardChapter[] => {
  const sortedMarkers = [...(project.chapterMarkers || [])].sort((a, b) => a.position - b.position);
  const chapters: BoardChapter[] = [];
  const visibleScenes = project.scenes.filter(scene => visiblePlotlineIds.includes(scene.plotlineId));

  if (sortedMarkers.length === 0) {
    chapters.push({ id: 'default', title: 'כל הסצנות', scenes: visibleScenes });
    return chapters;
  }
  if (sortedMarkers[0].position > 0) {
    chapters.push({ id: 'prologue', title: 'פתיחה', scenes: visibleScenes.filter(scene => scene.position < sortedMarkers[0].position) });
  }
  sortedMarkers.forEach((marker, index) => {
    const nextMarker = sortedMarkers[index + 1];
    const scenes = visibleScenes.filter(scene => scene.position >= marker.position && (!nextMarker || scene.position < nextMarker.position)).sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      const firstPlotlineIndex = project.plotlines.findIndex(plotline => plotline.id === a.plotlineId);
      const secondPlotlineIndex = project.plotlines.findIndex(plotline => plotline.id === b.plotlineId);
      return firstPlotlineIndex - secondPlotlineIndex;
    });
    chapters.push({ id: marker.id, title: marker.title, scenes, isEditable: true });
  });
  return chapters;
};
