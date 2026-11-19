import type { MindMap, MindMapEdge, MindMapNode } from '../types';

export interface IdeaRow {
  node: MindMapNode;
  depth: number;
  parentId?: string;
  childCount: number;
  otherIncoming: MindMapEdge[];
}

export function buildMindMapIdeas(nodes: readonly MindMapNode[], edges: readonly MindMapEdge[]) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const outgoing = new Map<string, MindMapEdge[]>();
  const incoming = new Map<string, MindMapEdge[]>();
  let missingEdges = 0;
  for (const edge of edges) {
    if (!byId.has(edge.fromId) || !byId.has(edge.toId)) {
      missingEdges++;
      continue;
    }
    if (!outgoing.has(edge.fromId)) outgoing.set(edge.fromId, []);
    if (!incoming.has(edge.toId)) incoming.set(edge.toId, []);
    outgoing.get(edge.fromId)!.push(edge);
    incoming.get(edge.toId)!.push(edge);
  }
  const visited = new Map<string, IdeaRow>();
  const walk = (start: string, rows: IdeaRow[]) => {
    const pending: { id: string; depth: number; via?: MindMapEdge }[] = [{ id: start, depth: 0 }];
    while (pending.length) {
      const { id, depth, via } = pending.pop()!;
      if (visited.has(id)) continue;
      const row: IdeaRow = {
        node: byId.get(id)!, depth, parentId: via?.fromId, childCount: 0,
        otherIncoming: (incoming.get(id) ?? []).filter(edge => edge !== via),
      };
      visited.set(id, row);
      rows.push(row);
      if (via) visited.get(via.fromId)!.childCount++;
      const children = outgoing.get(id) ?? [];
      for (let index = children.length - 1; index >= 0; index--) {
        const edge = children[index];
        pending.push({ id: edge.toId, depth: depth + 1, via: edge });
      }
    }
  };
  const main: IdeaRow[] = [];
  const detached: IdeaRow[] = [];
  const markedRoots = nodes.filter(node => node.isRoot);
  const root = markedRoots[0] ?? nodes[0];
  if (root) walk(root.id, main);
  // Start disconnected components at their real roots where possible,
  // then include any cyclic components with no entry node.
  const detachedIds = new Set(nodes.filter(node => !visited.has(node.id)).map(node => node.id));
  for (const id of detachedIds) {
    if (!(incoming.get(id) ?? []).some(edge => detachedIds.has(edge.fromId))) walk(id, detached);
  }
  for (const id of detachedIds) walk(id, detached);
  return { main, detached, byId, missingEdges, rootCount: markedRoots.length };
}

export function visibleMindMapIdeas(rows: readonly IdeaRow[], collapsed: ReadonlySet<string>) {
  const hidden = new Set<string>();
  return rows.filter(({ node, parentId }) => {
    if (parentId === undefined || (!hidden.has(parentId) && !collapsed.has(parentId))) return true;
    hidden.add(node.id);
    return false;
  });
}

export function createMindMapRoot(x: number, y: number): MindMapNode {
  return { id: 'root', x, y, text: 'נושא מרכזי', type: 'circle', isRoot: true };
}

/** Remove one idea and only its incident edges, as in the graphical editor. */
export function deleteMindMapIdea(map: MindMap, id: string): Pick<MindMap, 'nodes' | 'edges'> | undefined {
  const matches = map.nodes.filter(node => node.id === id);
  if (matches.length !== 1 || matches[0].isRoot) return undefined;
  return {
    nodes: map.nodes.filter(node => node.id !== id),
    edges: map.edges.filter(edge => edge.fromId !== id && edge.toId !== id),
  };
}

export function createMindMapEdge(fromId: string, toId: string, stamp: number): MindMapEdge {
  return { id: `edge-${stamp}`, fromId, toId };
}

export function addMindMapBranch(map: MindMap, parentId: string, now = Date.now()) {
  const parent = map.nodes.find(node => node.id === parentId);
  if (parent?.type !== 'circle') return undefined;
  const angle = map.edges.filter(edge => edge.fromId === parentId).length * 0.9 - 0.9;
  const node: MindMapNode = {
    id: `node-${now}`, x: parent.x + Math.cos(angle) * 150, y: parent.y + Math.sin(angle) * 150,
    text: 'רעיון חדש', type: 'square',
  };
  const edge = createMindMapEdge(parentId, node.id, now);
  return { nodes: [...map.nodes, node], edges: [...map.edges, edge] };
}
