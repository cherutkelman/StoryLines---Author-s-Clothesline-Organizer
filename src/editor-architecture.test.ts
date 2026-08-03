import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('text editor architecture', () => {
  it('renders the extracted toolbar exactly once from the editor coordinator', () => {
    const editor = readFileSync('components/Editor.tsx', 'utf8');
    const toolbar = readFileSync('components/editor/EditorToolbar.tsx', 'utf8');

    expect(editor).toContain("import EditorToolbar from './editor/EditorToolbar'");
    expect(editor.match(/<EditorToolbar\b/g)).toHaveLength(1);
    expect(editor).not.toContain('sticky top-4 z-40 mb-12');
    expect(toolbar).toContain('sticky top-4 z-40 mb-12');
  });

  it('keeps persistence and history orchestration out of the toolbar', () => {
    const toolbar = readFileSync('components/editor/EditorToolbar.tsx', 'utf8');

    expect(toolbar).not.toContain('updateActiveBook');
    expect(toolbar).not.toContain('autosave');
    expect(toolbar).not.toContain('createSceneVersion');
    expect(toolbar).not.toContain('scene-version-storage');
  });

  it('renders the extracted scene list while keeping scene transitions in the coordinator', () => {
    const editor = readFileSync('components/Editor.tsx', 'utf8');
    const sceneList = readFileSync('components/editor/EditorSceneList.tsx', 'utf8');

    expect(editor).toContain("import EditorSceneList from './editor/EditorSceneList'");
    expect(editor.match(/<EditorSceneList\b/g)).toHaveLength(1);
    expect(editor).toContain('onSelectScene={toggleSceneExpanded}');
    expect(editor).toContain('const toggleSceneExpanded');
    expect(editor).toContain('void handleFocusScene(nextFocusedSceneId)');
    expect(editor).not.toContain('activeSequenceItems.map');
    expect(sceneList).toContain('items.map');
    expect(sceneList).not.toContain('updateActiveBook');
    expect(sceneList).not.toContain('autosave');
    expect(sceneList).not.toContain('scene-version-storage');
    expect(sceneList).not.toContain('createSceneVersion');
  });

  it('does not introduce an EditorSurface in the scene-list step', () => {
    expect(existsSync('components/editor/EditorSurface.tsx')).toBe(false);
  });

  it('renders history through a storage-free presentation component', () => {
    const editor = readFileSync('components/Editor.tsx', 'utf8');
    const panel = readFileSync('components/editor/EditorHistoryPanel.tsx', 'utf8');
    expect(editor).toContain("import EditorHistoryPanel from './editor/EditorHistoryPanel'");
    expect(editor.match(/<EditorHistoryPanel\b/g)).toHaveLength(1);
    expect(editor).toContain('handleRestoreVersion={handleRestoreVersion}');
    expect(editor).toContain('handleCopyVersion={handleCopyVersion}');
    expect(panel).not.toContain('scene-version-storage');
    expect(panel).not.toContain('updateActiveBook');
    expect(panel).not.toContain('createSceneVersion');
    expect(panel).not.toContain('autosave');
  });
});
