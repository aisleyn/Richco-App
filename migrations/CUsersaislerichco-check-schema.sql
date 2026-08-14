-- Check time_entries columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'time_entries' 
ORDER BY ordinal_position;
