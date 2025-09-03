import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../config/supabase';
import { verifyPulseUser, ConnectionResult } from '../services/pulseAuth';

// Complete auth session when returning to app
WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [isReady] = useState(true);

  const connectWithGoogle = async (): Promise<ConnectionResult> => {
    try {
      // Generate redirect URI for the current environment
      const redirectTo = makeRedirectUri({
        scheme: 'com.vibecode.app',
        path: '/auth/callback',
      });

      console.log('Using redirect URI:', redirectTo);

      // Use Supabase OAuth instead of custom implementation
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Supabase OAuth error:', error);
        return {
          success: false,
          error: 'Error durante la autenticación con Google.',
        };
      }

      // Wait for the auth state change to get the session
      return new Promise((resolve) => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user?.email) {
              // Unsubscribe to avoid memory leaks
              subscription.unsubscribe();

              // Verify user exists in Pulse Journal
              const pulseUser = await verifyPulseUser(session.user.email);
              
              if (pulseUser) {
                resolve({
                  success: true,
                  user: pulseUser,
                });
              } else {
                // Sign out from Supabase since user doesn't exist in Pulse Journal
                await supabase.auth.signOut();
                resolve({
                  success: false,
                  error: 'No se encontró una cuenta de Pulse Journal asociada a este email.',
                });
              }
            } else if (event === 'SIGNED_OUT') {
              subscription.unsubscribe();
              resolve({
                success: false,
                error: 'La autenticación con Google fue cancelada.',
              });
            }
          }
        );

        // Set a timeout to avoid hanging indefinitely
        setTimeout(() => {
          subscription.unsubscribe();
          resolve({
            success: false,
            error: 'Tiempo de espera agotado durante la autenticación.',
          });
        }, 30000); // 30 seconds timeout
      });

    } catch (error) {
      console.error('Error in connectWithGoogle:', error);
      return {
        success: false,
        error: 'Error inesperado durante la conexión con Google.',
      };
    }
  };

  return {
    connectWithGoogle,
    isReady,
  };
}