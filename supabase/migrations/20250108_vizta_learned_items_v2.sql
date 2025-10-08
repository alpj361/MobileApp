-- ============================================================================
-- VIZTA V4.3: Enhanced Learning System
-- Migration: Rebuild vizta_learned_items table with enhanced schema
-- Date: 2025-01-08
-- ============================================================================

-- Drop existing table if exists
DROP TABLE IF EXISTS vizta_learned_items CASCADE;

-- Create enhanced vizta_learned_items table
CREATE TABLE vizta_learned_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Knowledge Classification
  knowledge_type TEXT NOT NULL CHECK (knowledge_type IN (
    'concept_definition',     -- Término/concepto que Vizta aprendió
    'political_context',      -- Contexto político (partidos, candidatos, políticas)
    'social_context',         -- Contexto social (movimientos, tendencias sociales)
    'economic_context',       -- Contexto económico (indicadores, empresas, mercados)
    'cultural_context',       -- Contexto cultural (eventos, personalidades)
    'technical_term',         -- Términos técnicos específicos de industria
    'news_archive',           -- Noticias archivadas para contexto histórico
    'trend_snapshot',         -- Snapshot de tendencias en momento específico
    'user_research'           -- Investigaciones guardadas del usuario
  )),

  -- Core Content
  term TEXT NOT NULL,                    -- Término principal (ej: "Reforma Fiscal 2024")
  definition TEXT,                       -- Definición aprendida
  context TEXT,                          -- Contexto adicional
  summary TEXT,                          -- Resumen corto

  -- Metadata
  source_type TEXT CHECK (source_type IN (
    'perplexity_search',
    'latest_trends',
    'rss_feed',
    'user_query',
    'web_scrape',
    'twitter_analysis'
  )),
  source_url TEXT,
  source_title TEXT,

  -- Learning Metrics
  relevance_score NUMERIC DEFAULT 0.5 CHECK (relevance_score >= 0 AND relevance_score <= 1),
  confidence_level TEXT DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
  times_referenced INT DEFAULT 0,
  last_referenced_at TIMESTAMPTZ,

  -- Temporal Context
  temporal_relevance TEXT DEFAULT 'evergreen' CHECK (temporal_relevance IN (
    'breaking',        -- Información reciente (<24h)
    'recent',          -- Información actual (<7d)
    'current',         -- Información vigente (<30d)
    'historical',      -- Información de contexto histórico
    'evergreen'        -- Información atemporal
  )),
  event_date DATE,

  -- Relationships
  related_terms TEXT[],
  tags TEXT[],

  -- Auto-curation
  auto_learned BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_learned_items_user ON vizta_learned_items(user_id);
CREATE INDEX idx_learned_items_type ON vizta_learned_items(knowledge_type);
CREATE INDEX idx_learned_items_term ON vizta_learned_items(term);
CREATE INDEX idx_learned_items_temporal ON vizta_learned_items(temporal_relevance);
CREATE INDEX idx_learned_items_referenced ON vizta_learned_items(last_referenced_at);
CREATE INDEX idx_learned_items_tags ON vizta_learned_items USING gin(tags);
CREATE INDEX idx_learned_items_related ON vizta_learned_items USING gin(related_terms);
CREATE INDEX idx_learned_items_relevance ON vizta_learned_items(relevance_score DESC);

-- Full-text search index
CREATE INDEX idx_learned_items_search ON vizta_learned_items
  USING gin(to_tsvector('english', coalesce(term, '') || ' ' || coalesce(definition, '') || ' ' || coalesce(context, '') || ' ' || coalesce(summary, '')));

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE vizta_learned_items ENABLE ROW LEVEL SECURITY;

-- Users can view own learned items
CREATE POLICY "Users can view own learned items"
  ON vizta_learned_items FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert own learned items
CREATE POLICY "Users can insert own learned items"
  ON vizta_learned_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update own learned items
CREATE POLICY "Users can update own learned items"
  ON vizta_learned_items FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete own learned items
CREATE POLICY "Users can delete own learned items"
  ON vizta_learned_items FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Function: Increment usage counter for learned items
