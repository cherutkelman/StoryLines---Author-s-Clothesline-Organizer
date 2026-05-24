const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

const googleClientId = defineSecret('GOOGLE_CLIENT_ID');
const googleClientSecret = defineSecret('GOOGLE_CLIENT_SECRET');

exports.exchangeGoogleOAuthCode = onCall(
  {
    invoker: 'public',
    secrets: [googleClientId, googleClientSecret],
  },
  async (request) => {
    const { code, codeVerifier, redirectUri } = request.data || {};

    if (!code || typeof code !== 'string') {
      throw new HttpsError('invalid-argument', 'Missing Google OAuth authorization code');
    }

    if (!codeVerifier || typeof codeVerifier !== 'string') {
      throw new HttpsError('invalid-argument', 'Missing Google OAuth code verifier');
    }

    if (redirectUri !== 'http://127.0.0.1:3000') {
      throw new HttpsError('invalid-argument', 'Invalid Google OAuth redirect URI');
    }

    const clientId = googleClientId.value();
    const clientSecret = googleClientSecret.value();

    if (!clientId || !clientSecret) {
      throw new HttpsError('failed-precondition', 'Google OAuth server secrets are not configured');
    }

    const tokenParams = new URLSearchParams();
    tokenParams.append('code', code);
    tokenParams.append('client_id', clientId);
    tokenParams.append('client_secret', clientSecret);
    tokenParams.append('redirect_uri', redirectUri);
    tokenParams.append('grant_type', 'authorization_code');
    tokenParams.append('code_verifier', codeVerifier);

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams,
    });

    console.log('Google token exchange status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      let errorData = null;

      try {
        errorData = JSON.parse(errorText);
      } catch {
        // Keep the raw text for the safe diagnostic below.
      }

      if (errorData) {
        console.error('Google token exchange error:', {
          error: errorData.error,
          error_description: errorData.error_description,
        });
      } else {
        console.error('Google token exchange error text:', errorText);
      }

      const googleError = errorData?.error || `HTTP ${tokenResponse.status}`;
      const googleDescription = errorData?.error_description
        ? `: ${errorData.error_description}`
        : '';
      throw new HttpsError(
        'failed-precondition',
        `Google token exchange failed (${googleError})${googleDescription}`
      );
    }

    const tokenData = await tokenResponse.json();
    const hasIdToken = Boolean(tokenData.id_token);
    const hasAccessToken = Boolean(tokenData.access_token);

    console.log('Google token exchange received tokens:', {
      hasIdToken,
      hasAccessToken,
    });

    if (!hasIdToken && !hasAccessToken) {
      throw new HttpsError('failed-precondition', 'No Google sign-in token received');
    }

    return {
      idToken: tokenData.id_token || null,
      accessToken: tokenData.access_token || null,
    };
  }
);
