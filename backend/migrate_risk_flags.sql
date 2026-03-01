-- Migration: Add source and evidence columns to risk_flags table
-- Run this in your Supabase SQL Editor

-- Add 'source' column: whether the flag is based on a verified metric or AI inference
ALTER TABLE risk_flags ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ai_inference';

-- Add 'evidence' column: the specific data point the flag references
ALTER TABLE risk_flags ADD COLUMN IF NOT EXISTS evidence TEXT;

-- Update existing flags to mark them as legacy (ai_inference since they used synthetic data)
UPDATE risk_flags SET source = 'ai_inference' WHERE source IS NULL;
