import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const editor = readFileSync('components/WorldMapEditor.tsx', 'utf8');
const characterMap = readFileSync('components/CharacterMap.tsx', 'utf8');
const mindMap = readFileSync('components/MindMapEditor.tsx', 'utf8');

describe('world map pan interaction', () => {
  it('removes the dedicated pan button and activates pan on an empty-stage double click', () => {
    expect(editor).not.toContain('title="הזזת מפה"');
    expect(editor).not.toContain('<Hand');
    expect(editor).toContain('if (e.target === stage)');
    expect(editor).toContain("switchTool('pan')");
    expect(editor).toContain("setActiveTab('pan')");
  });

  it('does not treat the background image as an interactive element', () => {
    expect(editor).toContain('opacity={0.8}');
    expect(editor).toContain('listening={false}');
  });

  it('leaves pan mode when a map element or interface button is clicked', () => {
    expect(editor).toContain("if (tool === 'pan')");
    expect(editor).toContain("id && id.startsWith('el-')");
    expect(editor).toContain("target.closest('button')");
    expect(editor).toContain("switchTool('select')");
    expect(editor).toContain("setActiveTab('select')");
  });

  it('keeps stage dragging limited to pan mode', () => {
    expect(editor).toContain("draggable={tool === 'pan'}");
  });
});

describe('character map pan interaction', () => {
  it('uses an empty-area double click instead of a dedicated pan button', () => {
    expect(characterMap).not.toContain('<Grab');
    expect(characterMap).not.toContain('title="הזזת כל המפה"');
    expect(characterMap).toContain('onDoubleClick={handleCanvasDoubleClick}');
    expect(characterMap).toContain("setTool('pan')");
  });

  it('does not activate pan from characters or connection controls', () => {
    expect(characterMap).toContain("target.closest('[data-character-map-element], button, input, textarea, label')");
    expect(characterMap).toContain('data-character-map-element="character"');
    expect(characterMap).toContain('data-character-map-element="connection"');
  });

  it('leaves pan mode on a character, connection control, or interface button', () => {
    expect(characterMap).toContain("if (tool === 'pan')");
    expect(characterMap).toContain("setTool('link')");
    expect(characterMap).toContain("target.closest('button')");
  });

  it('removes the move button and lets the selected character be dragged', () => {
    expect(characterMap).not.toContain('onClick={() => setTool(\'move\')}');
    expect(characterMap).toContain('onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}');
    expect(characterMap).toContain('const selectNode = (id: string) =>');
    expect(characterMap).toMatch(/setSelectedNodeId\(id\);\s+setMovingNodeId\(id\);/);
    expect(characterMap).toContain('if (movingNodeId === id) setDraggingNodeId(id)');
  });

  it('delays a single click so it only selects and does not interfere with a double click', () => {
    expect(characterMap).toContain('nodeClickTimeoutRef.current = setTimeout');
    expect(characterMap).toContain('clearTimeout(nodeClickTimeoutRef.current)');
    expect(characterMap).toContain('selectNode(id)');
  });

  it('creates a connection only when a different character is double-clicked', () => {
    expect(characterMap).toContain('if (selectedNodeId && selectedNodeId !== id)');
    expect(characterMap).toContain('connectSelectedNodeTo(id)');
    expect(characterMap).toContain('onUpdateConnections([...connections, newConn])');
  });

  it('keeps selected-character edit controls available', () => {
    expect(characterMap).toContain("updateNode(node.id, { name: e.target.value })");
    expect(characterMap).toContain('handleImageUpload(node.id');
    expect(characterMap).toContain('handleRemoveImage(node.id)');
    expect(characterMap).toContain('deleteNode(node.id)');
  });
});

describe('mind map pan interaction', () => {
  it('enables stage dragging only after an empty-stage double click', () => {
    expect(mindMap).toContain('const [isPanMode, setIsPanMode] = useState(false)');
    expect(mindMap).toContain('if (e.target !== stageRef.current) return;');
    expect(mindMap).toContain('setIsPanMode(true)');
    expect(mindMap).toContain('draggable={isPanMode}');
  });

  it('leaves pan mode when a node or interface button is clicked', () => {
    expect(mindMap).toContain('draggable={!isPanMode}');
    expect(mindMap).toContain('stage?.stopDrag()');
    expect(mindMap).toContain('setIsPanMode(false)');
    expect(mindMap).toContain("target.closest('button')");
  });
});
