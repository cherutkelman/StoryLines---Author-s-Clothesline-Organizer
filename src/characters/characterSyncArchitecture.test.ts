import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('character sync architecture', () => {
  it('shares one approved field definition with character import', () => {
    const shared = read('src/characters/characterSharedData.ts');
    const importer = read('src/characters/characterImport.ts');
    const sync = read('src/characters/characterSync.ts');

    expect(shared).toContain('export const SHARED_CHARACTER_DATA_KEYS');
    expect(importer).toContain("from './characterSharedData'");
    expect(sync).toContain("from './characterSharedData'");
    expect(importer).not.toContain("'daily_life',");
    expect(sync).not.toContain("'daily_life',");
  });

  it('contains no UI, persistence, Firestore, or automatic sync wiring', () => {
    const sync = read('src/characters/characterSync.ts');
    const app = read('App.tsx');

    expect(sync).not.toMatch(/firebase|firestore|setDoc|updateDoc|writeBatch/);
    expect(sync).not.toContain('React');
    expect(app).not.toContain('applyCharacterSyncResolutions');
  });

  it('leaves linked character and map import paths unchanged', () => {
    const characterImporter = read('components/questionnaires/CharacterImportDialog.tsx');
    const mapImporter = read('components/maps/MapsImportDialog.tsx');

    expect(characterImporter).toContain('importLinkedCharacterIntoBook');
    expect(mapImporter).toContain('prepareCharactersForImportedMaps(');
    expect(mapImporter).not.toContain('characterSync');
  });
});
