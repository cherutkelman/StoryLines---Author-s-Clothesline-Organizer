import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithCredential, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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
export const googleProvider = new GoogleAuthProvider();

const isElectron = window.location.protocol === 'file:';

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
        if (isElectron) {
    console.log('[AUTH] Electron mode - external browser flow');

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const redirectUri = "http://127.0.0.1:3000"

const codeVerifier = generateCodeVerifier()
const codeChallenge = await generateCodeChallenge(codeVerifier)

sessionStorage.setItem('google_code_verifier', codeVerifier)

const url =
  "https://accounts.google.com/o/oauth2/v2/auth" +
  `?client_id=${encodeURIComponent(clientId)}` +
  `&redirect_uri=${encodeURIComponent(redirectUri)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent('openid email profile')}` +
  `&code_challenge=${encodeURIComponent(codeChallenge)}` +
  `&code_challenge_method=S256` +
  `&access_type=offline` + `&prompt=consent`

    // קריאה ל־Electron לפתוח דפדפן
    // @ts-ignore
  let code = null;

  if ((window as any).require) {
    const electron = (window as any).require('electron');
    code = await electron.ipcRenderer.invoke('open-external-url', url);
  }

   const storedCodeVerifier = sessionStorage.getItem('google_code_verifier')

    if (!storedCodeVerifier) {
    throw new Error('Missing code verifier')
    }
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
        client_id: clientId,
        code,
        code_verifier: storedCodeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
    }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.id_token) {
      throw new Error('No id_token received from Google')
    }

    const credential = GoogleAuthProvider.credential(tokenData.id_token)
    await signInWithCredential(auth, credential)

    return result


    return;
    }
    return;
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
