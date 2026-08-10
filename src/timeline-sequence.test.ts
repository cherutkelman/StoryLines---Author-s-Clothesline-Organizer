import { describe, expect, it } from 'vitest';
import type {
  BookSequenceItem,
  ChapterMarker,
  Project,
  Scene,
  TimelineData,
} from '../types';
import { getEffectiveTimelineItems } from './timeline-sequence';

const scene = (id: string, position: number): Scene => ({
  id,
  plotlineId: 'p1',
  title: `Scene ${id}`,
  content: `Content ${id}`,
  position,
});

const project = ({
  scenes,
  bookSequence,
  chapterMarkers = [],
  timeline,
}: {
  scenes: Scene[];
  bookSequence?: BookSequenceItem[];
  chapterMarkers?: ChapterMarker[];
  timeline?: TimelineData;
}): Project => ({
  plotlines: [{ id: 'p1', name: 'Plotline', color: '#123456' }],
  scenes,
  bookSequence,
  chapterMarkers,
  timeline,
});

describe('timeline sequence', () => {
  it('derives default chronology from scene order in bookSequence', () => {
    const source = project({
      scenes: [scene('s1', 0), scene('s2', 1), scene('s3', 2)],
      bookSequence: [
        { id: 'scene:s3', type: 'scene', sceneId: 's3' },
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
      ],
    });

    expect(getEffectiveTimelineItems(source)).toEqual([
      { id: 'timeline-scene-s3', type: 'scene', sceneId: 's3' },
      { id: 'timeline-scene-s1', type: 'scene', sceneId: 's1' },
      { id: 'timeline-scene-s2', type: 'scene', sceneId: 's2' },
    ]);
  });

  it('excludes chapter dividers while preserving the exact scene order', () => {
    const source = project({
      scenes: [scene('s1', 0), scene('s2', 1)],
      chapterMarkers: [{ id: 'c1', title: 'Chapter 1', position: 1 }],
      bookSequence: [
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
        { id: 'chapter:c1', type: 'chapter-divider', chapterId: 'c1' },
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
      ],
    });

    expect(getEffectiveTimelineItems(source).map(item => item.id)).toEqual([
      'timeline-scene-s2',
      'timeline-scene-s1',
    ]);
  });

  it('uses legacy position normalization when bookSequence is absent', () => {
    const source = project({
      scenes: [scene('s3', 2), scene('s1', 0), scene('s2', 1)],
    });

    expect(getEffectiveTimelineItems(source).map(item => item.id)).toEqual([
      'timeline-scene-s1',
      'timeline-scene-s2',
      'timeline-scene-s3',
    ]);
  });

  it('does not mutate a project while deriving the default timeline', () => {
    const source = project({
      scenes: [scene('s2', 1), scene('s1', 0)],
    });
    const before = structuredClone(source);

    getEffectiveTimelineItems(source);

    expect(source).toEqual(before);
    expect(source.timeline).toBeUndefined();
  });

  it('uses an explicitly stored timeline instead of bookSequence', () => {
    const timeline: TimelineData = {
      items: [
        { id: 'group-past', type: 'group', title: 'The past', sceneIds: ['s2', 's1'] },
        { id: 'custom-s3', type: 'scene', sceneId: 's3' },
      ],
    };
    const source = project({
      scenes: [scene('s1', 0), scene('s2', 1), scene('s3', 2)],
      bookSequence: [
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
        { id: 'scene:s3', type: 'scene', sceneId: 's3' },
      ],
      timeline,
    });

    expect(getEffectiveTimelineItems(source)).toBe(timeline.items);
  });

  it('keeps stored chronology independent when bookSequence changes', () => {
    const timeline: TimelineData = {
      items: [
        { id: 'timeline-scene-s2', type: 'scene', sceneId: 's2' },
        { id: 'timeline-scene-s1', type: 'scene', sceneId: 's1' },
      ],
    };
    const source = project({
      scenes: [scene('s1', 0), scene('s2', 1)],
      bookSequence: [
        { id: 'scene:s1', type: 'scene', sceneId: 's1' },
        { id: 'scene:s2', type: 'scene', sceneId: 's2' },
      ],
      timeline,
    });

    source.bookSequence = [
      { id: 'scene:s2', type: 'scene', sceneId: 's2' },
      { id: 'scene:s1', type: 'scene', sceneId: 's1' },
    ];

    expect(getEffectiveTimelineItems(source)).toEqual(timeline.items);
  });
});