CREATE OR REPLACE FUNCTION increment_learned_item_usage(
  p_user_id UUID,
  p_term TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE vizta_learned_items
  SET
    times_referenced = times_referenced + 1,
    last_referenced_at = now()
  WHERE
    user_id = p_user_id
    AND term ILIKE p_term;
END;
$$;

-- Function: Get learned items with full-text search
CREATE OR REPLACE FUNCTION search_learned_items(
  p_user_id UUID,
  p_query TEXT,
  p_knowledge_types TEXT[] DEFAULT NULL,
  p_temporal_filter TEXT DEFAULT NULL,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  term TEXT,
  definition TEXT,
  context TEXT,
  summary TEXT,
  knowledge_type TEXT,
  source_type TEXT,
  source_url TEXT,
  relevance_score NUMERIC,
  confidence_level TEXT,
  times_referenced INT,
  temporal_relevance TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    li.id,
    li.term,
    li.definition,
    li.context,
    li.summary,
    li.knowledge_type,
    li.source_type,
    li.source_url,
    li.relevance_score,
    li.confidence_level,
    li.times_referenced,
    li.temporal_relevance,
    li.tags,
    li.created_at,
    ts_rank(
      to_tsvector('english', coalesce(li.term, '') || ' ' || coalesce(li.definition, '') || ' ' || coalesce(li.context, '') || ' ' || coalesce(li.summary, '')),
      plainto_tsquery('english', p_query)
    ) as rank
  FROM vizta_learned_items li
  WHERE
    li.user_id = p_user_id
    AND (
      p_query IS NULL
      OR to_tsvector('english', coalesce(li.term, '') || ' ' || coalesce(li.definition, '') || ' ' || coalesce(li.context, '') || ' ' || coalesce(li.summary, ''))
      @@ plainto_tsquery('english', p_query)
    )
    AND (p_knowledge_types IS NULL OR li.knowledge_type = ANY(p_knowledge_types))
    AND (p_temporal_filter IS NULL OR li.temporal_relevance = p_temporal_filter)
  ORDER BY
    rank DESC,
    li.relevance_score DESC,
    li.times_referenced DESC,
    li.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function: Clean up old learned items (temporal decay)
CREATE OR REPLACE FUNCTION cleanup_old_learned_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete breaking items older than 7 days with low usage
  DELETE FROM vizta_learned_items
  WHERE
    temporal_relevance = 'breaking'
    AND created_at < now() - INTERVAL '7 days'
    AND times_referenced < 2;

  -- Delete recent items older than 30 days with low usage
  DELETE FROM vizta_learned_items
  WHERE
    temporal_relevance = 'recent'
    AND created_at < now() - INTERVAL '30 days'
    AND times_referenced < 3;

  -- Delete current items older than 90 days with low usage
  DELETE FROM vizta_learned_items
  WHERE
    temporal_relevance = 'current'
    AND created_at < now() - INTERVAL '90 days'
    AND times_referenced < 5;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Update updated_at on changes
CREATE OR REPLACE FUNCTION update_vizta_learned_items_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_vizta_learned_items_updated_at
  BEFORE UPDATE ON vizta_learned_items
  FOR EACH ROW
  EXECUTE FUNCTION update_vizta_learned_items_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE vizta_learned_items IS 'Vizta active learning knowledge base - stores auto-learned concepts, context, and intelligence';
COMMENT ON COLUMN vizta_learned_items.knowledge_type IS 'Type of knowledge: concept, political, social, economic, cultural, technical, news, trend, research';
COMMENT ON COLUMN vizta_learned_items.temporal_relevance IS 'Temporal context: breaking (<24h), recent (<7d), current (<30d), historical, evergreen';
COMMENT ON COLUMN vizta_learned_items.relevance_score IS 'Relevance score 0-1, updated based on usage and trend data';
COMMENT ON COLUMN vizta_learned_items.auto_learned IS 'True if learned automatically by Vizta (vs. manually added by user)';
COMMENT ON COLUMN vizta_learned_items.verified IS 'True if user has verified/confirmed the learned information';

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Sample learned items (will only insert if user exists)
-- Uncomment and modify user_id for testing
/*
INSERT INTO vizta_learned_items (user_id, knowledge_type, term, definition, context, source_type, temporal_relevance, tags, auto_learned) VALUES
  ('YOUR_USER_ID_HERE', 'political_context', 'Reforma Fiscal 2024', 'Propuesta legislativa para modificar el sistema tributario', 'Debate en congreso iniciado en enero 2024', 'perplexity_search', 'current', ARRAY['política', 'economía', 'legislación'], true),
  ('YOUR_USER_ID_HERE', 'social_context', 'Huelga de Maestros', 'Protesta nacional del sector educativo', 'Iniciada el 15 de enero por demandas salariales', 'latest_trends', 'breaking', ARRAY['educación', 'protesta', 'social'], true),
  ('YOUR_USER_ID_HERE', 'technical_term', 'RAG (Retrieval Augmented Generation)', 'Técnica de IA que combina búsqueda con generación de texto', 'Usado en sistemas de LLMs modernos para mejorar respuestas', 'user_research', 'evergreen', ARRAY['AI', 'técnico', 'LLM'], false);
*/
