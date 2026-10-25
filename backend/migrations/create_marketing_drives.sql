-- ====================================================================
-- Marketing Drives & Drive Applications Tables
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ====================================================================

-- Marketing Drives — Brands post campaign opportunities here (like Upwork JD)
CREATE TABLE IF NOT EXISTS marketing_drives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    brand_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'general',
    location_area TEXT DEFAULT '',
    city TEXT DEFAULT '',
    platform_preference TEXT DEFAULT 'any',
    target_audience JSONB DEFAULT '[]'::jsonb,
    min_followers INT DEFAULT 0,
    min_engagement_rate FLOAT DEFAULT 0.0,
    niche_required TEXT[] DEFAULT '{}',
    deliverables TEXT DEFAULT '',
    compensation TEXT DEFAULT '',
    budget FLOAT DEFAULT 0.0,
    collab_type TEXT DEFAULT 'both',
    status TEXT DEFAULT 'active',
    deadline TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    max_applications INT DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drive Applications — Creators apply to drives here
CREATE TABLE IF NOT EXISTS drive_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id UUID NOT NULL REFERENCES marketing_drives(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    creator_name TEXT DEFAULT '',
    creator_handle TEXT DEFAULT '',
    creator_platform TEXT DEFAULT 'instagram',
    creator_followers INT DEFAULT 0,
    creator_engagement_rate FLOAT DEFAULT 0.0,
    creator_location TEXT DEFAULT '',
    pitch TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_drives_user_id ON marketing_drives(user_id);
CREATE INDEX IF NOT EXISTS idx_drives_status ON marketing_drives(status);
CREATE INDEX IF NOT EXISTS idx_drives_city ON marketing_drives(city);
CREATE INDEX IF NOT EXISTS idx_drives_category ON marketing_drives(category);
CREATE INDEX IF NOT EXISTS idx_applications_drive_id ON drive_applications(drive_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON drive_applications(user_id);

-- RLS Policies (permissive for now — production would be stricter)
ALTER TABLE marketing_drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_applications ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on drives" ON marketing_drives FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on applications" ON drive_applications FOR ALL USING (true) WITH CHECK (true);
