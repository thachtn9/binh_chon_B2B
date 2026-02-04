-- Migration: Add url_profile column to users table
-- Ảnh profile lớn dùng cho slideshow (khác với url_avatar nhỏ dùng cho avatar)
ALTER TABLE users ADD COLUMN IF NOT EXISTS url_profile TEXT;
COMMENT ON COLUMN users.url_profile IS 'URL for large profile PNG image used in slideshow';
