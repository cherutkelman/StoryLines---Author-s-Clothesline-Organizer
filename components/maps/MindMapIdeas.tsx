import React, { useMemo, useRef, useState } from 'react';
import type { MindMap } from '../../types';
import { addMindMapBranch, buildMindMapIdeas, createMindMapRoot, deleteMindMapIdea, visibleMindMapIdeas, type IdeaRow } from '../../src/mind-map-ideas';
import { inspectMindMapMove, mindMapMoveMessages, moveMindMapIdea } from '../../src/mind-map-move';
import MindMapDeleteDialog from './MindMapDeleteDialog';

const button = 'min-h-11 min-w-11 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-3 py-2 text-sm font-bold focus-visible:outline focus-visible:outline-[var(--theme-accent)]';

export default function MindMapIdeas({ map, onUpdateMap, onShowMap }: {
  map: MindMap; onUpdateMap: (updates: Partial<MindMap>) => void; onShowMap: () => void;
}) {
  const tree = useMemo(() => buildMindMapIdeas(map.nodes, map.edges), [map.nodes, map.edges]);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string>();
  const [edit, setEdit] = useState<{ id: string; text: string }>();
  const [move, setMove] = useState<{ query: string; parentId?: string; error?: string }>();
  const [deleteRequest, setDeleteRequest] = useState<{ id: string }>();
  const activeDelete = useRef<typeof deleteRequest>(undefined);
  const deleteCandidate = deleteRequest && tree.byId.get(deleteRequest.id);
  const canDeleteSelected = selectedId !== undefined &&
    map.nodes.filter(node => node.id === selectedId).length === 1 && !tree.byId.get(selectedId)?.isRoot;

  const cancelDelete = () => {
    activeDelete.current = undefined;
    setDeleteRequest(undefined);
  };
  const confirmDelete = () => {
    if (!deleteRequest || activeDelete.current !== deleteRequest) return;
    cancelDelete();
    const updates = deleteMindMapIdea(map, deleteRequest.id);
    if (!updates) return;
    setSelectedId(undefined);
    setEdit(undefined);
    setMove(undefined);
    onUpdateMap(updates);
  };
  const moveOptions = useMemo(() => selectedId === undefined ? undefined : inspectMindMapMove(map, selectedId), [map, selectedId]);
  const target = move?.parentId !== undefined ? tree.byId.get(move.parentId) : undefined;
  const legalParents = move && moveOptions ? map.nodes.filter(node => !moveOptions.targetIssue(node.id)) : [];
  const moveQuery = move?.query.trim().toLocaleLowerCase() ?? '';
  const matchingParents = legalParents.filter(node => (node.text || 'רעיון ללא שם').toLocaleLowerCase().includes(moveQuery));

  const confirmMove = (ideaId: string, parentId: string) => {
    const result = moveMindMapIdea(map, ideaId, parentId, Date.now());
    if (result.ok === false) {
      setMove(previous => previous && { ...previous, error: mindMapMoveMessages[result.reason] });
      return;
    }
    const updatedTree = buildMindMapIdeas(map.nodes, result.edges);
    const parents = new Map([...updatedTree.main, ...updatedTree.detached].map(row => [row.node.id, row.parentId]));
    setCollapsed(previous => {
      const next = new Set(previous);
      for (let id = parents.get(ideaId); id !== undefined; id = parents.get(id)) next.delete(id);
      return next;
    });
    onUpdateMap({ edges: result.edges });
    setMove(undefined);
  };

  const setBranchCollapsed = (id: string, collapse: boolean) => {
    setCollapsed(previous => {
      const next = new Set(previous);
      if (collapse) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const renderIdeas = (rows: readonly IdeaRow[]) => (
    <ul className="min-w-0 space-y-2">
      {visibleMindMapIdeas(rows, collapsed).map(({ node, depth, childCount, otherIncoming }) => {
        const selected = selectedId === node.id;
        const isEditing = edit?.id === node.id;
        const name = node.text || 'רעיון ללא שם';
        return (
          <li key={node.id} className="min-w-0" style={{ paddingInlineStart: Math.min(depth, 4) * 6 }}>
            <div className={`min-w-0 rounded-xl border p-2 ${selected ? 'border-[var(--theme-accent)] bg-[var(--theme-secondary)]' : 'border-[var(--theme-border)] bg-[var(--theme-card)]'}`}>
              <div className="flex min-w-0 items-start gap-2">
                {childCount > 0 && (
                  <button type="button" className={button} aria-expanded={!collapsed.has(node.id)}
                    aria-label={collapsed.has(node.id) ? `פתיחת ענף: ${name}` : `סגירת ענף: ${name}`}
                    onClick={() => setBranchCollapsed(node.id, !collapsed.has(node.id))}>
                    {collapsed.has(node.id) ? '+' : '−'}
                  </button>
                )}
                <button type="button" className="min-h-11 min-w-0 flex-1 whitespace-pre-wrap break-words rounded-lg px-2 py-2 text-start font-bold"
                  aria-pressed={selected} onClick={() => {
                    setSelectedId(selected ? undefined : node.id);
                    setEdit(undefined);
                    setMove(undefined);
                  }}>
                  {name}
                </button>
              </div>
              {depth > 0 && <p className="px-2 text-xs">רמה {depth + 1}</p>}
              {otherIncoming.length > 0 && (
                <ul className="space-y-1 px-2 pb-1 text-sm">
                  {otherIncoming.map((edge, index) => (
                    <li key={`${edge.id}:${index}`} className="break-words">
                      קשר נכנס נוסף מ־{tree.byId.get(edge.fromId)?.text || 'רעיון ללא שם'}
                    </li>
                  ))}
                </ul>
              )}
              {selected && (
                <div className="mt-2 space-y-2">
                  {isEditing ? (
                    <form className="space-y-2" onSubmit={event => {
                      event.preventDefault();
                      if (edit.text !== node.text) {
                        onUpdateMap({ nodes: map.nodes.map(item => item.id === node.id ? { ...item, text: edit.text } : item) });
                      }
                      setEdit(undefined);
                    }}>
                      <label className="block">טקסט הרעיון
                        <textarea className="block min-h-24 w-full min-w-0 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] p-2 text-base"
                          rows={3} autoFocus value={edit.text} onChange={event => setEdit({ id: node.id, text: event.target.value })} />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" className={button}>שמירת טקסט</button>
                        <button type="button" className={button} onClick={() => setEdit(undefined)}>ביטול</button>
                      </div>
                    </form>
                  ) : move ? (
                    <div className="min-w-0 space-y-3">
                      <label className="block">חיפוש הורה חדש
                        <input type="search" value={move.query} onChange={event => {
                          const query = event.target.value;
                          setMove(previous => previous && { ...previous, query });
                        }} className="block min-h-11 w-full min-w-0 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] p-2 text-base" />
                      </label>
                      {matchingParents.length ? (
                        <ul className="space-y-2">
                          {matchingParents.map(parent => (
                            <li key={parent.id}>
                              <button type="button" className={`${button} w-full whitespace-pre-wrap break-words text-start`}
                                aria-pressed={parent.id === move.parentId}
                                onClick={() => setMove({ ...move, parentId: parent.id, error: undefined })}>
                                {parent.text || 'רעיון ללא שם'}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : <p>{legalParents.length ? 'לא נמצאו הורים מתאימים לחיפוש.' : 'אין במפה הורה זמין להעברה.'}</p>}
                      {target && (
                        <p className="break-words">להעביר את <strong>{name}</strong> לענף של <strong>{target.text || 'רעיון ללא שם'}</strong>?</p>
                      )}
                      {move.error && <p role="alert">{move.error}</p>}
                      <div className="flex flex-wrap gap-2">
                        {target && <button type="button" className={button} onClick={() => confirmMove(node.id, target.id)}>אישור העברה</button>}
                        <button type="button" className={button} onClick={() => setMove(undefined)}>ביטול העברה</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={button} onClick={() => setEdit({ id: node.id, text: node.text })}>עריכת טקסט</button>
                      {moveOptions && !moveOptions.sourceIssue && (
                        <button type="button" className={button} onClick={() => setMove({ query: '' })}>העבר לענף אחר</button>
                      )}
                      {moveOptions?.sourceIssue && moveOptions.sourceIssue !== 'root' && (
                        <p className="w-full text-sm">{mindMapMoveMessages[moveOptions.sourceIssue]}</p>
                      )}
                      {node.type === 'circle' && (
                        <button type="button" className={button} onClick={() => {
                          const updates = addMindMapBranch(map, node.id);
                          if (!updates) return;
                          onUpdateMap(updates);
                          setBranchCollapsed(node.id, false);
                        }}>הוסף ענף</button>
                      )}
                      {canDeleteSelected && (
                        <button type="button" className={button} onClick={() => {
                          const request = { id: node.id };
                          activeDelete.current = request;
                          setDeleteRequest(request);
                        }}>מחק רעיון</button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div dir="rtl" className="h-full min-w-0 space-y-3 overflow-y-auto bg-[var(--theme-bg)] p-3 pb-6 text-[var(--theme-text)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">עץ רעיונות</h2>
        <button type="button" className={button} onClick={onShowMap}>הצג מפה</button>
      </div>
      {!tree.main.length && (
        <button type="button" className={button} onClick={() => {
          if (!map.nodes.length) onUpdateMap({ nodes: [createMindMapRoot(0, 0)] });
        }}>צור נושא מרכזי</button>
      )}
      {tree.rootCount > 1 && <p className="text-sm">במפה מסומנים כמה שורשים. העץ הראשי מתחיל בשורש הראשון.</p>}
      {tree.main.length > 0 && tree.rootCount === 0 && <p className="text-sm">לא סומן שורש. העץ מתחיל ברעיון הראשון במפה.</p>}
      {tree.missingEdges > 0 && <p role="status">קשרים שמפנים לרעיון חסר במפה ({tree.missingEdges}).</p>}
      {tree.main.length > 0 && renderIdeas(tree.main)}
      {tree.detached.length > 0 && (
        <section className="min-w-0 space-y-2">
          <h3 className="font-bold">רעיונות מנותקים</h3>
          {renderIdeas(tree.detached)}
        </section>
      )}
      {deleteCandidate && (
        <MindMapDeleteDialog
          name={deleteCandidate.text || 'רעיון ללא שם'}
          hasChildren={map.edges.some(edge => edge.fromId === deleteCandidate.id &&
            edge.toId !== deleteCandidate.id && tree.byId.has(edge.toId))}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
