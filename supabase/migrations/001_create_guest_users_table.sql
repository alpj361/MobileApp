-- Migration: Create guest_users table
-- Purpose: Track guest users for job persistence and migration
-- Date: 2025-11-08

-- Create guest_users table
CREATE TABLE IF NOT EXISTS public.guest_users (
  guest_id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_platform VARCHAR(20), -- 'web', 'ios', 'android'
  device_info JSONB, -- Optional: store user-agent, etc.
  migrated_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  migrated_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_guest_users_last_active
  ON public.guest_users(last_active_at);

CREATE INDEX IF NOT EXISTS idx_guest_users_migrated
  ON public.guest_users(migrated_to_user_id)
  WHERE migrated_to_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guest_users_created
  ON public.guest_users(created_at);

-- Enable Row Level Security
ALTER TABLE public.guest_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Guests can read their own record
CREATE POLICY "Guests can read own record"
  ON public.guest_users
  FOR SELECT
  USING (
    guest_id = current_setting('app.guest_id', true)::uuid
    OR migrated_to_user_id = auth.uid()
  );

-- Guests can insert their own record
CREATE POLICY "Guests can insert own record"
  ON public.guest_users
  FOR INSERT
  WITH CHECK (
    guest_id = current_setting('app.guest_id', true)::uuid
  );

-- Guests can update their own record
CREATE POLICY "Guests can update own record"
  ON public.guest_users
  FOR UPDATE
  USING (
    guest_id = current_setting('app.guest_id', true)::uuid
    OR migrated_to_user_id = auth.uid()
  );

-- Function to update last_active_at
CREATE OR REPLACE FUNCTION public.update_guest_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update last_active_at
CREATE TRIGGER update_guest_last_active_trigger
  BEFORE UPDATE ON public.guest_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_guest_last_active();

-- Comment on table
COMMENT ON TABLE public.guest_users IS 'Tracks guest users for job persistence before authentication';
COMMENT ON COLUMN public.guest_users.guest_id IS 'Device-generated UUID from frontend';
COMMENT ON COLUMN public.guest_users.migrated_to_user_id IS 'User ID after migration to authenticated account';
