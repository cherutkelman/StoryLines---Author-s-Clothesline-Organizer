import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const firebaseSource = readFileSync('src/firebase.ts', 'utf8');

describe('Google account selection', () => {
  it('configures the shared Firebase provider to select an account', () => {
    expect(firebaseSource).toContain("googleProvider.setCustomParameters({\n  prompt: 'select_account',\n});");
    expect(firebaseSource).toContain('signInWithRedirect(auth, googleProvider)');
    expect(firebaseSource).toContain('signInWithPopup(auth, googleProvider)');
  });

  it('uses account selection in the separate Electron OAuth flow', () => {
    expect(firebaseSource).toContain('`&prompt=select_account`');
    expect(firebaseSource).not.toContain('`&prompt=consent`');
  });
});
