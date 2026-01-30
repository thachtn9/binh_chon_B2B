-- =============================================
-- Migration: Add like_count column to users table
-- Run this SQL in your Supabase SQL Editor
-- =============================================

-- Add like_count column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS like_count INT DEFAULT 0;

-- Create function to increment like count
CREATE OR REPLACE FUNCTION increment_like_count(user_id UUID)
RETURNS INT AS $$
DECLARE
  new_count INT;
BEGIN
  UPDATE users 
  SET like_count = COALESCE(like_count, 0) + 1
  WHERE id = user_id
  RETURNING like_count INTO new_count;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION increment_like_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_like_count(UUID) TO anon;
