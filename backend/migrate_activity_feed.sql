-- Migration: Create activity_feed table for notifications
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    details TEXT DEFAULT '',
    icon TEXT DEFAULT 'bell',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast recent lookups
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON activity_feed (created_at DESC);

-- Optional: Auto-cleanup old notifications (keeps last 100)
-- You can set this up as a cron job in Supabase if needed:
-- DELETE FROM activity_feed WHERE id NOT IN (
--     SELECT id FROM activity_feed ORDER BY created_at DESC LIMIT 100
-- );
