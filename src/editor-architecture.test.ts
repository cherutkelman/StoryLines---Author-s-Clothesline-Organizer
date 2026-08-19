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

  it('closes every expanded scene from the close-all toolbar action', () => {
    const editor = readFileSync('components/Editor.tsx', 'utf8');
    const toolbar = readFileSync('components/editor/EditorToolbar.tsx', 'utf8');

    expect(toolbar).toContain('<span>סגור הכל</span>');
    expect(editor).toContain("if (mode === 'focus')");
    expect(editor).toContain('handleExpandedScenesChange([])');
    expect(editor).toContain('setDisplayedSceneId(null)');
    expect(editor).toContain('void handleFocusScene(null)');
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

    expect(editor).toContain("from './editor/EditorSceneList'");
    expect(editor.match(/<EditorSceneList\b/g)).toHaveLength(1);
    expect(editor).toContain('onSelectScene={toggleSceneExpanded}');
    expect(editor).toContain('const toggleSceneExpanded');
    expect(editor).toContain('void handleFocusScene(nextFocusedSceneId)');
    expect(editor.match(/activeSequenceItems\.map/g)).toHaveLength(1);
    expect(sceneList).toContain('items.map');
    expect(sceneList).not.toContain('updateActiveBook');
    expect(sceneList).not.toContain('autosave');
    expect(sceneList).not.toContain('scene-version-storage');
    expect(sceneList).not.toContain('createSceneVersion');
  });

  it('does not introduce an EditorSurface in the scene-list step', () => {
    expect(existsSync('components/editor/EditorSurface.tsx')).toBe(false);
  });

  it('provides quick navigation targets for chapters and scenes', () => {
    const sceneList = readFileSync('components/editor/EditorSceneList.tsx', 'utf8');
    const editor = readFileSync('components/Editor.tsx', 'utf8');

    expect(sceneList).toContain('id={getEditorChapterTargetId(item.chapterMarker.id)}');
    expect(sceneList).toContain('id={getEditorSceneTargetId(scene.id)}');
    expect(sceneList.match(/scroll-mt-32/g)).toHaveLength(2);
    expect(editor).toContain('activeSequenceItems.map');
    expect(editor).toContain('const needsExpansion = displayMode === \'focus\' && !expandedSceneIds.includes(sceneId)');
    expect(editor).toContain('toggleSceneExpanded(sceneId)');
    expect(editor).toContain('window.requestAnimationFrame(() => window.requestAnimationFrame(scroll))');
    expect(editor).toContain('setShowChaptersInNav(current => !current)');
  });

  it('collapses the library sidebar only when entering the editor', () => {
    const app = readFileSync('App.tsx', 'utf8');

    expect(app).toContain('const previousActiveViewRef = useRef<AppView>(activeView)');
    expect(app).toContain("previousActiveViewRef.current !== 'editor' && activeView === 'editor'");
    expect(app).toContain('setIsSidebarCollapsed(true)');
    expect(app).toContain("setEditorExternalCommand({ action: 'closeAll', nonce: Date.now() })");
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
