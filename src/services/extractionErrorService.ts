// Extraction Error Reporting Service
// Reports failed extractions to ExtractorW API
import { getApiUrl } from '../config/backend';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ReportExtractionErrorParams {
  platform: 'x' | 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'other';
  post_url: string;
  error_type?: string;
  error_message?: string;
  extraction_step?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  full_logs?: any;
}

interface ReportExtractionErrorResponse {
  success: boolean;
  message?: string;
  error_id?: string;
  error?: string;
}

/**
 * Report a failed extraction to the backend
 * @param params - Error report parameters
 * @returns Promise with report result
 */
export async function reportExtractionError(
  params: ReportExtractionErrorParams
): Promise<ReportExtractionErrorResponse> {
  try {
    console.log('[Extraction Error Service] Reporting error for:', params.post_url);

    // Get auth token (optional - use anonymous if not available)
    let userEmail = 'anonymous@vizta.app';
    let authToken: string | null = null;

    try {
      const tokenData = await AsyncStorage.getItem('auth_token');
      if (tokenData) {
        const parsed = JSON.parse(tokenData);
        authToken = parsed.token;
        userEmail = parsed.email || 'anonymous@vizta.app';
      }
    } catch (error) {
      console.log('[Extraction Error Service] No auth token, using anonymous');
    }

    const apiUrl = getApiUrl();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Platform': 'mobile-web',
    };

    // Only add Authorization header if we have a token
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${apiUrl}/api/extraction-errors/report`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        platform: params.platform,
        post_url: params.post_url,
        error_type: params.error_type || 'user_reported',
        error_message: params.error_message || 'User reported extraction issue',
        extraction_step: params.extraction_step || 'unknown',
        severity: params.severity || 'medium',
        full_logs: {
          ...params.full_logs,
          reported_from: 'mobile_web_app',
          timestamp: new Date().toISOString(),
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('[Extraction Error Service] ✅ Error reported successfully:', data.error_id);

    return {
      success: true,
      message: data.message,
      error_id: data.error_id,
    };

  } catch (error) {
    console.error('[Extraction Error Service] ❌ Failed to report error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get recent extraction errors for the current user
 * @param filters - Optional filters
 * @returns Promise with errors list
 */
export async function getRecentExtractionErrors(filters?: {
  platform?: string;
  error_type?: string;
  limit?: number;
}) {
  try {
    console.log('[Extraction Error Service] Fetching recent errors');

    // Get auth token (optional)
    let authToken: string | null = null;

    try {
      const tokenData = await AsyncStorage.getItem('auth_token');
      if (tokenData) {
        const parsed = JSON.parse(tokenData);
        authToken = parsed.token;
      }
    } catch (error) {
      console.log('[Extraction Error Service] No auth token available');
    }

    const apiUrl = getApiUrl();
    const queryParams = new URLSearchParams();
    if (filters?.platform) queryParams.append('platform', filters.platform);
    if (filters?.error_type) queryParams.append('error_type', filters.error_type);
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());

    const headers: Record<string, string> = {
      'X-Platform': 'mobile-web',
    };

    // Only add Authorization header if we have a token
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(
      `${apiUrl}/api/extraction-errors/recent?${queryParams.toString()}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('[Extraction Error Service] ✅ Fetched', data.count, 'errors');

    return {
      success: true,
      data: data.data,
      count: data.count,
    };

  } catch (error) {
    console.error('[Extraction Error Service] ❌ Failed to fetch errors:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [],
      count: 0,
    };
  }
}
