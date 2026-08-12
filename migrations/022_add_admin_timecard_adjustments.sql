-- Add admin timecard adjustment columns
ALTER TABLE time_entries
ADD COLUMN adjusted_hours NUMERIC(10,2),
ADD COLUMN adjusted_by_admin BOOLEAN DEFAULT false,
ADD COLUMN admin_adjustment_note TEXT,
ADD COLUMN adjusted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN adjusted_by_user_id BIGINT;

-- Add comment
COMMENT ON COLUMN time_entries.adjusted_hours IS 'Hours adjusted by admin (if null, use regular_hours)';
COMMENT ON COLUMN time_entries.adjusted_by_admin IS 'Whether this timecard was adjusted by an admin';
COMMENT ON COLUMN time_entries.admin_adjustment_note IS 'Reason for adjustment by admin';
COMMENT ON COLUMN time_entries.adjusted_at IS 'When adjustment was made';
COMMENT ON COLUMN time_entries.adjusted_by_user_id IS 'Which admin made the adjustment';

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_time_entries_adjusted_by_admin ON time_entries(adjusted_by_admin);
CREATE INDEX IF NOT EXISTS idx_time_entries_adjusted_at ON time_entries(adjusted_at);
