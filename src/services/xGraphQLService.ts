const BEARER_TOKEN = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

const OPERATIONS = {
  TweetResultByRestId: 'URPP6YZ5eDCjdVMSREn4gg',
};

export interface TweetGraphQLMetrics {
  likes?: number;
  replies?: number;
  reposts?: number;
  views?: number;
}

export interface TweetGraphQLDetails {
  text?: string;
  metrics?: TweetGraphQLMetrics;
  authorHandle?: string;
  authorName?: string;
  createdAt?: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function fetchGuestToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.token;
  }

  const response = await fetch('https://api.twitter.com/1.1/guest/activate.json', {
    method: 'POST',
    headers: {
      Authorization: BEARER_TOKEN,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Guest token request failed with ${response.status}`);
  }

  const data = await response.json() as { guest_token?: string };
  if (!data?.guest_token) {
    throw new Error('Guest token missing');
  }

  cachedToken = {
    token: data.guest_token,
    expiresAt: now + 9 * 60 * 1000,
  };

  return data.guest_token;
}

function parseTweetNode(raw: any): TweetGraphQLDetails | null {
  if (!raw) return null;
  let node = raw;
  if (node.tweet) node = node.tweet;

  const legacy = node.legacy ?? {};
  const text: string | undefined = legacy.full_text || legacy.fullText || node.note_tweet?.note_tweet_results?.result?.text;
  const views = legacy.views?.count ?? node.views?.count ?? node.ext_views?.count;

  const metrics: TweetGraphQLMetrics = {
    likes: typeof legacy.favorite_count === 'number' ? legacy.favorite_count : undefined,
    replies: typeof legacy.reply_count === 'number' ? legacy.reply_count : undefined,
    reposts: typeof legacy.retweet_count === 'number' ? legacy.retweet_count : undefined,
    views: typeof views === 'number' ? views : undefined,
  };

  const userLegacy = node.core?.user_results?.result?.legacy;
  const authorHandle = userLegacy?.screen_name;
  const authorName = userLegacy?.name;

  return {
    text,
    metrics,
    authorHandle,
    authorName,
    createdAt: legacy.created_at,
  };
}

function extractTweetDetails(data: any): TweetGraphQLDetails | null {
  let tweet = data?.data?.tweetResult?.result;
  if (!tweet) {
    const instructions = data?.data?.threaded_conversation_with_injections_v2?.instructions ?? [];
    for (const instruction of instructions) {
      if (instruction?.type !== 'TimelineAddEntries') continue;
      const entries = instruction.entries ?? [];
      for (const entry of entries) {
        const content = entry?.content?.itemContent ?? entry?.content?.content ?? entry?.content;
        const result = content?.tweet_results?.result;
        if (!result) continue;
        tweet = result;
        break;
      }
      if (tweet) break;
    }
  }

  if (!tweet) return null;
  return parseTweetNode(tweet);
}

function buildGraphQLUrl(tweetId: string): string {
  const variables = {
    tweetId,
    withCommunity: true,
    includePromotedContent: false,
    withVoice: true,
  };

  const features = {
    rweb_lists_timeline_redesign_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: true,
    tweetypie_unmention_optimization_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: false,
    tweet_awards_web_tipping_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: false,
    rweb_video_timestamps_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_enhance_cards_enabled: false,
  };

  const params = new URLSearchParams();
  params.set('variables', JSON.stringify(variables));
  params.set('features', JSON.stringify(features));

  return `https://twitter.com/i/api/graphql/${OPERATIONS.TweetResultByRestId}/TweetResultByRestId?${params.toString()}`;
}

async function requestTweetDetails(tweetId: string, attempt = 0): Promise<TweetGraphQLDetails | null> {
  const guestToken = await fetchGuestToken();
  const url = buildGraphQLUrl(tweetId);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: BEARER_TOKEN,
      'x-guest-token': guestToken,
      'Accept-Language': 'en-US,en;q=0.8',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    },
  });

  if ((response.status === 401 || response.status === 403) && attempt === 0) {
    cachedToken = null;
    return requestTweetDetails(tweetId, attempt + 1);
  }

  if (!response.ok) {
    throw new Error(`GraphQL request failed with ${response.status}`);
  }

  const data = await response.json();
  return extractTweetDetails(data);
}

export async function fetchTweetDetailsGraphQL(tweetId?: string): Promise<TweetGraphQLDetails | null> {
  if (!tweetId) return null;
  try {
    return await requestTweetDetails(tweetId);
  } catch (error) {
    console.warn('[X GraphQL] Failed to load tweet details:', error);
    return null;
  }
}
