import { InstagramComment } from '../api/link-processor';

const EXTRACTORW_BASE_URL = 'https://server.standatpd.com';

export interface InstagramCommentsResponse {
  success: boolean;
  comments: InstagramComment[];
  totalCount: number;
  error?: string;
}

export async function extractInstagramComments(url: string): Promise<InstagramCommentsResponse> {
  try {
    const response = await fetch(`${EXTRACTORW_BASE_URL}/api/instagram/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        includeReplies: true,
        maxComments: 100 // Configurable limit
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      comments: data.comments || [],
      totalCount: data.totalCount || 0,
    };
  } catch (error) {
    console.error('Error extracting Instagram comments:', error);
    return {
      success: false,
      comments: [],
      totalCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function getInstagramCommentsSummary(url: string): Promise<{
  totalComments: number;
  hasComments: boolean;
  topComments: InstagramComment[];
}> {
  try {
    const result = await extractInstagramComments(url);

    if (!result.success) {
      return {
        totalComments: 0,
        hasComments: false,
        topComments: [],
      };
    }

    const topComments = result.comments
      .sort((a, b) => (b.likes || 0) - (a.likes || 0))
      .slice(0, 3);

    return {
      totalComments: result.totalCount,
      hasComments: result.comments.length > 0,
      topComments,
    };
  } catch (error) {
    console.error('Error getting Instagram comments summary:', error);
    return {
      totalComments: 0,
      hasComments: false,
      topComments: [],
    };
  }
}