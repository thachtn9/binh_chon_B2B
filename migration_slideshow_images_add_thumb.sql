-- Add thumbnail URL for slideshow images
ALTER TABLE slideshow_images
ADD COLUMN IF NOT EXISTS thumb_url TEXT;
