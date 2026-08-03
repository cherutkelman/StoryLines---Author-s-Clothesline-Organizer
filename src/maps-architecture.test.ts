import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('maps architecture', () => {
  it('routes all four tools through independent components', () => {
    const manager = read('components/MapsManager.tsx');
    expect(manager).toContain('<CharacterMap');
    expect(manager).toContain('<WorldMapsWorkspace');
    expect(manager).toContain('<MindMapsWorkspace');
    expect(manager).toContain('<MapGallery');
    expect(manager).toContain('<MapsNavigation');
    expect(manager).toContain('<MapsImportDialog');
    expect(manager).not.toContain('<WorldMapEditor');
    expect(manager).not.toContain('<MindMapEditor');
  });

  it('centralizes the area label and navigation definitions', () => {
    const definitions = read('components/maps/mapsDefinitions.ts');
    const manager = read('components/MapsManager.tsx');
    expect(definitions).toContain("MAPS_AREA_LABEL = 'מפות'");
    expect(definitions).toContain('MAP_NAV_ITEMS');
    expect(definitions).toContain("id: 'characterDiagram'");
    expect(definitions).toContain("id: 'worldMaps'");
    expect(definitions).toContain("id: 'mindMaps'");
    expect(definitions).toContain("id: 'gallery'");
    expect(manager).not.toContain('MAP_NAV_ITEMS.map');
  });

  it('keeps persistence in App and outside the extracted tools', () => {
    const app = read('App.tsx');
    const extracted = [
      'components/maps/WorldMapsWorkspace.tsx',
      'components/maps/MindMapsWorkspace.tsx',
      'components/maps/MapsImportDialog.tsx',
      'components/maps/MapsNavigation.tsx',
      'components/maps/SelectedMapHeader.tsx',
    ].map(read).join('\n');
    expect(app).toContain("updateEntries('maps', maps)");
    expect(app).toContain("updateEntries('mindMaps', mindMaps)");
    expect(app).toContain('onUpdateMapGallery={updateMapGallery}');
    expect(extracted).not.toContain('updateActiveBook');
  });

  it('keeps the gallery independent from canvas implementations', () => {
    const gallery = read('components/MapGallery.tsx');
    expect(gallery).not.toContain('react-konva');
    expect(gallery).not.toContain('<Stage');
    expect(gallery).not.toContain('WorldMapEditor');
  });
});
