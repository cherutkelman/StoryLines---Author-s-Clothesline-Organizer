import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync('App.tsx', 'utf8');
const firebaseSource = readFileSync('src/firebase.ts', 'utf8');

describe('mobile logout UI', () => {
  it('reuses the existing Firebase logout action and closes the mobile drawer', () => {
    expect(firebaseSource).toContain('export const logOut = () => signOut(auth)');
    expect(appSource).toContain('const handleLogout = () => {');
    expect(appSource).toContain('setIsMobileLibraryOpen(false);\n    return logout();');
  });

  it('shows logout only in the signed-in mobile drawer footer', () => {
    expect(appSource).toContain('{user && (');
    expect(appSource).toContain('onClick={handleLogout}');
    expect(appSource).toContain('<span>התנתקות</span>');
  });
});
