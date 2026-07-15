import { describe, expect, it } from 'vitest';
import type { Project } from '../types';
import {
  calculateChangedCharacters,
  copySceneVersionToNewScene,
  createSceneVersion,
  createSceneVersionFromScene,
  diffText,
  hasTextDiffChanges,
  resolveSceneHistorySceneId,
  restoreSceneVersion,
  shouldCreateSceneVersion,
} from './scene-history';

const createProject = (content = 'start'): Project => ({
  plotlines: [{ id: 'p1', name: 'Main', color: '#000' }],
  scenes: [{ id: 's1', plotlineId: 'p1', title: 'Scene', content, position: 0 }],
});

describe('scene history logic', () => {
  it('does not create a typing-pause version for fewer than 500 changed characters', () => {
    expect(calculateChangedCharacters('a'.repeat(100), 'a'.repeat(100) + 'b'.repeat(499))).toBe(499);
  });

  it('counts 500 or more changed characters for typing-pause snapshots', () => {
    expect(calculateChangedCharacters('', 'a'.repeat(500))).toBe(500);
  });

  it('counts deletions and additions together', () => {
    const previous = `${'a'.repeat(300)}same`;
    const next = `${'b'.repeat(250)}same`;

    expect(calculateChangedCharacters(previous, next)).toBe(550);
  });

  it('creates a scene-change version even for a small edit', () => {
    const project = createProject('before');
    const edited = { ...project, scenes: [{ ...project.scenes[0], content: 'after' }] };
    const versioned = createSceneVersion({
      project: edited,
      versions: [],
      bookId: 'book-1',
      sceneId: 's1',
      versionType: 'automatic',
      reason: 'scene_change',
      now: 1,
      id: 'v1',
    });

    expect(versioned?.content).toBe('after');
  });

  it('does not create a duplicate when content and title match the last version', () => {
    const firstVersion = createSceneVersion({
      project: createProject('same'),
      versions: [],
      bookId: 'book-1',
      sceneId: 's1',
      versionType: 'manual',
      reason: 'manual',
      now: 1,
      id: 'v1',
    });

    const duplicate = createSceneVersion({
      project: createProject('same'),
      versions: firstVersion ? [firstVersion] : [],
      bookId: 'book-1',
      sceneId: 's1',
      versionType: 'manual',
      reason: 'manual',
      now: 2,
      id: 'v2',
    });

    expect(duplicate).toBeNull();
  });

  it('does not create a version when moving scenes without scene content changes', () => {
    const project = createProject('unchanged');

    expect(shouldCreateSceneVersion([], project.scenes[0])).toBe(true);

    const version = createSceneVersion({
      project,
      versions: [],
      bookId: 'book-1',
      sceneId: 's1',
      versionType: 'automatic',
      reason: 'scene_change',
      now: 1,
      id: 'v1',
    });

    expect(shouldCreateSceneVersion(version ? [version] : [], project.scenes[0])).toBe(false);
  });

  it('saves the current state before restoring and keeps existing history', () => {
    const first = createSceneVersion({
      project: createProject('old'),
      versions: [],
      bookId: 'book-1',
      sceneId: 's1',
      versionType: 'manual',
      reason: 'manual',
      now: 1,
      id: 'old-version',
    });
    expect(first).not.toBeNull();
    const project = createProject('old');
    const edited = { ...project, scenes: [{ ...project.scenes[0], content: 'current' }] };

    const restored = restoreSceneVersion({
      project: edited,
      versions: first ? [first] : [],
      bookId: 'book-1',
      sceneId: 's1',
      versionId: 'old-version',
      now: 2,
      currentVersionId: 'current-version',
    });

    expect(restored.project.scenes[0].content).toBe('old');
    expect(restored.currentVersion?.id).toBe('current-version');
    expect(restored.currentVersion?.content).toBe('current');
  });

  it('copies a version without changing the original scene', () => {
    const version = createSceneVersion({
      project: createProject('old'),
      versions: [],
      bookId: 'book-1',
      sceneId: 's1',
      versionType: 'manual',
      reason: 'manual',
      now: 1,
      id: 'v1',
    });
    expect(version).not.toBeNull();
    const project = createProject('old');
    const edited = { ...project, scenes: [{ ...project.scenes[0], content: 'current' }] };

    const copied = copySceneVersionToNewScene({
      project: edited,
      version: version!,
      versionId: 'v1',
      newSceneId: 'copy',
    });

    expect(copied.scenes.find(scene => scene.id === 's1')?.content).toBe('current');
    expect(copied.scenes.find(scene => scene.id === 'copy')?.content).toBe('old');
  });

  it('loads old projects without scene history safely', () => {
    const oldProject = createProject('legacy');

    expect(() => createSceneVersion({
      project: oldProject,
      versions: [],
      bookId: 'book-1',
      sceneId: 's1',
      versionType: 'manual',
      reason: 'manual',
      now: 1,
      id: 'v1',
    })).not.toThrow();
  });

  it('creates a scene-change version from the previous scene snapshot for a small edit', () => {
    const project = {
      ...createProject('old text'),
      scenes: [
        { id: 's1', plotlineId: 'p1', title: 'Old scene', content: 'old text', position: 0 },
        { id: 's2', plotlineId: 'p1', title: 'New scene', content: '', position: 1 },
      ],
    };
    const previousSceneSnapshot = {
      ...project.scenes[0],
      content: 'old text plus final typed word',
    };

    const version = createSceneVersionFromScene({
      scene: previousSceneSnapshot,
      versions: [],
      bookId: 'book-1',
      versionType: 'automatic',
      reason: 'scene_change',
      now: 3,
      id: 'scene-change-version',
    });

    expect(version?.sceneId).toBe('s1');
    expect(version?.reason).toBe('scene_change');
    expect(version?.content).toBe('old text plus final typed word');
  });

  it('does not create a scene-change duplicate when the snapshot content already matches the last version', () => {
    const scene = { id: 's1', plotlineId: 'p1', title: 'Scene', content: 'same text', position: 0 };
    const existing = createSceneVersionFromScene({
      scene,
      versions: [],
      bookId: 'book-1',
      versionType: 'automatic',
      reason: 'scene_change',
      now: 1,
      id: 'v1',
    });

    const duplicate = createSceneVersionFromScene({
      scene,
      versions: existing ? [existing] : [],
      bookId: 'book-1',
      versionType: 'automatic',
      reason: 'scene_change',
      now: 2,
      id: 'v2',
    });

    expect(duplicate).toBeNull();
  });

  it('resolves history opening to scene A when scene A is active', () => {
    expect(resolveSceneHistorySceneId({
      displayedSceneId: 'scene-a',
      focusedSceneId: null,
      expandedSceneIds: ['prologue'],
      editorFocusedSceneId: null,
      validSceneIds: ['prologue', 'scene-a', 'scene-b'],
    })).toBe('scene-a');
  });

  it('resolves history opening to scene B when scene B is active', () => {
    expect(resolveSceneHistorySceneId({
      displayedSceneId: 'scene-b',
      focusedSceneId: null,
      expandedSceneIds: ['prologue', 'scene-a'],
      editorFocusedSceneId: null,
      validSceneIds: ['prologue', 'scene-a', 'scene-b'],
    })).toBe('scene-b');
  });

  it('does not fall back to the prologue when there is no valid active scene', () => {
    expect(resolveSceneHistorySceneId({
      displayedSceneId: null,
      focusedSceneId: null,
      expandedSceneIds: ['missing-scene'],
      editorFocusedSceneId: null,
      validSceneIds: ['prologue', 'scene-a'],
    })).toBeNull();
  });

  it('uses the last interacted valid scene instead of falling back to the prologue', () => {
    expect(resolveSceneHistorySceneId({
      displayedSceneId: 'scene-b',
      focusedSceneId: null,
      expandedSceneIds: ['prologue'],
      editorFocusedSceneId: null,
      validSceneIds: ['prologue', 'scene-a', 'scene-b'],
    })).toBe('scene-b');
  });

  it('uses focused scene when displayed scene is not valid', () => {
    expect(resolveSceneHistorySceneId({
      displayedSceneId: 'missing',
      focusedSceneId: 'scene-a',
      expandedSceneIds: ['scene-b'],
      editorFocusedSceneId: 'prologue',
      validSceneIds: ['prologue', 'scene-a', 'scene-b'],
    })).toBe('scene-a');
  });

  it('uses expanded scene when displayed and focused scene ids are not valid', () => {
    expect(resolveSceneHistorySceneId({
      displayedSceneId: null,
      focusedSceneId: 'missing',
      expandedSceneIds: ['scene-b'],
      editorFocusedSceneId: 'prologue',
      validSceneIds: ['prologue', 'scene-a', 'scene-b'],
    })).toBe('scene-b');
  });

  it('uses App editorFocusedSceneId when local ids are not valid', () => {
    expect(resolveSceneHistorySceneId({
      displayedSceneId: null,
      focusedSceneId: 'missing',
      expandedSceneIds: ['also-missing'],
      editorFocusedSceneId: 'scene-a',
      validSceneIds: ['prologue', 'scene-a', 'scene-b'],
    })).toBe('scene-a');
  });

  it('detects no comparison changes for identical scene version content', () => {
    expect(hasTextDiffChanges(diffText('אין שינוי בטקסט', 'אין שינוי בטקסט'))).toBe(false);
  });
});
