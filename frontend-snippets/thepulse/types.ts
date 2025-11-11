export type ExplorationType =
  | 'deep_dive'
  | 'topic'
  | 'data_money'
  | 'data_timeline'
  | 'source_compare'
  | 'questions';

export interface ExplorationSuggestionUI {
  icon?: string; // e.g., 'Search', 'Compass', 'TrendingUp', etc.
  color?: 'blue' | 'indigo' | 'emerald' | 'amber' | 'purple' | 'pink' | 'gray';
  variant?: 'solid' | 'soft' | 'outline';
  layout?: 'inline' | 'grid';
  priority?: number; // higher means show first
}

export interface ExplorationSuggestionAnalytics {
  traceId?: string;
  actionId?: string;
}

export interface ExplorationSuggestion {
  id: string;
  type: ExplorationType;
  title: string;
  prompt: string;
  score?: number;
  sourceCount?: number;
  explanation?: string;
  ui?: ExplorationSuggestionUI;
  analytics?: ExplorationSuggestionAnalytics;
}

export interface ViztaChatResponse<TResponse = any> {
  success: boolean;
  response: {
    message: string;
    agent: string;
    type?: string;
    sources?: Array<{ url: string; title: string; platform?: string }>;
    timestamp?: string;
  } & TResponse;
  conversationId?: string;
  sources?: Array<{ url: string; title: string; platform?: string }>;
  quantifiableData?: any[];
  explorationSuggestions?: ExplorationSuggestion[];
  metadata?: Record<string, any>;
  error?: string;
}

