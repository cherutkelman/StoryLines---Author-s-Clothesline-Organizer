import React, { useEffect, useMemo, useReducer, useState } from 'react';
import type { Project } from '../types';
import { storageManager } from '../storage';
import { isWeb } from '../src/platform';
import { sceneVersionStorage } from '../src/scene-version-storage';
import {
  readSceneInventory,
  type SceneInventory,
} from '../src/deleted-scene-history';
import {
  describeSceneVersionContent,
  getDeletedSceneScanResults,
  reduceDeletedSceneScan,
  startDeletedSceneScan,
} from '../src/deleted-scene-scan';
import { formatBoardVersionDate, formatBoardVersionTime } from '../src/board-version-history-ui';
import CopySceneVersionTextButton from './CopySceneVersionTextButton';

interface DeletedSceneHistoryProps {
  bookId: string;
  project: Project;
}

const formatDate = (timestamp: number) =>
  `${formatBoardVersionDate(timestamp)} · ${formatBoardVersionTime(timestamp)}`;

export default function DeletedSceneHistory({ bookId, project }: DeletedSceneHistoryProps) {
  const [scan, dispatch] = useReducer(reduceDeletedSceneScan, bookId, startDeletedSceneScan);
  const [inventory, setInventory] = useState<SceneInventory>();
  const { request, nextCursor, error } = scan;

  useEffect(() => {
    if (!request) return;
    let current = true;
    sceneVersionStorage.loadSceneVersionPage(bookId, request.cursor).then(page => {
      if (current) dispatch({ type: 'success', request, page });
    }).catch(error => {
      if (current) dispatch({ type: 'failure', request, error });
    });
    return () => { current = false; };
  }, [bookId, request]);

  useEffect(() => {
    let current = true;
    const loadInventory = async () => {
      if (isWeb || storageManager.getMode() === 'cloud') {
        return storageManager.getRemoteProvider().readBookSceneInventory(bookId);
      }
      return storageManager.getLocalProvider().readBookSceneInventory(bookId);
    };
    loadInventory().catch(() => readSceneInventory()).then(result => {
      if (current) setInventory(result);
    });
    return () => { current = false; };
  }, [bookId]);

  const results = useMemo(() => inventory && getDeletedSceneScanResults(scan, project, inventory),
    [scan, project, inventory]);
  const groups = results?.groups ?? [];
  const uncertain = inventory && (!inventory.complete || !readSceneInventory(project).complete);
  const scanComplete = !request && !error && !nextCursor;

  return (
    <section aria-label="סצנות שנמחקו" className="mb-4 space-y-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] p-4 text-sm text-[var(--theme-primary)]">
      <h3 className="font-black">סצנות שנמחקו</h3>
      <div role="status" className="space-y-1">
        <p>מסמכי גרסאות שנסרקו: {scan.scannedCount}</p>
        <p>סצנות שזוהו כחסרות: {results?.verifiedCount ?? 0}</p>
        {request && <p>טוען גרסאות תוכן…</p>}
        {!inventory && <p>בודק אילו סצנות קיימות בספר…</p>}
        {nextCursor && <p>ייתכן שנותרו גרסאות לסריקה.</p>}
        {scanComplete && <p>הסריקה הושלמה. לא נותרו גרסאות לסריקה.</p>}
        {results?.noNewMissingScenes && <p>נסרקו גרסאות נוספות, אך לא נמצאו סצנות חסרות חדשות.</p>}
      </div>
      {error && (
        <p role="alert">
          {error === 'permission-denied'
            ? 'טעינת גרסאות התוכן נכשלה בגלל הרשאות גישה.'
            : 'טעינת גרסאות התוכן נכשלה.'}
          {' '}אפשר לנסות שוב מאותה נקודה.
        </p>
      )}
      {inventory && (uncertain || groups.some(group => !group.verified)) && (
        <p role="status">לא ניתן לאמת כרגע את היעדרן של כל הסצנות בגלל נתוני ספר חלקיים.</p>
      )}
      {scanComplete && inventory && !uncertain && groups.length === 0 && (
        <p>לא נמצאו סצנות חסרות.</p>
      )}
      {groups.map(group => (
        <SceneVersionPreview key={group.sceneId} group={group} partial={!scanComplete} />
      ))}
      {(nextCursor || error) && (
        <button
          type="button"
          disabled={Boolean(request)}
          onClick={() => dispatch({ type: 'load' })}
          className="min-h-11 max-w-full rounded border border-[var(--theme-border)] px-3 py-2 font-bold disabled:opacity-50"
        >
          {error ? 'נסה שוב' : 'טען עוד גרסאות תוכן'}
        </button>
      )}
    </section>
  );
}

function SceneVersionPreview({ group, partial }: {
  group: ReturnType<typeof getDeletedSceneScanResults>['groups'][number];
  partial: boolean;
}) {
  const [selection, setSelection] = useState('');
  const selected = group.versions.find(version => version.id === selection);

  return (
    <article className="space-y-2 rounded border border-[var(--theme-border)] p-3">
      <h4 className="break-words font-bold">{group.title || `סצנה ללא כותרת (${group.sceneId})`}</h4>
      {!group.verified && <p>לא ניתן לאמת כרגע</p>}
      <p>{partial ? 'גרסאות שנטענו' : 'גרסאות זמינות'}: {group.versions.length}</p>
      <p>{partial ? 'שמירה אחרונה מבין הגרסאות שנטענו' : 'שמירה אחרונה'}: {formatDate(group.versions[0].createdAt)}</p>
      <label className="block">
        גרסה לתצוגה מקדימה
        <select
          value={selection}
          onChange={event => setSelection(event.target.value)}
          className="mt-1 block min-h-11 w-full min-w-0 rounded border border-[var(--theme-border)] bg-[var(--theme-card)] p-2 text-base sm:text-sm"
        >
          <option value="">בחירת גרסה</option>
          {group.versions.map(version => (
            <option key={version.id} value={version.id}>
              {version.name ? `${version.name} · ` : ''}{formatDate(version.createdAt)}
            </option>
          ))}
        </select>
      </label>
      {selected && (
        <>
          <CopySceneVersionTextButton key={selected.id} content={selected.content} />
          <pre dir="auto" className="whitespace-pre-wrap rounded bg-[var(--theme-secondary)]/20 p-3 font-sans [overflow-wrap:anywhere]">
            {describeSceneVersionContent(selected.content)}
          </pre>
        </>
      )}
    </article>
  );
}
