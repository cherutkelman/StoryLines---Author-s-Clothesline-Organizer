export interface TimelineSelectionState {
  isSelectionMode: boolean;
  selectedSceneIds: Set<string>;
}

export type TimelineSelectionAction =
  | { type: 'enter' }
  | { type: 'toggle'; sceneId: string }
  | { type: 'clear' }
  | { type: 'exit' };

export const initialTimelineSelectionState = (): TimelineSelectionState => ({
  isSelectionMode: false,
  selectedSceneIds: new Set(),
});

export const timelineSelectionReducer = (
  state: TimelineSelectionState,
  action: TimelineSelectionAction
): TimelineSelectionState => {
  switch (action.type) {
    case 'enter':
      return { ...state, isSelectionMode: true };
    case 'toggle': {
      if (!state.isSelectionMode) return state;
      const selectedSceneIds = new Set(state.selectedSceneIds);
      if (selectedSceneIds.has(action.sceneId)) {
        selectedSceneIds.delete(action.sceneId);
      } else {
        selectedSceneIds.add(action.sceneId);
      }
      return { ...state, selectedSceneIds };
    }
    case 'clear':
      return { ...state, selectedSceneIds: new Set() };
    case 'exit':
      return initialTimelineSelectionState();
  }
};
