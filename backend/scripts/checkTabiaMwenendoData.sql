-- Check all database information for Tabia & Mwenendo page
-- Form VI, Stream EGM, Year 2025, Term II
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
  AND stream IN ('EGM', 'NA')
  AND year = 2025
ORDER BY CAST(student_index AS INTEGER);

-- Count students
SELECT COUNT(*) as total_students
FROM students 
WHERE level = 'FORM VI' 
  AND stream IN ('EGM', 'NA')
  AND year = 2025;

-- ============================================================================
-- 2. TABIA & MWENENDO EVALUATIONS
-- ============================================================================
SELECT 
  student_index,
  criterion,
  evaluation,
  created_at,
  updated_at
FROM tabia_mwenendo 
WHERE level = 'FORM VI' 
  AND stream IN ('EGM', 'NA')
  AND year = 2025 
  AND term = 'Term II'
ORDER BY CAST(student_index AS INTEGER), criterion;

-- Count evaluations
SELECT COUNT(*) as total_evaluations
FROM tabia_mwenendo 
WHERE level = 'FORM VI' 
  AND stream IN ('EGM', 'NA')
  AND year = 2025 
  AND term = 'Term II';

-- ============================================================================
-- 3. SUMMARY STATISTICS
-- ============================================================================
-- Students with evaluations
SELECT 
  COUNT(DISTINCT student_index) as students_with_evaluations,
  COUNT(*) as total_evaluations
FROM tabia_mwenendo 
WHERE level = 'FORM VI' 
  AND stream IN ('EGM', 'NA')
  AND year = 2025 
  AND term = 'Term II';

-- Breakdown by criterion
SELECT 
  criterion,
  COUNT(*) as criterion_count,
  STRING_AGG(DISTINCT evaluation, ', ' ORDER BY evaluation) as grades_used
FROM tabia_mwenendo 
WHERE level = 'FORM VI' 
  AND stream IN ('EGM', 'NA')
  AND year = 2025 
  AND term = 'Term II'
GROUP BY criterion
ORDER BY criterion;

-- Breakdown by evaluation grade
SELECT 
  evaluation,
  COUNT(*) as count
FROM tabia_mwenendo 
WHERE level = 'FORM VI' 
  AND stream IN ('EGM', 'NA')
  AND year = 2025 
  AND term = 'Term II'
GROUP BY evaluation
ORDER BY evaluation;

-- ============================================================================
-- 4. COMPLETE EVALUATION GRID (Students × Criteria)
-- ============================================================================
SELECT 
  s.student_index,
  s.adm_no,
  s.first_name,
  s.middle_name,
  s.surname,
  tm.criterion,
  COALESCE(tm.evaluation, 'N/A') as evaluation
FROM students s
CROSS JOIN (
  SELECT '901' as criterion UNION SELECT '902' UNION SELECT '903' UNION SELECT '904' 
  UNION SELECT '905' UNION SELECT '906' UNION SELECT '907' UNION SELECT '908' 
  UNION SELECT '909' UNION SELECT '910' UNION SELECT '911'
) criteria
LEFT JOIN tabia_mwenendo tm ON 
  tm.student_index = s.student_index 
  AND tm.criterion = criteria.criterion
  AND tm.level = 'FORM VI'
  AND tm.stream IN ('EGM', 'NA')
  AND tm.year = 2025
  AND tm.term = 'Term II'
WHERE s.level = 'FORM VI' 
  AND s.stream IN ('EGM', 'NA')
  AND s.year = 2025
ORDER BY CAST(s.student_index AS INTEGER), criteria.criterion;

-- ============================================================================
-- 5. MISSING EVALUATIONS
-- ============================================================================
-- Find students missing evaluations
WITH all_combinations AS (
  SELECT 
    s.student_index,
    s.adm_no,
    s.first_name,
    s.middle_name,
    s.surname,
    c.criterion
  FROM students s
  CROSS JOIN (
    SELECT '901' as criterion UNION SELECT '902' UNION SELECT '903' UNION SELECT '904' 
    UNION SELECT '905' UNION SELECT '906' UNION SELECT '907' UNION SELECT '908' 
    UNION SELECT '909' UNION SELECT '910' UNION SELECT '911'
  ) c
  WHERE s.level = 'FORM VI' 
    AND s.stream IN ('EGM', 'NA')
    AND s.year = 2025
),
existing_evaluations AS (
  SELECT DISTINCT student_index, criterion
  FROM tabia_mwenendo
  WHERE level = 'FORM VI' 
    AND stream IN ('EGM', 'NA')
    AND year = 2025 
    AND term = 'Term II'
)
SELECT 
  ac.student_index,
  ac.adm_no,
  ac.first_name || ' ' || COALESCE(ac.middle_name || ' ', '') || ac.surname as student_name,
  ac.criterion
FROM all_combinations ac
LEFT JOIN existing_evaluations ee ON 
  ac.student_index = ee.student_index 
  AND ac.criterion = ee.criterion
WHERE ee.student_index IS NULL
ORDER BY CAST(ac.student_index AS INTEGER), ac.criterion;

-- ============================================================================
-- 6. STREAM NORMALIZATION CHECK
-- ============================================================================
-- Check students by stream
SELECT stream, COUNT(*) as count
FROM students
WHERE level = 'FORM VI' AND year = 2025
GROUP BY stream
ORDER BY stream;

-- Check evaluations by stream
SELECT stream, COUNT(*) as count
FROM tabia_mwenendo
WHERE level = 'FORM VI' AND year = 2025 AND term = 'Term II'
GROUP BY stream
ORDER BY stream;
