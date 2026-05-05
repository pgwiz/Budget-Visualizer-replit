-- Migration: Add max_depth_visible column to sectors table
-- This controls how many levels deep a user assigned to this sector can see by default

ALTER TABLE sectors ADD COLUMN IF NOT EXISTS max_depth_visible INTEGER NOT NULL DEFAULT 1;

-- Set root sectors (national level) to see 2 levels deep by default
UPDATE sectors SET max_depth_visible = 2 WHERE depth = 0;
