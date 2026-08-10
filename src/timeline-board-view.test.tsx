import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import TimelineBoardView from '../components/board/TimelineBoardView';
import type { BookSequenceItem, Project, Scene, TimelineData } from '../types';
import { addScenesToTimelineGroup, createTimelineGroup, removeScenesFromTimelineGroup, renameTimelineGroup, ungroupTimelineGroup } from './timeline-sequence';

const scene = (id: string, title: string, position: number): Scene => ({
  id,
  plotlineId: 'p1',
  title,
  content: '',
  summary: `Summary ${title}`,
  position,
});

const project = (
  scenes: Scene[],
  bookSequence: BookSequenceItem[],
  timeline?: TimelineData
): Project => ({
  plotlines: [{ id: 'p1', name: 'Plotline', color: '#123456' }],
  scenes,
  bookSequence,
  timeline,
});

const renderTimeline = (
  source: Project,
  collapsedGroupIds: string[] = [],
  withUiActions = false
) => renderToStaticMarkup(
  <TimelineBoardView
    project={source}
    collapsedGroupIds={collapsedGroupIds}
    onCollapsedGroupIdsChange={withUiActions ? () => undefined : undefined}
    onTimelineChange={withUiActions ? () => undefined : undefined}
    updateScene={withUiActions ? () => undefined : undefined}
  />
);

