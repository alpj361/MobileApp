/**
 * Tipos para la nueva estructura de Codex con categorización
 */

export type CodexCategory = 'general' | 'monitoring' | 'wiki';

export type GeneralSubcategory = 'document' | 'audio' | 'video' | 'external_spreadsheet';
export type MonitoringSubcategory = 'activity' | 'post' | 'internal_spreadsheet';
export type WikiSubcategory = 'person' | 'entity' | 'organization' | 'event' | 'concept';

export type CodexSubcategory = GeneralSubcategory | MonitoringSubcategory | WikiSubcategory;

export interface CodexItemMetadata {
  // Campos comunes
  source_type?: string;
  platform?: string;
  author?: string;
  created_at?: string;
  updated_at?: string;
  
  // Metadata específica por subcategoría
  // Para documentos
  document_type?: 'pdf' | 'doc' | 'txt' | 'other';
  file_size?: number;
  pages?: number;
  
  // Para audios
  duration?: number;
  audio_format?: 'mp3' | 'wav' | 'm4a' | 'other';
  transcription?: string;
  
  // Para videos
  video_duration?: number;
  video_format?: 'mp4' | 'avi' | 'mov' | 'other';
  resolution?: string;
  
  // Para spreadsheets
  spreadsheet_type?: 'excel' | 'google_sheets' | 'csv' | 'other';
  rows?: number;
  columns?: number;
  
  // Para posts de redes sociales
  post_id?: string;
  engagement_metrics?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
  
  // Para Wiki - personas
  person_role?: string;
  person_organization?: string;
  person_bio?: string;
  
  // Para Wiki - entidades
  entity_type?: 'company' | 'government' | 'ngo' | 'other';
  entity_website?: string;
  entity_location?: string;
  
  // Para Wiki - eventos
  event_date?: string;
  event_location?: string;
  event_type?: 'conference' | 'meeting' | 'protest' | 'other';
  
  // Para Wiki - conceptos
  concept_definition?: string;
  concept_related_terms?: string[];
  concept_category?: string;
}

export interface CodexSaveRequest {
  user_id: string;
  item_data: {
    url: string;
    title: string;
    description: string;
    category: CodexCategory;
    subcategory: CodexSubcategory;
    metadata: CodexItemMetadata;
    // Campos adicionales del item original
    platform?: string;
    image?: string;
    author?: string;
    domain?: string;
    type?: string;
    timestamp?: number;
    engagement?: {
      likes?: number;
      comments?: number;
      shares?: number;
      views?: number;
    };
  };
}

export interface CodexSaveResult {
  success: boolean;
  id?: string;
  error?: string;
}

// Mapeo de tipos de contenido a categorías y subcategorías
export const CONTENT_TYPE_MAPPING: Record<string, { category: CodexCategory; subcategory: CodexSubcategory }> = {
  // Archivos Generales
  'document': { category: 'general', subcategory: 'document' },
  'pdf': { category: 'general', subcategory: 'document' },
  'audio': { category: 'general', subcategory: 'audio' },
  'video': { category: 'general', subcategory: 'video' },
  'spreadsheet': { category: 'general', subcategory: 'external_spreadsheet' },
  
  // Monitoreos
  'tweet': { category: 'monitoring', subcategory: 'post' },
  'instagram': { category: 'monitoring', subcategory: 'post' },
  'social_post': { category: 'monitoring', subcategory: 'post' },
  'activity': { category: 'monitoring', subcategory: 'activity' },
  'internal_spreadsheet': { category: 'monitoring', subcategory: 'internal_spreadsheet' },
  
  // Wiki (se detecta por contenido o selección manual)
  'person': { category: 'wiki', subcategory: 'person' },
  'entity': { category: 'wiki', subcategory: 'entity' },
  'organization': { category: 'wiki', subcategory: 'organization' },
  'event': { category: 'wiki', subcategory: 'event' },
  'concept': { category: 'wiki', subcategory: 'concept' },
};

// Función para detectar automáticamente la categoría basada en el tipo de contenido
export function detectCodexCategory(item: any): { category: CodexCategory; subcategory: CodexSubcategory } {
  // Si ya tiene categoría asignada, usarla
  if (item.codex_category && item.codex_subcategory) {
    return { category: item.codex_category, subcategory: item.codex_subcategory };
  }
  
  // Detectar por tipo de contenido
  const type = item.type?.toLowerCase() || '';
  const platform = item.platform?.toLowerCase() || '';
  const domain = item.domain?.toLowerCase() || '';
  const url = item.url?.toLowerCase() || '';
  
  // 🎯 PRIORIDAD 1: Posts de redes sociales (bookmarks de MobileApp)
  // Detectar por plataforma
  if (platform === 'instagram' || platform === 'twitter' || platform === 'x') {
    return { category: 'monitoring', subcategory: 'post' };
  }
  
  // Detectar por URL (casos donde platform no esté definido)
  if (url.includes('instagram.com') || url.includes('instagr.am')) {
    return { category: 'monitoring', subcategory: 'post' };
  }
  
  if (url.includes('twitter.com') || url.includes('x.com')) {
    return { category: 'monitoring', subcategory: 'post' };
  }
  
  if (url.includes('tiktok.com')) {
    return { category: 'monitoring', subcategory: 'post' };
  }
  
  // 🎯 PRIORIDAD 2: Mapeo por tipo específico
  if (CONTENT_TYPE_MAPPING[type]) {
    return CONTENT_TYPE_MAPPING[type];
  }
  
  // 🎯 PRIORIDAD 3: Detectar por dominio
  if (domain.includes('youtube') || domain.includes('youtu.be') || domain.includes('vimeo')) {
    return { category: 'general', subcategory: 'video' };
  }
  
  if (domain.includes('soundcloud') || domain.includes('spotify')) {
    return { category: 'general', subcategory: 'audio' };
  }
  
  if (domain.includes('docs.google') || domain.includes('sheets.google') || domain.includes('excel') || domain.includes('spreadsheet')) {
    return { category: 'general', subcategory: 'external_spreadsheet' };
  }
  
  // 🎯 PRIORIDAD 4: Audio recordings (detectar por platform = 'audio')
  if (platform === 'audio' || type === 'audio') {
    return { category: 'general', subcategory: 'audio' };
  }
  
  // Por defecto, post de monitoreo (ya que la mayoría de bookmarks son posts)
  return { category: 'monitoring', subcategory: 'post' };
}
