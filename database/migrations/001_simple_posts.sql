-- Simple Posts Table for Guest Post Persistence
-- Replaces complex job-based system with direct post storage

CREATE TABLE IF NOT EXISTS simple_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    item_data JSONB NOT NULL,
    status TEXT DEFAULT 'saved' CHECK (status IN ('saved', 'processing', 'completed', 'failed')),
    analysis_data JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_guest_url UNIQUE(guest_id, url),
    CONSTRAINT unique_user_url UNIQUE(user_id, url) DEFERRABLE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_simple_posts_guest_id ON simple_posts(guest_id);
CREATE INDEX IF NOT EXISTS idx_simple_posts_user_id ON simple_posts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_simple_posts_url ON simple_posts(url);
CREATE INDEX IF NOT EXISTS idx_simple_posts_status ON simple_posts(status);
CREATE INDEX IF NOT EXISTS idx_simple_posts_created_at ON simple_posts(created_at DESC);

-- RLS Policies
ALTER TABLE simple_posts ENABLE ROW LEVEL SECURITY;

-- Guest users can access their own posts via guest_id
CREATE POLICY "Allow guest access to own posts"
ON simple_posts FOR ALL
USING (
    -- For authenticated users: check user_id
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    -- For guest users: allow all access (guest_id validation happens in app layer)
    (auth.uid() IS NULL)
);

-- Authenticated users can access their own posts
CREATE POLICY "Users can access own posts"
ON simple_posts FOR ALL
USING (auth.uid() = user_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_simple_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

CREATE OR REPLACE TRIGGER update_simple_posts_updated_at
    BEFORE UPDATE ON simple_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_simple_posts_updated_at();

-- Comment on table
COMMENT ON TABLE simple_posts IS 'Simplified post storage for guest users without complex job management';
COMMENT ON COLUMN simple_posts.guest_id IS 'Device-based guest identifier stored in AsyncStorage';
COMMENT ON COLUMN simple_posts.user_id IS 'User ID when guest migrates to authenticated user';
COMMENT ON COLUMN simple_posts.status IS 'Simple status: saved (immediate), processing (analysis), completed (done), failed (error)';
COMMENT ON COLUMN simple_posts.analysis_data IS 'Analysis results when status = completed';