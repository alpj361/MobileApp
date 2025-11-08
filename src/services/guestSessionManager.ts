/**
 * Guest Session Manager
 * Manages the session state between guest and authenticated users
 * Handles migration of guest data to authenticated accounts
 */

import { deviceIdService } from './deviceId';
import { usePulseConnectionStore } from '../state/pulseConnectionStore';

export type SessionType = 'guest' | 'authenticated';

export interface SessionIdentifier {
  type: SessionType;
  guestId?: string;
  userId?: string;
  userEmail?: string;
}

class GuestSessionManager {
  private currentSession: SessionIdentifier | null = null;

  /**
   * Initialize session - should be called on app start
   */
  async initializeSession(): Promise<SessionIdentifier> {
    console.log('[GuestSession] Initializing session...');

    // Check if user is authenticated via Pulse Journal
    const pulseState = usePulseConnectionStore.getState();
    const isAuthenticated = pulseState.isConnected && pulseState.connectedUser;

    if (isAuthenticated && pulseState.connectedUser) {
      console.log('[GuestSession] User is authenticated:', pulseState.connectedUser.email);

      this.currentSession = {
        type: 'authenticated',
        userId: pulseState.connectedUser.id,
        userEmail: pulseState.connectedUser.email,
      };

      return this.currentSession;
    }

    // User is not authenticated - use guest mode
    const guestId = await deviceIdService.getOrCreateDeviceId();
    console.log('[GuestSession] Using guest mode:', guestId.substring(0, 8) + '...');

    this.currentSession = {
      type: 'guest',
      guestId,
    };

    return this.currentSession;
  }

  /**
   * Get current session identifier
   * Creates one if it doesn't exist
   */
  async getSessionIdentifier(): Promise<SessionIdentifier> {
    if (this.currentSession) {
      return this.currentSession;
    }

    return await this.initializeSession();
  }

  /**
   * Get cached session identifier (synchronous)
   * Returns null if not initialized
   */
  getCachedSessionIdentifier(): SessionIdentifier | null {
    return this.currentSession;
  }

  /**
   * Switch to authenticated mode
   * Called when user connects to Pulse Journal
   */
  async switchToAuthenticated(userId: string, userEmail: string): Promise<void> {
    const previousGuestId = this.currentSession?.guestId;

    console.log('[GuestSession] Switching to authenticated mode:', userEmail);

    this.currentSession = {
      type: 'authenticated',
      userId,
      userEmail,
    };

    // If there was a guest session, we should migrate data
    if (previousGuestId) {
      console.log('[GuestSession] Previous guest session detected:', previousGuestId.substring(0, 8) + '...');
      console.log('[GuestSession] Migration should be triggered (implement in migration service)');

      // Migration will be handled by the migration service
      // This is just for logging
    }
  }

  /**
   * Switch to guest mode
   * Called when user disconnects from Pulse Journal
   */
  async switchToGuest(): Promise<void> {
    console.log('[GuestSession] Switching to guest mode');

    const guestId = await deviceIdService.getOrCreateDeviceId();

    this.currentSession = {
      type: 'guest',
      guestId,
    };
  }

  /**
   * Get headers for API requests
   * Includes either guest_id or user_id
   */
  async getApiHeaders(): Promise<Record<string, string>> {
    const session = await this.getSessionIdentifier();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (session.type === 'guest' && session.guestId) {
      headers['X-Guest-Id'] = session.guestId;
    } else if (session.type === 'authenticated' && session.userId) {
      headers['X-User-Id'] = session.userId;
    }

    return headers;
  }

  /**
   * Get identifier for job association
   * Returns the appropriate ID to associate with jobs/data
   */
  async getJobIdentifier(): Promise<{ guestId?: string; userId?: string }> {
    const session = await this.getSessionIdentifier();

    if (session.type === 'guest') {
      return { guestId: session.guestId };
    } else {
      return { userId: session.userId };
    }
  }

  /**
   * Check if current session is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentSession?.type === 'authenticated';
  }

  /**
   * Check if current session is guest
   */
  isGuest(): boolean {
    return this.currentSession?.type === 'guest';
  }

  /**
   * Get guest ID if in guest mode
   */
  getGuestId(): string | undefined {
    if (this.currentSession?.type === 'guest') {
      return this.currentSession.guestId;
    }
    return undefined;
  }

  /**
   * Get user ID if authenticated
   */
  getUserId(): string | undefined {
    if (this.currentSession?.type === 'authenticated') {
      return this.currentSession.userId;
    }
    return undefined;
  }
}

export const guestSessionManager = new GuestSessionManager();
