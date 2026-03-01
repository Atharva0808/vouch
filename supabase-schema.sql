-- InfluenceIQ Supabase Schema
-- Run this in your Supabase SQL Editor to set up the database structure.

-- 1. Influencers Table
CREATE TABLE IF NOT EXISTS influencers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handle TEXT NOT NULL,
    platform TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    followers BIGINT DEFAULT 0,
    following BIGINT DEFAULT 0,
    posts INTEGER DEFAULT 0,
    engagement_rate DECIMAL DEFAULT 0.0,
    avg_likes INTEGER DEFAULT 0,
    avg_comments INTEGER DEFAULT 0,
    bio TEXT,
    verified BOOLEAN DEFAULT FALSE,
    location TEXT,
    niche TEXT[],
    match_score INTEGER DEFAULT 0,
    risk_level TEXT DEFAULT 'Low', -- Low, Medium, High
    bot_percentage DECIMAL DEFAULT 0,
    brand_safety_score INTEGER DEFAULT 0,
    predicted_roi DECIMAL DEFAULT 0.0,
    recommendation TEXT,
    recent_posts JSONB DEFAULT '[]'::jsonb,
    external_url TEXT,
    last_analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(handle, platform)
);

-- 2. Engagement Data (Timeline)
CREATE TABLE IF NOT EXISTS engagement_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    influencer_id UUID REFERENCES influencers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    followers BIGINT,
    likes INTEGER,
    comments INTEGER,
    shares INTEGER,
    organic BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(influencer_id, date)
);

-- 3. Sentiment Analysis
CREATE TABLE IF NOT EXISTS sentiment_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    influencer_id UUID REFERENCES influencers(id) ON DELETE CASCADE UNIQUE,
    positive_pct DECIMAL DEFAULT 0, -- Legacy field (kept for compat)
    neutral_pct DECIMAL DEFAULT 0,  -- Legacy field
    negative_pct DECIMAL DEFAULT 0, -- Legacy field
    positive DECIMAL DEFAULT 0,
    neutral DECIMAL DEFAULT 0,
    negative DECIMAL DEFAULT 0,
    brand_safety_score INTEGER DEFAULT 0,
    raw_comments_analyzed INTEGER DEFAULT 0,
    red_flags TEXT[] DEFAULT '{}',
    themes JSONB DEFAULT '[]'::jsonb,
    common_themes TEXT[],
    top_keywords JSONB,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Risk Flags
CREATE TABLE IF NOT EXISTS risk_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    influencer_id UUID REFERENCES influencers(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'audience_authenticity', 'engagement_quality', 'content_safety', etc.
    severity TEXT NOT NULL, -- 'Low', 'Medium', 'High', 'Critical'
    description TEXT,
    source TEXT DEFAULT 'ai_inference', -- 'verified_metric' or 'ai_inference'
    evidence TEXT, -- the specific data point the flag is based on
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Reports
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- In a real app, this would link to auth.users
    name TEXT NOT NULL,
    influencer_id UUID REFERENCES influencers(id) ON DELETE SET NULL,
    report_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. User Profiles (SaaS tiers & limits)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY, -- Matches auth.users.id
    email TEXT,
    full_name TEXT,
    tier TEXT DEFAULT 'free', -- free, pro, agency
    searches_used INTEGER DEFAULT 0,
    searches_limit INTEGER DEFAULT 3,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Activity Feed   
CREATE TABLE IF NOT EXISTS activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Profile Creation Trigger
-- This automatically creates a record in user_profiles when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, tier)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'free');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 8. Activity Feed / Notifications
CREATE TABLE IF NOT EXISTS activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,          -- short title e.g. "Influencer Fetched"
    details TEXT DEFAULT '',       -- descriptive text e.g. "Added @menofculture from YouTube with 397K followers"
    icon TEXT DEFAULT 'bell',      -- icon hint for frontend: 'user-plus', 'alert', 'report', 'trash', 'refresh', 'bell'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- RLS (Row Level Security) - Basic setup (Enable and add policies as needed)
ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read for influencers (optional, depending on your app design)
DROP POLICY IF EXISTS "Allow public read for influencers" ON influencers;
CREATE POLICY "Allow public read for influencers" ON influencers FOR SELECT USING (true);

-- User-specific policies for reports
DROP POLICY IF EXISTS "Users can only see their own reports" ON reports;
CREATE POLICY "Users can only see their own reports" ON reports 
    FOR SELECT USING (auth.uid() = user_id);

-- User-specific policies for user_profiles
DROP POLICY IF EXISTS "Users can only see their own profile" ON user_profiles;
CREATE POLICY "Users can only see their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);
