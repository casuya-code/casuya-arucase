-- Check all database information for Taaluma Comments page
-- Form VI, Stream PCM, Year 2025, Term I
-- Run this SQL script directly in your PostgreSQL database

-- ============================================================================
-- 1. STUDENTS
-- ============================================================================
SELECT 
  adm_no,
  first_name,
  middle_name,
  surname,
  student_index,
  stream,
  level,
  year
FROM students 
WHERE level = 'FORM VI' 
  AND stream IN ('PCM', 'NA')
  AND year = 2025
ORDER BY CAST(student_index AS INTEGER);

-- Count students
SELECT COUNT(*) as total_students
FROM students 
WHERE level = 'FORM VI' 
  AND stream IN ('PCM', 'NA')
  AND year = 2025;

-- ============================================================================
-- 2. TAALUMA COMMENTS
-- ============================================================================
SELECT 
  id,
  comment_type,
  level,
  stream,
  year,
  term,
  student_index,
  comment_text,
  created_at,
  updated_at
FROM comments 
WHERE comment_type = 'taaluma' 
  AND level = 'FORM VI' 
  AND stream IN ('PCM', 'NA')
  AND year = 2025 
  AND term = 'Term I'
ORDER BY CAST(student_index AS INTEGER);

-- Count comments
SELECT COUNT(*) as total_comments
FROM comments 
WHERE comment_type = 'taaluma' 
  AND level = 'FORM VI' 
  AND stream IN ('PCM', 'NA')
  AND year = 2025 
  AND term = 'Term I';

-- ============================================================================
-- 3. SUMMARY STATISTICS
-- ============================================================================
-- Students with comments
SELECT 
  COUNT(DISTINCT student_index) as students_with_comments,
  COUNT(*) as total_comments
FROM comments 
WHERE comment_type = 'taaluma' 
  AND level = 'FORM VI' 
  AND stream IN ('PCM', 'NA')
  AND year = 2025 
  AND term = 'Term I';

-- Comments with text vs empty
SELECT 
  CASE 
    WHEN comment_text IS NULL OR comment_text = '' THEN 'Empty'
    ELSE 'Has Text'
  END as comment_status,
  COUNT(*) as count
FROM comments 
WHERE comment_type = 'taaluma' 
  AND level = 'FORM VI' 
  AND stream IN ('PCM', 'NA')
  AND year = 2025 
  AND term = 'Term I'
GROUP BY comment_status;

-- ============================================================================
-- 4. COMPLETE GRID (Students × Comments)
-- ============================================================================
SELECT 
  s.student_index,
  s.adm_no,
  s.first_name,
  s.middle_name,
  s.surname,
  COALESCE(c.comment_text, 'N/A') as comment_text,
  c.stream as comment_stream,
  c.created_at,
  c.updated_at
FROM students s
LEFT JOIN comments c ON 
  c.student_index = s.student_index 
  AND c.comment_type = 'taaluma'
  AND c.level = 'FORM VI'
  AND c.stream IN ('PCM', 'NA')
  AND c.year = 2025
  AND c.term = 'Term I'
WHERE s.level = 'FORM VI' 
  AND s.stream IN ('PCM', 'NA')
  AND s.year = 2025
ORDER BY CAST(s.student_index AS INTEGER);

-- ============================================================================
-- 5. MISSING COMMENTS
-- ============================================================================
-- Find students without comments
SELECT 
  s.student_index,
  s.adm_no,
  s.first_name || ' ' || COALESCE(s.middle_name || ' ', '') || s.surname as student_name
FROM students s
LEFT JOIN comments c ON 
  c.student_index = s.student_index 
  AND c.comment_type = 'taaluma'
  AND c.level = 'FORM VI'
  AND c.stream IN ('PCM', 'NA')
  AND c.year = 2025
  AND c.term = 'Term I'
WHERE s.level = 'FORM VI' 
  AND s.stream IN ('PCM', 'NA')
  AND s.year = 2025
  AND c.id IS NULL
ORDER BY CAST(s.student_index AS INTEGER);

-- ============================================================================
-- 6. ALL COMMENT TYPES FOR THIS CLASS
-- ============================================================================
SELECT 
  comment_type,
  COUNT(*) as count,
  COUNT(CASE WHEN comment_text IS NOT NULL AND comment_text != '' THEN 1 END) as non_empty_count
FROM comments 
WHERE level = 'FORM VI' 
  AND stream IN ('PCM', 'NA')
  AND year = 2025 
  AND term = 'Term I'
GROUP BY comment_type
ORDER BY comment_type;

-- ============================================================================
-- 7. STREAM NORMALIZATION CHECK
-- ============================================================================
-- Check students by stream
SELECT stream, COUNT(*) as count
FROM students
WHERE level = 'FORM VI' AND year = 2025
GROUP BY stream
ORDER BY stream;

-- Check comments by stream
SELECT stream, COUNT(*) as count
FROM comments
WHERE comment_type = 'taaluma' AND level = 'FORM VI' AND year = 2025 AND term = 'Term I'
GROUP BY stream
ORDER BY stream;
