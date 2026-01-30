-- Script to reset all comments and like counts
-- WARNING: This will permanently delete all data. Use with caution!

-- 1. Delete all comments
DELETE FROM comments;

-- 2. Reset like_count for all users to 0
UPDATE users SET like_count = 0;

-- Verify the reset
SELECT 'Comments deleted:', COUNT(*) FROM comments;
SELECT 'Users with like_count > 0:', COUNT(*) FROM users WHERE like_count > 0;
