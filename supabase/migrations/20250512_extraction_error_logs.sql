-- Migration: Extraction Error Logs Table
-- Stores failed extraction attempts for debugging and review
-- Created: 2025-05-12

CREATE TABLE IF NOT EXISTS public.extraction_error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Error identification
  error_type TEXT NOT NULL, -- 'json_parse_error', 'api_error', 'timeout', 'entity_extraction_failed', etc.
  error_message TEXT,
  error_stack TEXT,

  -- Extraction context
  platform TEXT NOT NULL, -- 'x', 'instagram', 'tiktok', etc.
  post_url TEXT NOT NULL,
  extraction_step TEXT, -- 'entity_extraction', 'transcription', 'vision_analysis', etc.

  -- Request data
  request_payload JSONB, -- Original request that caused the error
  grok_response_raw TEXT, -- Raw response from Grok (for JSON errors)
  grok_response_truncated BOOLEAN DEFAULT false,

  -- Processing metadata
  processing_duration_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  user_email TEXT,

  -- Categorization
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('pending', 'investigating', 'resolved', 'wont_fix')) DEFAULT 'pending',

  -- Resolution tracking
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_notes TEXT,

  -- Full context snapshot
  full_logs JSONB, -- Complete logs from the failed extraction

  -- Indexes for querying
  CONSTRAINT valid_platform CHECK (platform IN ('x', 'instagram', 'tiktok', 'youtube', 'facebook', 'other'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_extraction_errors_created_at ON public.extraction_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extraction_errors_platform ON public.extraction_error_logs(platform);
CREATE INDEX IF NOT EXISTS idx_extraction_errors_error_type ON public.extraction_error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_extraction_errors_status ON public.extraction_error_logs(status);
CREATE INDEX IF NOT EXISTS idx_extraction_errors_severity ON public.extraction_error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_extraction_errors_post_url ON public.extraction_error_logs(post_url);

-- RLS Policies
ALTER TABLE public.extraction_error_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own error reports
CREATE POLICY "Users can insert their own extraction errors"
  ON public.extraction_error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt()->>'email' = user_email
  );

-- Allow users to view their own error logs
CREATE POLICY "Users can view their own extraction errors"
  ON public.extraction_error_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt()->>'email' = user_email
  );

-- Allow service role full access (for automated error logging)
CREATE POLICY "Service role has full access to extraction errors"
  ON public.extraction_error_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON public.extraction_error_logs TO authenticated;
GRANT ALL ON public.extraction_error_logs TO service_role;

-- Comment on table
COMMENT ON TABLE public.extraction_error_logs IS 'Stores failed extraction attempts for debugging and improvement of extraction services';
