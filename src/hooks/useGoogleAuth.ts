import { useEffect } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { verifyPulseUser, ConnectionResult } from '../services/pulseAuth';

// Complete auth session when returning to app
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
const GOOGLE_CLIENT_ID = '80973030831-7v96jltgkg4r31r8n68du9vjpjutuq3o.apps.googleusercontent.com';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  userInfoEndpoint: 'https://www.googleapis.com/oauth2/v2/userinfo',
};

export function useGoogleAuth() {
  // Create auth request
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Code,
      redirectUri: AuthSession.makeRedirectUri({
        scheme: 'exp',
      }),
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
      // Exchange code for tokens
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId: GOOGLE_CLIENT_ID,
          code,
          redirectUri: AuthSession.makeRedirectUri({
            scheme: 'exp',
          }),
        },
        discovery
      );

      if (tokenResponse.accessToken) {
        // Get user info from Google
        const userInfoResponse = await fetch(discovery.userInfoEndpoint, {
          headers: {
            Authorization: `Bearer ${tokenResponse.accessToken}`,
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