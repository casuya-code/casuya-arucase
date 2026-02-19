-- SQL script to delete all gallery photos from database
-- Run this in your PostgreSQL client or via psql

DELETE FROM gallery_photos;

-- Verify deletion
SELECT COUNT(*) as remaining_photos FROM gallery_photos;

