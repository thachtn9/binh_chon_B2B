-- Migration: Add predicted_count column to votes table
-- Run this SQL in your Supabase SQL Editor if you already have the votes table

-- Add predicted_count column to existing votes table
ALTER TABLE votes 
ADD COLUMN IF NOT EXISTS predicted_count INT DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN votes.predicted_count IS 'Số người dự đoán giống (user dự đoán sẽ có bao nhiêu người chọn giống mình)';
