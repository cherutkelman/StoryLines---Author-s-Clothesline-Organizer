import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, getRedirectResult, GoogleAuthProvider, setPersistence, signInWithCredential, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore } from 'firebase/firestore';
import { logAuthDebugEvent, shortUid } from './authDebug';
import { isElectron, openDesktopOAuthUrl } from './platform';

const REQUIRED_FIREBASE_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

export const missingFirebaseEnvVars = REQUIRED_FIREBASE_ENV_VARS.filter(
  (name) => !import.meta.env[name]
);

export const isFirebaseConfigured = missingFirebaseEnvVars.length === 0;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '__missing_firebase_api_key__',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '__missing_firebase_auth_domain__',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '__missing_firebase_project_id__',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '__missing_firebase_storage_bucket__',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '__missing_firebase_messaging_sender_id__',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '__missing_firebase_app_id__',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();

const shouldUseRedirectAuth = () => {
  if (typeof window === 'undefined') return false;

  const isSmallScreen = window.matchMedia('(max-width: 768px)').matches;
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
  const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent);

  return isMobileUserAgent || isSmallScreen || isTouchDevice;
};

const ensureAuthPersistence = async () => {
  try {
    logAuthDebugEvent('Persistence setup started');
    await setPersistence(auth, browserLocalPersistence);
    console.log('[AUTH] Persistence set to browserLocalPersistence');
    logAuthDebugEvent('Persistence setup succeeded');
  } catch (error) {
    console.error('[AUTH] Persistence error:', error);
    logAuthDebugEvent('Persistence error', {
      code: (error as any)?.code,
      message: (error as any)?.message,
    });
    throw error;
  }
};

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
    await ensureAuthPersistence();
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
    } else if (shouldUseRedirectAuth()) {
      console.log('[AUTH] Redirect started', {
        reason: 'mobile-browser',
        userAgent: window.navigator.userAgent,
      });
      logAuthDebugEvent('Google redirect started', {
        origin: window.location.origin,
        mode: 'mobile',
      });
      await signInWithRedirect(auth, googleProvider);
      return null;
    } else {
      console.log('[AUTH] Web desktop mode - popup flow');
      logAuthDebugEvent('Google popup started', {
        origin: window.location.origin,
        mode: 'desktop',
      });
      result = await signInWithPopup(auth, googleProvider);
    }
    console.log('[AUTH] SUCCESS', {
      uid: result.user?.uid,
      email: result.user?.email,
    });
    logAuthDebugEvent('User signed in', {
      uid: shortUid(result.user?.uid),
      hasUser: Boolean(result.user),
    });

    return result;
  } catch (error: any) {
    console.error('[AUTH] FAILED');
    console.error('[AUTH] code:', error?.code);
    console.error('[AUTH] message:', error?.message);
    console.error('[AUTH] full:', error);
    logAuthDebugEvent('Redirect error', {
      code: error?.code,
      message: error?.message,
    });

    throw error;
  }
};

export const completeRedirectSignIn = async () => {
  if (isElectron) return null;

  try {
    await ensureAuthPersistence();
    console.log('[AUTH] Checking redirect result...');
    logAuthDebugEvent('Redirect check started', {
      origin: window.location.origin,
    });

    const result = await getRedirectResult(auth);
    if (result?.user) {
      console.log('[AUTH] Redirect result received', {
        uid: result.user.uid,
        email: result.user.email,
      });
      logAuthDebugEvent('Redirect result received', {
        uid: shortUid(result.user.uid),
        hasUser: true,
      });
    } else {
      console.log('[AUTH] Redirect result is null. Current user:', {
        uid: auth.currentUser?.uid,
        email: auth.currentUser?.email,
      });
      logAuthDebugEvent('Redirect result empty', {
        currentUser: Boolean(auth.currentUser),
        uid: shortUid(auth.currentUser?.uid),
      });
    }
    return result;
  } catch (error) {
    console.error('[Auth] Google redirect sign-in failed:', error);
    logAuthDebugEvent('Redirect error', {
      code: (error as any)?.code,
      message: (error as any)?.message,
    });
    throw error;
  }
};

export const logOut = () => signOut(auth);
