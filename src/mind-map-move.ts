import type { MindMap, MindMapEdge } from '../types';
import { createMindMapEdge } from './mind-map-ideas';

export const mindMapMoveMessages = {
  missingIdea: 'הרעיון כבר אינו זמין במפה.',
  missingParent: 'ההורה שנבחר כבר אינו זמין במפה.',
  root: 'אי אפשר להעביר את השורש הראשי.',
  self: 'רעיון אינו יכול להיות ההורה של עצמו.',
  shape: 'רק רעיון עגול יכול לשמש הורה.',
  alreadyParent: 'הרעיון כבר נמצא בענף שנבחר.',
  descendant: 'העברה לצאצא של הרעיון תיצור מעגל.',
  multipleParents: 'יש כמה הורים באחד הענפים המעורבים. אי אפשר להעביר בבטחה.',
  duplicate: 'יש קשר כפול באחד הענפים המעורבים. אי אפשר להעביר בבטחה.',
  cycle: 'יש מעגל באחד הענפים המעורבים. אי אפשר להעביר בבטחה.',
  missingEndpoint: 'יש קשר שמפנה לרעיון חסר באחד הענפים המעורבים.',
  duplicateIdea: 'יש מזהה רעיון שמופיע יותר מפעם אחת באחד הענפים המעורבים.',
} as const;

type Block = keyof typeof mindMapMoveMessages;
type MoveResult = { ok: true; edges: MindMapEdge[] } | { ok: false; reason: Block };

export function inspectMindMapMove(map: MindMap, ideaId: string) {
  const nodes = new Map<string, MindMap['nodes'][number]>();
  const duplicateIdeas = new Set<string>();
  for (const node of map.nodes) {
    if (nodes.has(node.id)) duplicateIdeas.add(node.id);
    nodes.set(node.id, node);
  }
  const incoming = new Map<string, MindMapEdge[]>();
  const outgoing = new Map<string, MindMapEdge[]>();
  for (const edge of map.edges) {
    if (!incoming.has(edge.toId)) incoming.set(edge.toId, []);
    if (!outgoing.has(edge.fromId)) outgoing.set(edge.fromId, []);
    incoming.get(edge.toId)!.push(edge);
    outgoing.get(edge.fromId)!.push(edge);
  }

  // Validate only components touched by the move. Separate malformed
  // imported components stay visible and are left unchanged.
  const components = new Map<string, Block | null>();
  const edgeIdCounts = new Map<string, number>();
  for (const edge of map.edges) edgeIdCounts.set(edge.id, (edgeIdCounts.get(edge.id) ?? 0) + 1);
  const componentIssue = (start: string): Block | null => {
    if (components.has(start)) return components.get(start)!;
    const pending = [start];
    const seen = new Set([start]);
    let issue: Block | null = null;
    let hasRoot = false;
    while (pending.length) {
      const id = pending.pop()!;
      const parents = incoming.get(id) ?? [];
      const children = outgoing.get(id) ?? [];
      if (duplicateIdeas.has(id)) issue ??= 'duplicateIdea';
      if (!parents.length) hasRoot = true;
      if (new Set(parents.map(edge => edge.fromId)).size !== parents.length) issue = 'duplicate';
      else if (parents.length > 1) issue ??= 'multipleParents';
      for (const edge of [...parents, ...children]) {
        if (edgeIdCounts.get(edge.id)! > 1) issue = 'duplicate';
        const neighbor = edge.fromId === id ? edge.toId : edge.fromId;
        if (!nodes.has(neighbor)) issue ??= 'missingEndpoint';
        else if (!seen.has(neighbor)) {
          seen.add(neighbor);
          pending.push(neighbor);
        }
      }
    }
    // With at most one parent per node, a weakly connected component
    // containing a directed cycle has no root.
    if (!issue && !hasRoot) issue = 'cycle';
    for (const id of seen) components.set(id, issue);
    return issue;
  };

  const sourceIssue = !nodes.has(ideaId) ? 'missingIdea'
    : map.nodes.find(node => node.isRoot)?.id === ideaId ? 'root'
      : componentIssue(ideaId);
  const descendants = new Set<string>();
  const pending = sourceIssue ? [] : [ideaId];
  while (pending.length) {
    for (const edge of outgoing.get(pending.pop()!) ?? []) {
      if (descendants.has(edge.toId)) continue;
      descendants.add(edge.toId);
      pending.push(edge.toId);
    }
  }
  const currentParent = incoming.get(ideaId)?.[0];
  const targetIssue = (parentId: string): Block | null => {
    if (sourceIssue) return sourceIssue;
    const parent = nodes.get(parentId);
    if (!parent) return 'missingParent';
    if (parentId === ideaId) return 'self';
    if (descendants.has(parentId)) return 'descendant';
    if (currentParent?.fromId === parentId) return 'alreadyParent';
    if (parent.type !== 'circle') return 'shape';
    return componentIssue(parentId);
  };
  return { sourceIssue, targetIssue, currentParent };
}

export function moveMindMapIdea(map: MindMap, ideaId: string, parentId: string, stamp = 0): MoveResult {
  const { currentParent, targetIssue } = inspectMindMapMove(map, ideaId);
  const reason = targetIssue(parentId);
  if (reason) return { ok: false, reason };
  if (currentParent) {
    return { ok: true, edges: map.edges.map(edge => edge === currentParent ? { ...edge, fromId: parentId } : edge) };
  }
  const ids = new Set(map.edges.map(edge => edge.id));
  let edge = createMindMapEdge(parentId, ideaId, stamp);
  while (ids.has(edge.id)) edge = createMindMapEdge(parentId, ideaId, ++stamp);
  return { ok: true, edges: [...map.edges, edge] };
}
