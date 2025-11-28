/**
 * Simple Post Persistence Service
 * Direct database operations without complex job management
 * Guest posts are saved immediately with simple status tracking
 */

import { SavedItem } from '../state/savedStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '../config/backend';

const GUEST_ID_KEY = 'pulse_guest_id';

export interface SimplePostResponse {
  success: boolean;
  post?: SavedItem;
  error?: string;
}

export interface PostStatus {
  id: string;
  url: string;
  status: 'saved' | 'processing' | 'completed' | 'failed';
  updated_at: string;
  analysis_data?: any;
}

class SimplePostService {
  private guestId: string | null = null;

  /**
   * Get or create persistent guest ID
   */
  async getGuestId(): Promise<string> {
    if (this.guestId) {
      return this.guestId;
    }

    try {
      let guestId = await AsyncStorage.getItem(GUEST_ID_KEY);

      if (!guestId) {
        // Generate new UUID for guest
        guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
        await AsyncStorage.setItem(GUEST_ID_KEY, guestId);
        console.log('[SimplePostService] Created new guest ID:', guestId);
      } else {
        console.log('[SimplePostService] Using existing guest ID:', guestId);
      }

      this.guestId = guestId;
      return guestId;
    } catch (error) {
      console.error('[SimplePostService] Error managing guest ID:', error);
      // Fallback to session-only ID
      this.guestId = 'guest_session_' + Date.now();
      return this.guestId;
    }
  }

  /**
   * Save a post immediately to database
   * No job queue - direct save operation
   */
  async savePost(item: SavedItem): Promise<SimplePostResponse> {
    try {
      const guestId = await this.getGuestId();
      const apiUrl = getApiUrl('/api/guest-posts', 'extractorw');

      console.log(`[SimplePostService] Saving post: ${item.url}`);

      const postData = {
        guestId,
        url: item.url,
        itemData: {
          ...item,
          isPending: false, // Immediately mark as not pending
          status: 'saved'
        }
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Guest-Id': guestId,
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to save post');
      }

      const data = await response.json();
      console.log(`[SimplePostService] ✅ Post saved successfully: ${item.url}`);

      return {
        success: true,
        post: {
          ...item,
          isPending: false,
          id: data.post.id,
          lastUpdated: Date.now()
        }
      };
    } catch (error) {
      console.error('[SimplePostService] Error saving post:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load all saved posts for current guest
   */
  async loadPosts(): Promise<SavedItem[]> {
    try {
      const guestId = await this.getGuestId();
      const apiUrl = getApiUrl('/api/guest-posts', 'extractorw');

      console.log('[SimplePostService] Loading posts for guest:', guestId);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Guest-Id': guestId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to load posts');
      }

      const data = await response.json();
      const posts: SavedItem[] = data.posts || [];

      console.log(`[SimplePostService] ✅ Loaded ${posts.length} posts`);
      return posts;
    } catch (error) {
      console.error('[SimplePostService] Error loading posts:', error);
      return [];
    }
  }

  /**
   * Delete a post
   */
  async deletePost(url: string): Promise<boolean> {
    try {
      const guestId = await this.getGuestId();
      const apiUrl = getApiUrl('/api/guest-posts', 'extractorw');

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Guest-Id': guestId,
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to delete post');
      }

      console.log(`[SimplePostService] ✅ Post deleted: ${url}`);
      return true;
    } catch (error) {
      console.error('[SimplePostService] Error deleting post:', error);
      return false;
    }
  }

  /**
   * Update post status (for analysis completion)
   */
  async updatePostStatus(url: string, status: PostStatus['status'], analysisData?: any): Promise<boolean> {
    try {
      const guestId = await this.getGuestId();
      const apiUrl = getApiUrl('/api/guest-posts/status', 'extractorw');

      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Guest-Id': guestId,
        },
        body: JSON.stringify({
          url,
          status,
          analysisData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update post status');
      }

      console.log(`[SimplePostService] ✅ Status updated: ${url} → ${status}`);
      return true;
    } catch (error) {
      console.error('[SimplePostService] Error updating status:', error);
      return false;
    }
  }

  /**
   * Start background analysis for a post
   * Non-blocking operation that updates status when complete
   */
  /**
   * Start background analysis for a post
   * Returns a promise that resolves with the analysis result
   */
  async startAnalysis(item: SavedItem): Promise<any> {
    try {
      // Update status to processing
      await this.updatePostStatus(item.url, 'processing');

      console.log(`[SimplePostService] Analysis started for: ${item.url}`);

      // Return the analysis promise so the caller can wait for it if desired
      return this.runBackgroundAnalysis(item);
    } catch (error) {
      console.error('[SimplePostService] Error starting analysis:', error);
      throw error;
    }
  }

  /**
   * Background analysis execution
   */
  private async runBackgroundAnalysis(item: SavedItem): Promise<any> {
    const guestId = await this.getGuestId();
    const apiUrl = getApiUrl('/api/analyze-post', 'extractorw');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: item.url,
        type: item.type,
        platform: item.platform,
        guestId
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Analysis failed: ${response.status} ${errorText}`);
    }

    const analysisData = await response.json();

    console.log('[SimplePostService] ✅ Analysis completed:', analysisData);
    return analysisData;
  }

  /**
   * Check for post status updates
   * Simple polling for analysis completion
   */
  async checkForUpdates(): Promise<PostStatus[]> {
    try {
      const guestId = await this.getGuestId();
      const apiUrl = getApiUrl('/api/guest-posts/updates', 'extractorw');

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Guest-Id': guestId,
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      if (data.length > 0) {
        const sample = data[0];
        console.log(`[SimplePostService] 📥 Loaded ${data.length} posts. Sample: ID=${sample.id}, Status=${sample.status}, HasAnalysis=${!!sample.analysisResult}`);
      } else {
        console.log('[SimplePostService] 📥 Loaded 0 posts');
      }

      return data.updates || [];
    } catch (error) {
      console.error('[SimplePostService] Error checking updates:', error);
      return [];
    }
  }

  /**
   * Clear guest data (for testing/reset)
   */
  async clearGuestData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(GUEST_ID_KEY);
      this.guestId = null;
      console.log('[SimplePostService] Guest data cleared');
    } catch (error) {
      console.error('[SimplePostService] Error clearing guest data:', error);
    }
  }
}

export const simplePostService = new SimplePostService();