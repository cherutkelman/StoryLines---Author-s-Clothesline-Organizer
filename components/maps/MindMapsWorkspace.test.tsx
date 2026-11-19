import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MindMapsWorkspace from './MindMapsWorkspace';
import SelectedMapHeader from './SelectedMapHeader';
import MapsImportDialog from './MapsImportDialog';
import MindMapEditor from '../MindMapEditor';
import MindMapIdeas from './MindMapIdeas';
import MindMapViewer from './MindMapViewer';

type Control = {
  children?: React.ReactNode;
  'aria-label'?: string;
  onClick?: (event: { stopPropagation: () => void }) => void;
  onChange?: (event: { target: { value: string } }) => void;
  onBack?: () => void;
};

function find(node: React.ReactNode, match: (element: React.ReactElement<Control>) => boolean): React.ReactElement<Control> | undefined {
  for (const child of React.Children.toArray(node)) {
    if (!React.isValidElement<Control>(child)) continue;
    if (match(child)) return child;
    const nested = find(child.props.children, match);
    if (nested) return nested;
  }
}

afterEach(() => vi.unstubAllGlobals());
const click = { stopPropagation: vi.fn() };
const map = { id: 'mind-1', name: 'רעיון'.repeat(30), nodes: [], edges: [] };
const workspace = () => ({
  maps: [map], currentMapId: null, onSelectMap: vi.fn(), onUpdateMaps: vi.fn(), onOpenImport: vi.fn(), onChangeViewingMap: vi.fn(),
});
const header = () => ({
  activeTab: 'mindMaps' as const,
  worldMapId: null, worldMapName: '', mindMapId: map.id, mindMapName: map.name,
  characterMapId: 'char-1', characterMapName: 'מפת דמויות', characterMapReadOnly: true,
  onBackFromWorldMap: vi.fn(), onBackFromMindMap: vi.fn(), onBackFromCharacterMap: vi.fn(),
  onRenameWorldMap: vi.fn(), onRenameMindMap: vi.fn(), onRenameCharacterMap: vi.fn(),
  navigation: <nav>ניווט מחשב</nav>,
});

