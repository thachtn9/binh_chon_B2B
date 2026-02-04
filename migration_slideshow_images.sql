-- Migration: Create slideshow_images table
-- Bảng lưu ảnh bổ sung cho slideshow, hiển thị sau khi hết danh sách profiles
-- Ảnh nào add trước thì hiển thị trước (theo created_at)

CREATE TABLE IF NOT EXISTS slideshow_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_slideshow_images_created ON slideshow_images(created_at);

COMMENT ON TABLE slideshow_images IS 'Ảnh bổ sung cho slideshow, hiển thị sau phần profiles';
COMMENT ON COLUMN slideshow_images.image_url IS 'URL ảnh (hosted trên ImgBB)';
