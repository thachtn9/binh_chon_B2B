-- Migration: Create comments_public view
-- Purpose: Automatically hide commenter info when is_anonymous = true
-- This ensures sensitive data never leaves the database for anonymous comments

-- Drop existing view if exists
DROP VIEW IF EXISTS comments_public;

-- Create view to mask anonymous commenter information
-- Include user profile info directly in the view (join with users table)
CREATE OR REPLACE VIEW comments_public AS
SELECT 
  c.id,
  c.nominee_id,
  c.content,
  c.created_at,
  c.is_visible,
  c.is_anonymous,
  c.like_count,
  -- Hide commenter info when anonymous
  CASE WHEN c.is_anonymous = true THEN NULL ELSE c.commenter_id END as commenter_id,
  CASE WHEN c.is_anonymous = true THEN NULL ELSE c.commenter_name END as commenter_name,
  CASE WHEN c.is_anonymous = true THEN NULL ELSE c.commenter_avatar END as commenter_avatar,
  -- Include user profile info (hidden when anonymous)
  CASE WHEN c.is_anonymous = true THEN NULL ELSE u.user_name END as commenter_user_name,
  CASE WHEN c.is_anonymous = true THEN NULL ELSE u.full_name END as commenter_full_name,
  CASE WHEN c.is_anonymous = true THEN NULL ELSE u.url_avatar END as commenter_url_avatar,
  CASE WHEN c.is_anonymous = true THEN NULL ELSE u.role END as commenter_role
FROM comments c
LEFT JOIN users u ON c.commenter_id = u.id;

-- Grant access to the view (adjust role names as needed for your Supabase setup)
GRANT SELECT ON comments_public TO anon;
GRANT SELECT ON comments_public TO authenticated;

-- Add comment to describe the view
COMMENT ON VIEW comments_public IS 'Public view of comments that hides commenter identity for anonymous comments';