describe('mind map gallery and header', () => {
  it('keeps a long name readable and exposes separate native open, delete, create and import actions', async () => {
    const props = workspace();
    const tree = await MindMapsWorkspace(props);
    const html = renderToStaticMarkup(tree);
    expect(html).toContain('dir="rtl"');
    expect(html).toContain(map.name);
    expect(html).toContain('break-words');
    expect(html).toContain('flex-wrap');
    const open = find(tree, el => el.props['aria-label'] === `פתיחת מפה: ${map.name}`);
    expect(open?.type).toBe('button');
    open!.props.onClick!(click);
    expect(props.onSelectMap).toHaveBeenCalledWith(map.id);
    find(tree, el => el.type === 'button' && renderToStaticMarkup(el).includes('ייבוא מפות'))!.props.onClick!(click);
    expect(props.onOpenImport).toHaveBeenCalledOnce();
    find(tree, el => el.type === 'button' && renderToStaticMarkup(el).includes('מפה חדשה'))!.props.onClick!(click);
    expect(props.onUpdateMaps).toHaveBeenCalledWith([map, expect.objectContaining({ nodes: [], edges: [] })]);
  });

  it('keeps deletion independently reachable and requires the existing confirmation', async () => {
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    vi.stubGlobal('confirm', confirm);
    const props = workspace();
    const remove = find(await MindMapsWorkspace(props), el => el.props['aria-label'] === `מחיקת מפה: ${map.name}`);
    expect(remove?.type).toBe('button');
    remove!.props.onClick!(click);
    expect(props.onUpdateMaps).not.toHaveBeenCalled();
    remove!.props.onClick!(click);
    expect(confirm).toHaveBeenCalledWith('למחוק את מפת החשיבה?');
    expect(props.onUpdateMaps).toHaveBeenCalledWith([]);
    expect(props.onSelectMap).not.toHaveBeenCalled();
  });

  it('routes Hebrew rename and back to the selected mind map and keeps desktop navigation present', async () => {
    const props = header();
    const tree = await SelectedMapHeader(props);
    const html = renderToStaticMarkup(tree);
    expect(html).toContain('ניווט מחשב');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain(map.name);
    expect(html).toContain('min-w-0');
    find(tree, el => el.type === 'input')!.props.onChange!({ target: { value: 'רעיון חדש' } });
    find(tree, el => el.type === 'button')!.props.onClick!(click);
    expect(props.onRenameMindMap).toHaveBeenCalledWith('רעיון חדש');
    expect(props.onBackFromMindMap).toHaveBeenCalledOnce();
    expect(props.onRenameCharacterMap).not.toHaveBeenCalled();
    expect(find(await MindMapsWorkspace({ ...workspace(), currentMapId: map.id }), el => el.type === MindMapEditor)).toBeDefined();
  });

  it('uses the idea tree as the mobile editor without mounting the canvas', async () => {
    const tree = await MindMapsWorkspace({ ...workspace(), currentMapId: map.id, showIdeas: true });
    expect(find(tree, el => el.type === MindMapIdeas)).toBeDefined();
    expect(find(tree, el => el.type === MindMapEditor)).toBeUndefined();
    expect(find(tree, el => el.type === MindMapViewer)).toBeUndefined();
  });

  it('mounts the viewer without an update callback and keeps the desktop editor editable', async () => {
    const props = { ...workspace(), currentMapId: map.id, viewingMap: true };
    const mobile = await MindMapsWorkspace({ ...props, showIdeas: true });
    const viewer = find(mobile, el => el.type === MindMapViewer)!;
    expect(viewer.props).not.toHaveProperty('onUpdateMap');
    expect(find(mobile, el => el.type === MindMapEditor)).toBeUndefined();
    viewer.props.onBack!();
    expect(props.onChangeViewingMap).toHaveBeenCalledWith(false);
    expect(props.onUpdateMaps).not.toHaveBeenCalled();
    const desktop = await MindMapsWorkspace(props);
    expect(find(desktop, el => el.type === MindMapEditor)?.props).toHaveProperty('onUpdateMap');
    expect(find(desktop, el => el.type === MindMapViewer)).toBeUndefined();
    expect(find(await SelectedMapHeader({ ...header(), mindMapReadOnly: true }), el => el.type === 'input')).toBeUndefined();
  });

  it('preserves character-map viewing and editing in the shared header', async () => {
    const props = { ...header(), activeTab: 'characterDiagram' as const };
    expect(find(await SelectedMapHeader(props), el => el.type === 'input')).toBeUndefined();
    const editor = find(await SelectedMapHeader({ ...props, characterMapReadOnly: false }), el => el.type === 'input');
    editor!.props.onChange!({ target: { value: 'שם אחר' } });
    expect(props.onRenameCharacterMap).toHaveBeenCalledWith('שם אחר');
    expect(props.onRenameMindMap).not.toHaveBeenCalled();
  });

  it('uses a compact import dialog from the mind-map gallery only, with close and submit controls', () => {
    const props = {
      isOpen: true, allBooks: [], activeBookId: 'book', maps: [], mindMaps: [], characterMaps: [], characters: [],
      onUpdateMaps: vi.fn(), onUpdateMindMaps: vi.fn(), onUpdateCharacterMaps: vi.fn(),
      onUpdateCharacters: vi.fn(), onClose: vi.fn(),
    };
    const mind = renderToStaticMarkup(<MapsImportDialog {...props} category="mindMaps" />);
    const character = renderToStaticMarkup(<MapsImportDialog {...props} category="characterMaps" />);
    expect(mind).toContain('role="dialog"');
    expect(mind).toContain('סגירת ייבוא מפות');
    expect(mind).toContain('ייבא');
    expect(mind).toContain('ביטול');
    expect(character).not.toContain('max-lg:max-h-[90dvh]');
  });
});
