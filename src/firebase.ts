import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithCredential, signInWithPopup, signOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore } from 'firebase/firestore';
import { isElectron, openDesktopOAuthUrl } from './platform';
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();

type ExchangeGoogleOAuthCodeResponse = {
  idToken?: string | null;
  accessToken?: string | null;
};

function base64UrlEncode(arrayBuffer: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function generateCodeVerifier() {
  const random = new Uint8Array(32)
  crypto.getRandomValues(random)
  return base64UrlEncode(random.buffer)
}

async function generateCodeChallenge(verifier: string) {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(digest)
}

export const signIn = async () => {
  try {
    console.log('[AUTH] Starting Google sign-in');
    console.log('[AUTH] origin:', window.location.origin);
    let result;

    if (isElectron) {
      console.log('[AUTH] Electron mode - external browser flow');

      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const redirectUri = 'http://127.0.0.1:3000';

      if (!clientId) {
        throw new Error('Missing Google OAuth client ID');
      }

      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      sessionStorage.setItem('google_code_verifier', codeVerifier);

      const url =
        'https://accounts.google.com/o/oauth2/v2/auth' +
        `?client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent('openid email profile')}` +
        `&code_challenge=${encodeURIComponent(codeChallenge)}` +
        `&code_challenge_method=S256` +
        `&access_type=offline` +
        `&prompt=consent`;

      let code: string | null = null;

      code = await openDesktopOAuthUrl(url);

      console.log('[AUTH] OAuth code received:', Boolean(code));

      if (!code) {
        throw new Error('Missing authorization code from Google');
      }

      const storedCodeVerifier = sessionStorage.getItem('google_code_verifier');

      if (!storedCodeVerifier) {
        throw new Error('Missing code verifier');
      }

      console.log('[AUTH] Exchanging Google OAuth code through Firebase Function', {
        redirectUri,
        hasCode: Boolean(code),
        hasCodeVerifier: Boolean(storedCodeVerifier),
      });

      const exchangeGoogleOAuthCode = httpsCallable<
        { code: string; codeVerifier: string; redirectUri: string },
        ExchangeGoogleOAuthCodeResponse
      >(functions, 'exchangeGoogleOAuthCode');

      const tokenResult = await exchangeGoogleOAuthCode({
        code,
        codeVerifier: storedCodeVerifier,
        redirectUri,
      });

      const tokenData = tokenResult.data;
      const hasIdToken = Boolean(tokenData.idToken);
      const hasAccessToken = Boolean(tokenData.accessToken);

      console.log('[AUTH] Google token response received from Firebase Function:', {
        hasIdToken,
        hasAccessToken,
      });

      if (!hasIdToken && !hasAccessToken) {
        throw new Error('No id_token or access_token received from Google');
      }

      const credential = GoogleAuthProvider.credential(
        tokenData.idToken || null,
        tokenData.accessToken || undefined
      );
      result = await signInWithCredential(auth, credential);
    } else {
      result = await signInWithPopup(auth, googleProvider);
    }
    console.log('[AUTH] SUCCESS', {
      uid: result.user?.uid,
      email: result.user?.email,
    });

    return result;
  } catch (error: any) {
    console.error('[AUTH] FAILED');
    console.error('[AUTH] code:', error?.code);
    console.error('[AUTH] message:', error?.message);
    console.error('[AUTH] full:', error);

    throw error;
  }
};
export const logOut = () => signOut(auth);
