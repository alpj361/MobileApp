-- Fix guest_id column type to accept string guest IDs
-- Current issue: guest_id is UUID type but app generates string IDs like "guest_1763804182792_9zcq6uq034q"

ALTER TABLE guest_posts
ALTER COLUMN guest_id TYPE TEXT;

-- Update the check constraint if it exists
ALTER TABLE guest_posts
DROP CONSTRAINT IF EXISTS guest_posts_guest_id_check;

-- Add index for performance on guest_id lookups
CREATE INDEX IF NOT EXISTS idx_guest_posts_guest_id ON guest_posts(guest_id);

-- Verify the change
\d guest_posts;