// Universal Social Media Entity Types
// Works for all platforms: X, Instagram, TikTok, YouTube, etc.

export type EntityType =
  | 'hashtag'
  | 'cashtag'
  | 'mention'
  | 'url'
  | 'date'
  | 'amount'
  | 'location'
  | 'entity'
  | 'emoji';

export type EntitySource =
  | 'vision'        // HIGH PRIORITY: Visual content (OCR, text in images)
  | 'transcription' // HIGH PRIORITY: Spoken content
  | 'post'          // MEDIUM PRIORITY: Main post text
  | 'description'   // MEDIUM PRIORITY: Additional description
  | 'comment'       // LOW PRIORITY: User comments (marked as "possible")
  | 'metadata';     // Platform-provided metadata

export type EntityPriority = 'high' | 'medium' | 'low';

export interface ExtractedEntity {
  // Entity data
  type: EntityType;
  value: string;
  normalized_value?: string;
  display_value?: string;

  // Source information
  context?: string;
  source: EntitySource;
  source_priority: EntityPriority;
  source_author?: string;

  // Comment flag (data from comments is "possible")
  is_possible?: boolean;

  // Cross-validation
  appears_in_sources?: string[];
  occurrences?: number;

  // Confidence
  confidence?: number;
  metadata?: Record<string, any>;
}

// Entity display configuration
export const ENTITY_COLORS: Record<EntityType, string> = {
  hashtag: '#3B82F6',    // Blue
  cashtag: '#10B981',    // Green
  mention: '#8B5CF6',    // Purple
  url: '#6B7280',        // Gray
  date: '#F59E0B',       // Orange
  amount: '#059669',     // Emerald
  location: '#EF4444',   // Red
  entity: '#6366F1',     // Indigo
  emoji: '#FBBF24',      // Yellow
};

export const ENTITY_ICONS: Record<EntityType, string> = {
  hashtag: '📌',
  cashtag: '💵',
  mention: '👤',
  url: '🔗',
  date: '📅',
  amount: '💰',
  location: '📍',
  entity: '🏢',
  emoji: '😊',
};

export const ENTITY_LABELS: Record<EntityType, string> = {
  hashtag: 'Hashtag',
  cashtag: 'Cashtag',
  mention: 'Mención',
  url: 'Enlace',
  date: 'Fecha',
  amount: 'Monto',
  location: 'Ubicación',
  entity: 'Entidad',
  emoji: 'Emoji',
};

export const PRIORITY_ICONS: Record<EntityPriority, string> = {
  high: '🎯',    // Content (vision/transcription)
  medium: '📝',  // Context (post/description)
  low: '💬',     // Comments
};

export const PRIORITY_LABELS: Record<EntityPriority, string> = {
  high: 'Contenido',
  medium: 'Contexto',
  low: 'Comentarios',
};