describe('TimelineBoardView', () => {
  it('renders from effective timeline points rather than a flat scene list', () => {
    const source = readFileSync('components/board/TimelineBoardView.tsx', 'utf8');

    expect(source).toContain('const points = getEffectiveTimelinePoints(project)');
    expect(source).not.toContain('getFlatEffectiveTimelineSceneItems(project)');
  });

  it('renders singleton points as regular single-card timeline columns in order', () => {
    const html = renderTimeline(project(
      [scene('a', 'First point', 0), scene('b', 'Second point', 1)],
      [],
      { items: [
        { id: 'point-a', type: 'point', sceneIds: ['a'] },
        { id: 'point-b', type: 'point', sceneIds: ['b'] },
      ] }
    ));

    expect(html).toContain('data-timeline-point-id="point-a"');
    expect(html).toContain('data-timeline-point-scene-count="1"');
    expect(html.indexOf('First point')).toBeLessThan(html.indexOf('Second point'));
    expect(html).not.toContain('data-timeline-multi-scene-point');
  });

  it('offers same-time only from singleton point scene cards', () => {
    const singletonHtml = renderTimeline(project(
      [scene('a', 'Singleton', 0), scene('b', 'Target', 1)],
      [],
      { items: [
        { id: 'a-point', type: 'point', sceneIds: ['a'] },
        { id: 'b-point', type: 'point', sceneIds: ['b'] },
      ] }
    ), [], true);
    const multiHtml = renderTimeline(project(
      [scene('a', 'Parallel A', 0), scene('b', 'Parallel B', 1)],
      [],
      { items: [{ id: 'parallel', type: 'point', sceneIds: ['a', 'b'] }] }
    ), [], true);

    expect(singletonHtml.match(/מתרחש באותו זמן כמו\.\.\./g)).toHaveLength(2);
    expect(multiHtml).not.toContain('מתרחש באותו זמן כמו...');
    expect(singletonHtml).not.toContain('הפרד מנקודת הזמן');
    expect(multiHtml.match(/הפרד מנקודת הזמן/g)).toHaveLength(2);
  });

  it('renders every scene in a multi-scene point inside one chronological column', () => {
    const html = renderTimeline(project(
      [scene('a', 'Parallel A', 0), scene('b', 'Parallel B', 1), scene('c', 'Parallel C', 2)],
      [],
      { items: [{ id: 'parallel', type: 'point', sceneIds: ['a', 'b', 'c'] }] }
    ));

    expect(html).toContain('data-timeline-point-id="parallel"');
    expect(html).toContain('data-timeline-point-scene-count="3"');
    expect(html.match(/data-timeline-multi-scene-point/g)).toHaveLength(1);
    expect(html).toContain('Parallel A');
    expect(html).toContain('Parallel B');
    expect(html).toContain('Parallel C');
    expect(html).toContain('באותו זמן');
    expect(html).not.toContain('data-timeline-arrow');
  });

  it('renders one chronological arrow between points and none inside a point', () => {
    const html = renderTimeline(project(
      [scene('a', 'Parallel A', 0), scene('b', 'Parallel B', 1), scene('c', 'Later', 2)],
      [],
      { items: [
        { id: 'parallel', type: 'point', sceneIds: ['a', 'b'] },
        { id: 'later', type: 'point', sceneIds: ['c'] },
      ] }
    ));

    expect(html.match(/data-timeline-arrow/g)).toHaveLength(1);
  });

  it('groups point cards visually by plotline and supports repeated plotlines', () => {
    const scenes = [
      scene('a', 'First same line', 0),
      scene('b', 'Second same line', 1),
      { ...scene('c', 'Other line', 2), plotlineId: 'p2' },
    ];
    const source = project(scenes, [], {
      items: [{ id: 'parallel', type: 'point', sceneIds: ['a', 'b', 'c'] }],
    });
    source.plotlines.push({ id: 'p2', name: 'Other plotline', color: '#abcdef' });
    const html = renderTimeline(source);

    expect(html.match(/data-timeline-point-plotline="p1"/g)).toHaveLength(1);
    expect(html).toContain('First same line');
    expect(html).toContain('Second same line');
    expect(html).toContain('Plotline');
    expect(html).toContain('Other plotline');
    expect(html).toContain('#abcdef');
  });

  it('keeps time labels per scene inside the same point', () => {
    const html = renderTimeline(project(
      [
        { ...scene('a', 'At home', 0), timeLabel: 'בערב' },
        { ...scene('b', 'At hospital', 1), timeLabel: 'באותו זמן בבית החולים' },
      ],
      [],
      { items: [{ id: 'parallel', type: 'point', sceneIds: ['a', 'b'] }] }
    ));

    expect(html).toContain('בערב');
    expect(html).toContain('באותו זמן בבית החולים');
    expect(html.match(/data-scene-time-label=/g)).toHaveLength(2);
  });

  it('makes the note surface draggable without rendering a drag handle', () => {
    const source = project(
      [scene('a', 'Parallel', 0), scene('b', 'Parallel too', 1), scene('c', 'Singleton', 2)],
      [
        { id: 'scene:a', type: 'scene', sceneId: 'a' },
        { id: 'scene:b', type: 'scene', sceneId: 'b' },
        { id: 'scene:c', type: 'scene', sceneId: 'c' },
      ],
      { items: [
        { id: 'parallel', type: 'point', sceneIds: ['a', 'b'] },
        { id: 'single', type: 'point', sceneIds: ['c'] },
      ] }
    );
    const before = structuredClone(source);
    const html = renderTimeline(source, [], true);

    expect(html.match(/data-timeline-drag-surface/g)).toHaveLength(2);
    expect(html).not.toContain('aria-label="גרור את נקודת הזמן כולה"');
    expect(html).not.toContain('aria-label="גרור לשינוי המיקום בציר הזמן"');
    expect(html).toContain('data-timeline-point-id="parallel"');
    expect(source).toEqual(before);
  });

  it('portals timeline dialogs to the document body so they stay centered in the viewport', () => {
    const source = readFileSync('components/board/TimelineBoardView.tsx', 'utf8');

    expect(source).toContain("import { createPortal } from 'react-dom';");
    expect(source).toContain('return createPortal(children, document.body);');
    expect(source).toContain('<TimelineDialogPortal>');
  });

  it('does not render an unplaced area when all scenes are represented', () => {
    const html = renderTimeline(project(
      [scene('s1', 'Placed', 0)],
      [],
      { items: [{ id: 'placed', type: 'scene', sceneId: 's1' }] }
    ));

    expect(html).not.toContain('data-unplaced-timeline-scenes');
  });

  it('renders unplaced scenes in a separate non-selectable area with their timeLabel', () => {
    const source = project(
      [
        scene('placed', 'Placed scene', 0),
        { ...scene('new-scene', 'New scene', 1), timeLabel: 'The following evening' },
      ],
      [
        { id: 'scene:placed', type: 'scene', sceneId: 'placed' },
        { id: 'scene:new-scene', type: 'scene', sceneId: 'new-scene' },
      ],
      { items: [{ id: 'placed', type: 'scene', sceneId: 'placed' }] }
    );
    const html = renderTimeline(source);

    expect(html).toContain('data-unplaced-timeline-scenes');
    expect(html).toContain('סצנות שטרם שובצו בציר הזמן');
    expect(html).toContain('data-unplaced-timeline-scene-id="new-scene"');
    expect(html).toContain('New scene');
    expect(html).toContain('The following evening');
    expect(html).not.toContain('data-timeline-top-level-item-id="new-scene"');
  });

  it('offers an explicit placement action on unplaced scene cards', () => {
    const html = renderTimeline(project(
      [scene('new-scene', 'New scene', 0)],
      [{ id: 'scene:new-scene', type: 'scene', sceneId: 'new-scene' }],
      { items: [] }
    ), [], true);

    expect(html).toContain('שבץ בציר הזמן');
    expect(html).toContain('touch-manipulation');
    expect(html).not.toContain('data-timeline-top-level-item-id="new-scene"');
  });

  it('keeps placement available when the explicit timeline contains a multi-scene point', () => {
    const html = renderTimeline(project(
      [
        scene('parallel-a', 'Parallel A', 0),
        scene('parallel-b', 'Parallel B', 1),
        scene('new-scene', 'New scene', 2),
      ],
      [
        { id: 'scene:parallel-a', type: 'scene', sceneId: 'parallel-a' },
        { id: 'scene:parallel-b', type: 'scene', sceneId: 'parallel-b' },
        { id: 'scene:new-scene', type: 'scene', sceneId: 'new-scene' },
      ],
      { items: [{ id: 'parallel', type: 'point', sceneIds: ['parallel-a', 'parallel-b'] }] }
    ), [], true);

    expect(html).toContain('data-timeline-point-id="parallel"');
    expect(html).toContain('data-unplaced-timeline-scene-id="new-scene"');
    expect(html).toContain('שבץ בציר הזמן');
    expect(html).not.toContain('disabled=""');
  });

  const collapsibleProject = () => project(
    [scene('s1', 'Visible first', 0), scene('s2', 'Visible second', 1)],
    [],
    {
      items: [{ id: 'collapsible-group', type: 'group', title: 'Collapsible title', sceneIds: ['s1', 'missing', 's2'] }],
    }
  );

  it('flattens a legacy group without rendering its title or container', () => {
    const html = renderTimeline(collapsibleProject(), [], true);

    expect(html).not.toContain('Collapsible title');
    expect(html).not.toContain('data-timeline-group-id');
    expect(html).toContain('Visible first');
    expect(html).toContain('Visible second');
  });

  it('ignores collapsed state and keeps legacy grouped scenes visible', () => {
    const html = renderTimeline(collapsibleProject(), ['collapsible-group'], true);

    expect(html).not.toContain('Collapsible title');
    expect(html).not.toContain('aria-expanded');
    expect(html).not.toContain('data-timeline-group-scene-count');
    expect(html).toContain('Visible first');
    expect(html).toContain('Visible second');
  });

  it('shows grouped scenes again when the collapsed id is removed', () => {
    const collapsed = renderTimeline(collapsibleProject(), ['collapsible-group'], true);
    const reopened = renderTimeline(collapsibleProject(), [], true);

    expect(collapsed).toContain('Visible first');
    expect(reopened).toContain('Visible first');
    expect(reopened).toContain('Visible second');
  });

  it('ignores stale collapsed ids and makes flattened legacy scenes reorderable', () => {
    expect(() => renderTimeline(collapsibleProject(), ['missing-group'], true)).not.toThrow();
    const html = renderTimeline(collapsibleProject(), ['collapsible-group', 'missing-group'], true);

    expect(html).toContain('data-timeline-top-level-item-id="collapsible-group-scene-0-s1"');
    expect(html).toContain('data-timeline-top-level-item-id="collapsible-group-scene-2-s2"');
    expect(html).toContain('data-timeline-drag-surface');
  });

  it('offers an explicit tap-friendly scene selection action', () => {
    const source = readFileSync('components/board/TimelineBoardView.tsx', 'utf8');

    expect(source).toContain('בחירת סצנות');
    expect(source).toContain('selectionControlsHost && createPortal(');
    expect(source).toContain('min-h-11');
  });

  it('renders an empty inline time editor for a scene without a timeLabel', () => {
    const html = renderTimeline(project(
      [scene('s1', 'No time label', 0)],
      [{ id: 'scene:s1', type: 'scene', sceneId: 's1' }]
    ));

    expect(html).toContain('No time label');
    expect(html).toContain('data-scene-time-label-editor="true"');
    expect(html).not.toContain('data-scene-time-label=');
    expect(html).toContain('value=""');
  });

  it('renders a scene timeLabel directly in its inline editor without a dialog action', () => {
    const timedScene = { ...scene('s1', 'Timed scene', 0), timeLabel: 'The next morning' };
    const html = renderTimeline(project(
      [timedScene],
      [{ id: 'scene:s1', type: 'scene', sceneId: 's1' }]
    ), [], true);

    expect(html).toContain('data-scene-time-label="s1"');
    expect(html).toContain('The next morning');
    expect(html).toContain('id="timeline-scene-time-s1"');
    expect(html).not.toContain('עריכת זמן');
    expect(html).not.toContain('scene-time-label-dialog-title');
  });

  it('offers time labels from other scenes as autocomplete options', () => {
    const html = renderTimeline(project(
      [
        { ...scene('s1', 'First scene', 0), timeLabel: 'למחרת בבוקר' },
        { ...scene('s2', 'Second scene', 1), timeLabel: 'שלוש שנים קודם' },
        scene('s3', 'Editable scene', 2),
      ],
      [],
      { items: [
        { id: 'one', type: 'scene', sceneId: 's1' },
        { id: 'two', type: 'scene', sceneId: 's2' },
        { id: 'three', type: 'scene', sceneId: 's3' },
      ] }
    ), [], true);

    expect(html).toContain('list="timeline-time-label-options-s3"');
    expect(html).toContain('<option value="למחרת בבוקר"></option>');
    expect(html).toContain('<option value="שלוש שנים קודם"></option>');
  });

  it('renders the same Scene timeLabel when the scene is inside a group', () => {
    const timedScene = { ...scene('s1', 'Grouped timed scene', 0), timeLabel: 'After the wedding' };
    const html = renderTimeline(project(
      [timedScene],
      [],
      { items: [{ id: 'group', type: 'group', title: 'Period', sceneIds: ['s1'] }] }
    ));

    expect(html).toContain('After the wedding');
    expect(html).toContain('data-scene-time-label="s1"');
  });

  it('renders scenes from legacy group data independently regardless of collapsed state', () => {
    const source = project(
      [scene('s1', 'Adjacent', 0), scene('s2', 'Grouped', 1)],
      [],
      {
        items: [
          { id: 'timeline-s1', type: 'scene', sceneId: 's1' },
          { id: 'collapsed-target', type: 'group', title: 'Collapsed target', sceneIds: ['s2'] },
        ],
      }
    );
    const timeline = addScenesToTimelineGroup(source, 'collapsed-target', ['s1']);
    expect(timeline).not.toBeNull();

    const html = renderTimeline(
      { ...source, timeline: timeline! },
      ['collapsed-target'],
      true
    );
    expect(html).not.toContain('aria-expanded');
    expect(html).not.toContain('Collapsed target');
    expect(html).toContain('Adjacent');
    expect(html).toContain('Grouped');
  });

  it('renders extracted group scenes immediately as independent timeline cards', () => {
    const source = project(
      [
        scene('s1', 'Extracted scene', 0),
        scene('s2', 'Remaining one', 1),
        scene('s3', 'Remaining two', 2),
      ],
      [],
      { items: [{ id: 'source-group', type: 'group', title: 'Source', sceneIds: ['s1', 's2', 's3'] }] }
    );
    const timeline = removeScenesFromTimelineGroup(source, 'source-group', ['s1']);
    expect(timeline).not.toBeNull();

    const html = renderTimeline({ ...source, timeline: timeline! });
    expect(html).toContain('data-timeline-top-level-item-id="timeline-scene-s1"');
    expect(html).toContain('Extracted scene');
    expect(html.indexOf('Extracted scene')).toBeLessThan(html.indexOf('Remaining one'));
  });

  it('renders scenes in effective timeline order rather than scenes array order', () => {
    const html = renderTimeline(project(
      [scene('s1', 'First', 0), scene('s2', 'Second', 1), scene('s3', 'Third', 2)],
      [
        { id: 'scene:s3', type: 'scene', sceneId: 's3' },
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
      ]
    ));

    expect(html.indexOf('Third')).toBeLessThan(html.indexOf('First'));
    expect(html.indexOf('First')).toBeLessThan(html.indexOf('Second'));
  });

  it('renders stored chronology instead of a different bookSequence order', () => {
    const html = renderTimeline(project(
      [scene('s1', 'Book first', 0), scene('s2', 'Book second', 1)],
      [
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
      ],
      {
        items: [
          { id: 'chronology-s2', type: 'scene', sceneId: 's2' },
          { id: 'chronology-s1', type: 'scene', sceneId: 's1' },
        ],
      }
    ));

    expect(html.indexOf('Book second')).toBeLessThan(html.indexOf('Book first'));
  });

  it('renders legacy group scenes in sceneIds order without the group title', () => {
    const html = renderTimeline(project(
      [scene('s1', 'Childhood one', 0), scene('s2', 'Childhood two', 1)],
      [],
      {
        items: [{
          id: 'group-childhood',
          type: 'group',
          title: 'Childhood',
          sceneIds: ['s2', 's1'],
        }],
      }
    ));

    expect(html).not.toContain('>Childhood<');
    expect(html).not.toContain('data-timeline-group-id="group-childhood"');
    expect(html.indexOf('Childhood two')).toBeLessThan(html.indexOf('Childhood one'));
  });

  it('flattens previously created group data at render time without migration', () => {
    const source = project(
      [scene('s1', 'First grouped', 0), scene('s2', 'Second grouped', 1)],
      [
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
      ]
    );
    const timeline = createTimelineGroup(source, ['s1', 's2'], 'New group', 'new-group');
    expect(timeline).not.toBeNull();

    const html = renderTimeline({ ...source, timeline: timeline! });
    expect(html).not.toContain('New group');
    expect(html).not.toContain('data-timeline-group-id="new-group"');
    expect(html.indexOf('First grouped')).toBeLessThan(html.indexOf('Second grouped'));
  });

  it('renders ungrouped scenes immediately as independent timeline items', () => {
    const source = project(
      [scene('s1', 'First ungrouped', 0), scene('s2', 'Second ungrouped', 1)],
      [],
      {
        items: [{ id: 'group-to-remove', type: 'group', title: 'Remove me', sceneIds: ['s1', 's2'] }],
      }
    );
    const timeline = ungroupTimelineGroup(source, 'group-to-remove');
    expect(timeline).not.toBeNull();

    const html = renderTimeline({ ...source, timeline: timeline! });
    expect(html).not.toContain('data-timeline-group-id="group-to-remove"');
    expect(html).toContain('data-timeline-top-level-item-id="timeline-scene-s1"');
    expect(html).toContain('data-timeline-top-level-item-id="timeline-scene-s2"');
    expect(html.indexOf('First ungrouped')).toBeLessThan(html.indexOf('Second ungrouped'));
  });

  it('does not expose a legacy group title while retaining its scene order', () => {
    const source = project(
      [scene('s1', 'First in group', 0), scene('s2', 'Second in group', 1)],
      [],
      {
        items: [{ id: 'group-rename', type: 'group', title: 'Old title', sceneIds: ['s2', 's1'] }],
      }
    );
    const timeline = renameTimelineGroup(source, 'group-rename', 'New title');
    expect(timeline).not.toBeNull();

    const html = renderTimeline({ ...source, timeline: timeline! });
    expect(html).not.toContain('New title');
    expect(html).not.toContain('Old title');
    expect(html.indexOf('Second in group')).toBeLessThan(html.indexOf('First in group'));
  });

  it('skips missing scene references without failing', () => {
    const source = project(
      [scene('s1', 'Existing scene', 0)],
      [],
      {
        items: [
          { id: 'missing', type: 'scene', sceneId: 'missing-scene' },
          { id: 'existing', type: 'scene', sceneId: 's1' },
          { id: 'group', type: 'group', title: 'Mixed group', sceneIds: ['missing-scene', 's1'] },
        ],
      }
    );

    expect(() => renderTimeline(source)).not.toThrow();
    const html = renderTimeline(source);
    expect(html).toContain('Existing scene');
    expect(html).not.toContain('missing-scene');
  });
});
