import { describe, expect, it } from 'vitest';
import { addMindMapBranch, buildMindMapIdeas, createMindMapRoot, deleteMindMapIdea, visibleMindMapIdeas } from './mind-map-ideas';
import type { MindMapEdge, MindMapNode } from '../types';

const root = Object.freeze(createMindMapRoot(200, 150));
const node = (id: string): MindMapNode => Object.freeze({ id, x: 30, y: 90, text: id, type: 'square' });
const edge = (fromId: string, toId: string): MindMapEdge => Object.freeze({ id: `${fromId}:${toId}`, fromId, toId });
const ids = (rows: ReturnType<typeof buildMindMapIdeas>['main']) => rows.map(row => row.node.id);

describe('mind map idea hierarchy', () => {
  it('handles an empty map and a map with only a root', () => {
    expect(buildMindMapIdeas([], [])).toMatchObject({ main: [], detached: [], missingEdges: 0 });
    expect(ids(buildMindMapIdeas([root], []).main)).toEqual([root.id]);
  });

  it('preserves ids and connected levels and can collapse or reopen any branch', () => {
    const nodes = Object.freeze([node('a'), root, node('b'), node('c')]);
    const edges = Object.freeze([edge(root.id, 'a'), edge('a', 'b'), edge(root.id, 'c')]);
    const { main } = buildMindMapIdeas(nodes, edges);
    expect(main.map(row => [row.node.id, row.depth])).toEqual([[root.id, 0], ['a', 1], ['b', 2], ['c', 1]]);
    expect(ids(visibleMindMapIdeas(main, new Set(['a'])))).toEqual([root.id, 'a', 'c']);
    expect(ids(visibleMindMapIdeas(main, new Set([root.id])))).toEqual([root.id]);
    expect(ids(visibleMindMapIdeas(main, new Set()))).toEqual([root.id, 'a', 'b', 'c']);
    expect(main[1].node).toBe(nodes[0]);
    expect(edges).toHaveLength(3);
  });

  it('shows every detached component including a cycle, and keeps additional roots', () => {
    const anotherRoot = { ...node('second'), isRoot: true };
    const tree = buildMindMapIdeas([root, node('leaf'), anotherRoot, node('isolated'), node('x'), node('y')], [
      edge('second', 'leaf'), edge('x', 'y'), edge('y', 'x'),
    ]);
    expect(tree.rootCount).toBe(2);
    expect(ids(tree.main)).toEqual([root.id]);
    expect(ids(tree.detached)).toEqual(['second', 'leaf', 'isolated', 'x', 'y']);
    expect(tree.detached.at(-2)?.otherIncoming).toEqual([edge('y', 'x')]);
  });

  it('keeps secondary parents and self-links visible as extra edges without duplicating ideas or inventing nodes', () => {
    const tree = buildMindMapIdeas([root, node('a'), node('b'), node('c')], [
      edge(root.id, 'a'), edge(root.id, 'b'), edge('a', 'c'), edge('b', 'c'),
      edge('c', root.id), edge('c', 'c'), edge('c', 'missing'), edge('otherMissing', 'a'),
    ]);
    expect(ids(tree.main)).toEqual([root.id, 'a', 'c', 'b']);
    expect(tree.main.find(row => row.node.id === 'c')).toMatchObject({
      parentId: 'a', otherIncoming: [edge('b', 'c'), edge('c', 'c')],
    });
    expect(tree.main[0].otherIncoming).toEqual([edge('c', root.id)]);
    expect(tree.missingEdges).toBe(2);
    expect(tree.byId.has('missing')).toBe(false);
  });

  it('uses the first stored idea as a display entry when an imported map has no marked root', () => {
    const tree = buildMindMapIdeas([node('imported-a'), node('imported-b')], [edge('imported-a', 'imported-b')]);
    expect(tree.rootCount).toBe(0);
    expect(ids(tree.main)).toEqual(['imported-a', 'imported-b']);
  });

  it('creates the branch using existing desktop geometry and leaves current positions untouched', () => {
    const map = { id: 'map', name: 'Map', nodes: [root, node('leaf')], edges: [edge(root.id, 'leaf')] };
    expect(addMindMapBranch(map, 'leaf', 123)).toBeUndefined();
    expect(addMindMapBranch(map, 'missing', 123)).toBeUndefined();
    const next = addMindMapBranch(map, root.id, 123)!;
    expect(next.nodes).toEqual([...map.nodes, {
      id: 'node-123', x: 350, y: 150, text: 'רעיון חדש', type: 'square',
    }]);
    expect(next.edges[1]).toEqual({ id: 'edge-123', fromId: root.id, toId: 'node-123' });
    expect(next.nodes[0]).toBe(root);
    expect(map.nodes).toHaveLength(2);
  });
});

describe('deleting a single mind map idea', () => {
  const map = (nodes: MindMapNode[], edges: MindMapEdge[]) => ({
    id: 'm', name: 'מפה', nodes, edges,
  });

  it('deletes a leaf and its incident edge only', () => {
    const original = map([root, node('leaf'), node('sibling')], [edge(root.id, 'leaf'), edge(root.id, 'sibling')]);
    expect(deleteMindMapIdea(original, 'leaf')).toEqual({ nodes: [root, original.nodes[2]], edges: [original.edges[1]] });
    expect(original.nodes).toHaveLength(3);
  });

  it.each([1, 3])('keeps %i children and later generations with their original positions and links', children => {
    const surviving = [...Array.from({ length: children }, (_, index) => node(`child-${index}`)), node('grandchild'), node('great-grandchild')];
    const internal = [edge('child-0', 'grandchild'), edge('grandchild', 'great-grandchild')];
    const original = map([root, node('parent'), ...surviving], [
      edge(root.id, 'parent'), ...surviving.slice(0, children).map(child => edge('parent', child.id)), ...internal,
    ]);
    const result = deleteMindMapIdea(original, 'parent')!;
    expect(result.nodes).toEqual([root, ...surviving]);
    result.nodes.slice(1).forEach((item, index) => expect(item).toBe(surviving[index]));
    expect(result.edges).toEqual(internal);
    expect(result.edges[0]).toBe(internal[0]);
    const tree = buildMindMapIdeas(result.nodes, result.edges);
    expect(ids(tree.main)).toEqual([root.id]);
    expect(ids(tree.detached)).toEqual(expect.arrayContaining(surviving.map(item => item.id)));
  });

  it('handles multiple parents, cycles and missing endpoints without changing unrelated links', () => {
    const remaining = [edge(root.id, 'alternate'), edge('alternate', 'child'), edge('child', 'missing')];
    const original = map([root, node('alternate'), node('parent'), node('child')], [
      ...remaining, edge(root.id, 'parent'), edge('alternate', 'parent'), edge('parent', 'child'),
      edge('child', 'parent'), edge('parent', 'missing'),
    ]);
    const result = deleteMindMapIdea(original, 'parent')!;
    expect(result.edges).toEqual(remaining);
    expect(ids(buildMindMapIdeas(result.nodes, result.edges).main)).toContain('child');
    expect(original.edges).toHaveLength(8);
  });

  it('blocks any marked root, a missing idea and an ambiguous duplicate id', () => {
    const anotherRoot = { ...node('second'), isRoot: true };
    const original = map([root, anotherRoot, node('duplicate'), node('duplicate')], []);
    for (const id of [root.id, anotherRoot.id, 'missing', 'duplicate']) {
      expect(deleteMindMapIdea(original, id)).toBeUndefined();
    }
  });
});
