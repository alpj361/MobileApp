-- Replace guest_posts table with simplified structure
-- This migration removes the complex job-based system and replaces it with direct post storage

-- Drop existing table and related objects
DROP TABLE IF EXISTS guest_posts CASCADE;

-- Create new simplified guest_posts table
CREATE TABLE guest_posts (
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
CREATE INDEX idx_guest_posts_guest_id ON guest_posts(guest_id);
CREATE INDEX idx_guest_posts_user_id ON guest_posts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_guest_posts_url ON guest_posts(url);
CREATE INDEX idx_guest_posts_status ON guest_posts(status);
CREATE INDEX idx_guest_posts_created_at ON guest_posts(created_at DESC);

-- RLS Policies
ALTER TABLE guest_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow guest access to own posts" ON guest_posts;
DROP POLICY IF EXISTS "Users can access own posts" ON guest_posts;

-- Guest users can access their own posts via guest_id
CREATE POLICY "Allow guest access to own posts"
ON guest_posts FOR ALL
USING (
    -- For authenticated users: check user_id
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    -- For guest users: allow all access (guest_id validation happens in app layer)
    (auth.uid() IS NULL)
);

-- Authenticated users can access their own posts
CREATE POLICY "Users can access own posts"
ON guest_posts FOR ALL
USING (auth.uid() = user_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_guest_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

CREATE OR REPLACE TRIGGER update_guest_posts_updated_at
    BEFORE UPDATE ON guest_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_guest_posts_updated_at();

-- Comment on table
COMMENT ON TABLE guest_posts IS 'Simplified post storage for guest users without complex job management';
COMMENT ON COLUMN guest_posts.guest_id IS 'Device-based guest identifier stored in AsyncStorage';
COMMENT ON COLUMN guest_posts.user_id IS 'User ID when guest migrates to authenticated user';
COMMENT ON COLUMN guest_posts.status IS 'Simple status: saved (immediate), processing (analysis), completed (done), failed (error)';
COMMENT ON COLUMN guest_posts.analysis_data IS 'Analysis results when status = completed';