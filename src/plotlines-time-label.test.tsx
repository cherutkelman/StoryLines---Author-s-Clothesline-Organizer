import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import PlotlinesBoardView from '../components/board/PlotlinesBoardView';
import type { Project, Scene } from '../types';

const scene = (timeLabel?: string): Scene => ({
  id: 's1',
  plotlineId: 'p1',
  title: 'Scene',
  summary: 'Summary',
  content: '',
  position: 0,
  timeLabel,
});

const renderTree = (sourceScene: Scene, updateScene = vi.fn(), handleDragStart = vi.fn()) =>
  (PlotlinesBoardView as unknown as (props: Record<string, unknown>) => React.ReactElement)({
    boardColumns: [{ id: 'scene:s1', type: 'scene', width: 176, scene: sourceScene, sceneOrderIndex: 0 }],
    activePlotlines: [{ id: 'p1', name: 'Plotline', color: '#123456' }],
    boardProject: {
      plotlines: [{ id: 'p1', name: 'Plotline', color: '#123456' }],
      scenes: [sourceScene],
      timeline: { items: [{ id: 'timeline-s1', type: 'scene', sceneId: 's1' }] },
      bookSequence: [{ id: 'scene:s1', type: 'scene', sceneId: 's1' }],
    } satisfies Project,
    columnCount: 1,
    isPreviewMode: false,
    currentSceneIds: new Set(['s1']),
    missingPreviewSceneIds: new Set(),
    restoredDeletedSceneIds: new Set(),
    restoringDeletedSceneId: null,
    onAddScene: vi.fn(),
    onAddSceneInSequence: vi.fn(),
    updateScene,
    onDeleteScene: vi.fn(),
    onAddChapterMarker: vi.fn(),
    onUpdateChapterMarker: vi.fn(),
    onDeleteChapterMarker: vi.fn(),
    canRestoreDeletedScene: false,
    onRestoreDeletedScene: vi.fn(),
    onDragStart: handleDragStart,
    onChapterDragStart: vi.fn(),
    onDragOver: vi.fn(),
    onChapterDividerDrop: vi.fn(),
    onSceneSequenceDrop: vi.fn(),
    onSceneRowDrop: vi.fn(),
  });

type TestElement = React.ReactElement<Record<string, any>>;

const walk = (node: React.ReactNode, predicate: (element: TestElement) => boolean): TestElement | undefined => {
  if (!React.isValidElement(node)) return undefined;
  const element = node as TestElement;
  if (predicate(element)) return element;
  const children = (node.props as { children?: React.ReactNode }).children;
  for (const child of React.Children.toArray(children)) {
    const found = walk(child, predicate);
    if (found) return found;
  }
  return undefined;
};

const findTimeInput = (tree: React.ReactElement) => walk(
  tree,
  element => element.type === 'input' && Boolean((element.props as Record<string, unknown>).id?.toString().startsWith('plotline-scene-time-'))
)!;

describe('plotlines scene timeLabel editor', () => {
  it('renders a directly editable time field with an existing value', () => {
    const input = findTimeInput(renderTree(scene('The next morning')));
    expect(input.props).toMatchObject({ value: 'The next morning', readOnly: false, type: 'text' });
  });

  it('renders a valid empty field when the scene has no timeLabel', () => {
    expect(findTimeInput(renderTree(scene())).props.value).toBe('');
  });

  it('updates the Scene through updateScene and normalizes on blur', () => {
    const updateScene = vi.fn();
    const input = findTimeInput(renderTree(scene('Old'), updateScene));

    input.props.onChange({ target: { value: '  Three years earlier  ' } });
    input.props.onBlur({ currentTarget: { value: '  Three years earlier  ' } });

    expect(updateScene).toHaveBeenNthCalledWith(1, 's1', { timeLabel: '  Three years earlier  ' });
    expect(updateScene).toHaveBeenNthCalledWith(2, 's1', { timeLabel: 'Three years earlier' });
  });

  it('clears an existing timeLabel as undefined', () => {
    const updateScene = vi.fn();
    const input = findTimeInput(renderTree(scene('Old'), updateScene));

    input.props.onChange({ target: { value: '' } });
    input.props.onBlur({ currentTarget: { value: '   ' } });

    expect(updateScene).toHaveBeenCalledWith('s1', { timeLabel: undefined });
  });

  it('prevents the time editor from starting the card drag', () => {
    const handleDragStart = vi.fn();
    const tree = renderTree(scene(), vi.fn(), handleDragStart);
    const card = walk(tree, element => (element.props as Record<string, unknown>)['data-board-scene-id'] === 's1')!;
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();

    card.props.onDragStart({
      target: { closest: () => ({ dataset: { sceneTimeLabelEditor: '' } }) },
      preventDefault,
      stopPropagation,
    });

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(handleDragStart).not.toHaveBeenCalled();
  });

  it('does not require a dialog and does not write timeline or bookSequence', () => {
    const source = renderTree(scene());
    const input = findTimeInput(source);
    expect(input).toBeDefined();
    expect(input.props.onChange.toString()).not.toContain('timeline');
    expect(input.props.onChange.toString()).not.toContain('bookSequence');
  });
});
