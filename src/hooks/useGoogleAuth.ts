import { useEffect } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { verifyPulseUser, ConnectionResult } from '../services/pulseAuth';

// Complete auth session when returning to app
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
const GOOGLE_CLIENT_ID = '791862052938-rirmu7a1gqs7ji0eghhk00mr8mstjaoc.apps.googleusercontent.com';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  userInfoEndpoint: 'https://www.googleapis.com/oauth2/v2/userinfo',
};

export function useGoogleAuth() {
  // Generate proper redirect URI for the current environment
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'com.vibecode.app',
    path: '/auth/callback',
  });

  console.log('Generated redirect URI:', redirectUri);

  // Create auth request
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Code,
      redirectUri: redirectUri,
      usePKCE: true,
    },
    discovery
  );

  // Handle authentication response
  useEffect(() => {
    if (response?.type === 'success') {
      handleAuthSuccess(response.params.code);
    }
  }, [response]);

  const handleAuthSuccess = async (code: string) => {
    try {
      // Send the code to the bridge server for token exchange
      const bridgeResponse = await fetch('https://server.standatpd.com/auth/google/exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          redirectUri: redirectUri,
          clientId: GOOGLE_CLIENT_ID,
          // Include PKCE verifier so the server can exchange the code
          codeVerifier: (request as any)?.codeVerifier,
        }),
      });

      if (!bridgeResponse.ok) {
        const errorText = await bridgeResponse.text().catch(() => '');
        console.error('Bridge token exchange failed:', bridgeResponse.status, errorText);
        throw new Error('Failed to exchange code for tokens');
      }

      const tokenData = await bridgeResponse.json();

      if (tokenData.access_token) {
        // Get user info from Google
        const userInfoResponse = await fetch(discovery.userInfoEndpoint, {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        });

        const userInfo = await userInfoResponse.json();

        if (userInfo.email) {
          // Verify user exists in Pulse Journal
          const pulseUser = await verifyPulseUser(userInfo.email);
          
          return {
            success: true,
            user: pulseUser,
            error: pulseUser ? null : 'No se encontró una cuenta de Pulse Journal asociada a este email.',
          } as ConnectionResult;
        }
      }

      return {
        success: false,
        error: 'No se pudo obtener la información del usuario de Google.',
      } as ConnectionResult;
    } catch (error) {
      console.error('Error in handleAuthSuccess:', error);
      return {
        success: false,
        error: 'Error durante el intercambio de tokens con Google.',
      } as ConnectionResult;
    }
  };

  const connectWithGoogle = async (): Promise<ConnectionResult> => {
    try {
      if (!request) {
        return {
          success: false,
          error: 'La solicitud de autenticación no está lista. Intenta de nuevo.',
        };
      }

      const result = await promptAsync();
      
      if (result.type === 'cancel') {
        return {
          success: false,
          error: 'La autenticación con Google fue cancelada.',
        };
      }

      if (result.type === 'error') {
        return {
          success: false,
          error: 'Error durante la autenticación con Google.',
        };
      }

      if (result.type === 'success' && result.params.code) {
        return await handleAuthSuccess(result.params.code);
      }

      return {
        success: false,
        error: 'No se recibió un código de autorización válido.',
      };
    } catch (error) {
      console.error('Error in connectWithGoogle:', error);
      return {
        success: false,
        error: 'Error inesperado durante la conexión con Google.',
      };
    }
  };

  return {
    request,
    response,
    connectWithGoogle,
    isReady: !!request,
  };
}