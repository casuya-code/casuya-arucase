-- Normalize Comments Streams: Update stream='NA' to stream='A'
-- Run this SQL script directly in your PostgreSQL database

-- Step 1: Check how many comments have stream='NA'
SELECT COUNT(*) as na_count 
FROM comments 
WHERE stream = 'NA';

-- Step 2: Check for potential conflicts (where both NA and A versions exist)
SELECT 
  c1.comment_type,
  c1.level,
  c1.year,
  c1.term,
  c1.student_index,
  COUNT(*) as conflict_count
FROM comments c1
WHERE c1.stream = 'NA'
  AND EXISTS (
    SELECT 1 
    FROM comments c2 
    WHERE c2.comment_type = c1.comment_type
      AND c2.level = c1.level
      AND c2.stream = 'A'
      AND c2.year = c1.year
      AND c2.term = c1.term
      AND c2.student_index = c1.student_index
  )
GROUP BY c1.comment_type, c1.level, c1.year, c1.term, c1.student_index;

-- Step 3: Delete conflicting NA entries (keep A versions)
DELETE FROM comments
WHERE stream = 'NA'
  AND (comment_type, level, year, term, student_index) IN (
    SELECT comment_type, level, year, term, student_index
    FROM comments
    WHERE stream = 'A'
  );

-- Step 4: Update remaining NA entries to A
UPDATE comments
SET stream = 'A'
WHERE stream = 'NA';

-- Step 5: Verify the update
SELECT 
  stream,
  COUNT(*) as count
FROM comments
GROUP BY stream
ORDER BY stream;

-- Step 6: Breakdown by comment type (stream=A)
SELECT 
  comment_type,
  COUNT(*) as count
FROM comments
WHERE stream = 'A'
GROUP BY comment_type
ORDER BY comment_type;

-- Step 7: Breakdown by level (stream=A)
SELECT 
  level,
  COUNT(*) as count
FROM comments
WHERE stream = 'A'
GROUP BY level
ORDER BY 
  CASE level
    WHEN 'FORM I' THEN 1
    WHEN 'FORM II' THEN 2
    WHEN 'FORM III' THEN 3
    WHEN 'FORM IV' THEN 4
    WHEN 'FORM V' THEN 5
    WHEN 'FORM VI' THEN 6
    ELSE 7
  END;
