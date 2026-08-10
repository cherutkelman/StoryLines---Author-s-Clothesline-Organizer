import { describe, expect, it } from 'vitest';
import type { Project, Scene } from '../types';
import { normalizeSceneTimeLabel } from './scene-time-label';

describe('scene time label', () => {
  it('trims a free-text time label before saving', () => {
    expect(normalizeSceneTimeLabel('  three years earlier  ')).toBe('three years earlier');
  });

  it('removes an existing value when the new value is empty or whitespace', () => {
    expect(normalizeSceneTimeLabel('')).toBeUndefined();
    expect(normalizeSceneTimeLabel('   ')).toBeUndefined();
  });

  it('updates only Scene data without changing chronology or book order', () => {
    const source: Project = {
      plotlines: [{ id: 'p1', name: 'Plotline', color: '#123456' }],
      scenes: [{ id: 's1', plotlineId: 'p1', title: 'Scene', content: '', position: 0 }],
      bookSequence: [{ id: 'scene:s1', type: 'scene', sceneId: 's1' }],
      timeline: { items: [{ id: 'timeline-s1', type: 'scene', sceneId: 's1' }] },
    };
    const timelineBefore = structuredClone(source.timeline);
    const bookSequenceBefore = structuredClone(source.bookSequence);
    const updatedScene: Scene = {
      ...source.scenes[0],
      timeLabel: normalizeSceneTimeLabel('  the next morning  '),
    };

    expect(updatedScene.timeLabel).toBe('the next morning');
    expect(source.timeline).toEqual(timelineBefore);
    expect(source.bookSequence).toEqual(bookSequenceBefore);
  });
});
