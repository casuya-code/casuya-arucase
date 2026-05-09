-- Create table for promotion activities tracking
CREATE TABLE IF NOT EXISTS promotion_activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    source_year INTEGER NOT NULL,
    target_year INTEGER NOT NULL,
    promoted_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_promotion_activities_user_id ON promotion_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_promotion_activities_source_year ON promotion_activities(source_year);
CREATE INDEX IF NOT EXISTS idx_promotion_activities_created_at ON promotion_activities(created_at);

-- Create trigger to update created_at timestamp
CREATE TRIGGER update_promotion_activities_created_at 
    BEFORE UPDATE ON promotion_activities 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
