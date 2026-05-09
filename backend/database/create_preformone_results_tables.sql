-- Create tables for Pre-Form One results

-- Interview scores table
CREATE TABLE IF NOT EXISTS preform_one_interview_scores (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES preform_one_students(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES preformone_interview_subjects(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL CHECK (score >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Continuing scores table
CREATE TABLE IF NOT EXISTS preform_one_continuing_scores (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES preform_one_students(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES preformone_continuing_subjects(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL CHECK (score >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Interview results table
CREATE TABLE IF NOT EXISTS preform_one_interview_results (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES preform_one_students(id) ON DELETE CASCADE,
    admission_number VARCHAR(50) NOT NULL,
    total_marks DECIMAL(8,2) NOT NULL DEFAULT 0,
    average DECIMAL(5,2) NOT NULL DEFAULT 0,
    grade VARCHAR(1) NOT NULL CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
    position INTEGER NOT NULL DEFAULT 0,
    remarks TEXT,
    year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, year)
);

-- Continuing results table
CREATE TABLE IF NOT EXISTS preform_one_continuing_results (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES preform_one_students(id) ON DELETE CASCADE,
    admission_number VARCHAR(50) NOT NULL,
    total_marks DECIMAL(8,2) NOT NULL DEFAULT 0,
    average DECIMAL(5,2) NOT NULL DEFAULT 0,
    grade VARCHAR(1) NOT NULL CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
    position INTEGER NOT NULL DEFAULT 0,
    remarks TEXT,
    year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, year)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_preform_one_interview_scores_student ON preform_one_interview_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_preform_one_interview_scores_subject ON preform_one_interview_scores(subject_id);
CREATE INDEX IF NOT EXISTS idx_preform_one_interview_scores_student_subject ON preform_one_interview_scores(student_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_preform_one_continuing_scores_student ON preform_one_continuing_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_preform_one_continuing_scores_subject ON preform_one_continuing_scores(subject_id);
CREATE INDEX IF NOT EXISTS idx_preform_one_continuing_scores_student_subject ON preform_one_continuing_scores(student_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_preform_one_interview_results_student ON preform_one_interview_results(student_id);
CREATE INDEX IF NOT EXISTS idx_preform_one_interview_results_year ON preform_one_interview_results(year);
CREATE INDEX IF NOT EXISTS idx_preform_one_interview_results_student_year ON preform_one_interview_results(student_id, year);
CREATE INDEX IF NOT EXISTS idx_preform_one_interview_results_position ON preform_one_interview_results(position);

CREATE INDEX IF NOT EXISTS idx_preform_one_continuing_results_student ON preform_one_continuing_results(student_id);
CREATE INDEX IF NOT EXISTS idx_preform_one_continuing_results_year ON preform_one_continuing_results(year);
CREATE INDEX IF NOT EXISTS idx_preform_one_continuing_results_student_year ON preform_one_continuing_results(student_id, year);
CREATE INDEX IF NOT EXISTS idx_preform_one_continuing_results_position ON preform_one_continuing_results(position);

-- Create trigger to update updated_at timestamp for interview scores
CREATE TRIGGER update_preform_one_interview_scores_updated_at 
    BEFORE UPDATE ON preform_one_interview_scores 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update updated_at timestamp for continuing scores
CREATE TRIGGER update_preform_one_continuing_scores_updated_at 
    BEFORE UPDATE ON preform_one_continuing_scores 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update updated_at timestamp for interview results
CREATE TRIGGER update_preform_one_interview_results_updated_at 
    BEFORE UPDATE ON preform_one_interview_results 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update updated_at timestamp for continuing results
CREATE TRIGGER update_preform_one_continuing_results_updated_at 
    BEFORE UPDATE ON preform_one_continuing_results 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
