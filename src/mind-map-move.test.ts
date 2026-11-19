import { describe, expect, it } from 'vitest';
import type { MindMap, MindMapEdge, MindMapNode } from '../types';
import { buildMindMapIdeas } from './mind-map-ideas';
import { inspectMindMapMove, moveMindMapIdea } from './mind-map-move';

const node = (id: string, type: MindMapNode['type'] = 'circle'): MindMapNode =>
  Object.freeze({ id, type, text: `רעיון ${id}`, x: 10, y: -90, ...(id === 'root' ? { isRoot: true } : {}) });
const edge = (fromId: string, toId: string, id = `${fromId}:${toId}`): MindMapEdge => Object.freeze({ id, fromId, toId });
const map = (...edges: MindMapEdge[]): MindMap => ({
  id: 'm', name: 'מפה', nodes: ['root', 'a', 'b', 'idea', 'child', 'detached', 'x', 'y'].map(id => node(id))
    .concat(node('square', 'square')),
  edges,
});
const regular = () => map(edge('root', 'a'), edge('root', 'b'), edge('a', 'idea'), edge('idea', 'child'));

describe('moving a mind map idea', () => {
  it('replaces only the parent edge and keeps its identity, descendants and node data', () => {
    const original = regular();
    Object.freeze(original.edges);
    Object.freeze(original.nodes);
    const result = moveMindMapIdea(original, 'idea', 'b');
    expect(result).toEqual({ ok: true, edges: [
      original.edges[0], original.edges[1], edge('b', 'idea', 'a:idea'), original.edges[3],
    ] });
    if (!result.ok) throw new Error('Move failed');
    expect(result.edges[3]).toBe(original.edges[3]);
    const tree = buildMindMapIdeas(original.nodes, result.edges);
    expect(tree.main.find(row => row.node.id === 'idea')).toMatchObject({ parentId: 'b', childCount: 1 });
    expect(tree.main.find(row => row.node.id === 'child')?.node).toBe(original.nodes[4]);
    expect(original.nodes[3]).toEqual(node('idea'));
    expect(original.edges[2]).toEqual(edge('a', 'idea'));
  });

  it('attaches a parentless component with a new, collision-free edge and keeps its subtree', () => {
    const original = map(edge('root', 'a', 'edge-42'), edge('detached', 'child'));
    const result = moveMindMapIdea(original, 'detached', 'a', 42);
    expect(result).toEqual({ ok: true, edges: [...original.edges, edge('a', 'detached', 'edge-43')] });
    expect(moveMindMapIdea(original, 'detached', 'child')).toEqual({ ok: false, reason: 'descendant' });
  });

  it.each([
    ['root', 'a', 'root'], ['idea', 'idea', 'self'], ['idea', 'child', 'descendant'],
    ['idea', 'a', 'alreadyParent'], ['idea', 'square', 'shape'], ['idea', 'missing', 'missingParent'],
    ['missing', 'b', 'missingIdea'],
  ])('blocks moving %s to %s with %s', (idea, parent, reason) => {
    expect(moveMindMapIdea(regular(), idea, parent)).toEqual({ ok: false, reason });
  });

  it.each([
    [[edge('a', 'idea'), edge('b', 'idea')], 'multipleParents'],
    [[edge('a', 'idea'), edge('a', 'idea', 'duplicate')], 'duplicate'],
    [[edge('a', 'idea'), edge('idea', 'a')], 'cycle'],
    [[edge('missing', 'idea')], 'missingEndpoint'],
    [[edge('idea', 'missing')], 'missingEndpoint'],
  ] as const)('blocks ambiguous or invalid imported connections', (edges, reason) => {
    expect(moveMindMapIdea(map(...edges), 'idea', 'root')).toEqual({ ok: false, reason });
  });

  it('checks the target component and preserves a separate malformed component', () => {
    const original = regular();
    const cycle = [edge('x', 'y'), edge('y', 'x')];
    original.edges.push(...cycle);
    expect(inspectMindMapMove(original, 'idea').targetIssue('x')).toBe('cycle');
    const result = moveMindMapIdea(original, 'idea', 'b');
    if (!result.ok) throw new Error('Move failed');
    expect(result.edges.slice(-2)).toEqual(cycle);
    expect(result.edges.at(-1)).toBe(cycle[1]);
  });
});
